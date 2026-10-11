import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  type SchemaObject,
} from '@nestjs/swagger';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import { z } from 'zod';

export type ApiErrorStatus =
  400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503 | 416;

const errorDescriptions: Record<ApiErrorStatus, string> = {
  400: 'The request could not be processed.',
  401: 'Authentication or a required page unlock is missing.',
  403: 'The current user is not allowed to perform this operation.',
  404: 'The requested resource is unavailable.',
  409: 'The operation conflicts with the current resource state.',
  413: 'The request body is too large.',
  416: 'The requested media range is not satisfiable.',
  422: 'The request did not match the input schema or a domain constraint.',
  429: 'The request limit has been reached.',
  500: 'An unexpected server error occurred.',
  503: 'A required service is temporarily unavailable.',
};

export interface ApiZodQueryOptions {
  /** Explicit HTTP wire schemas for coercing Zod fields, which accept unknown input. */
  wireSchemas?: Readonly<Record<string, SchemaObject>>;
}

type OpenApiSchemaWithDefinitions = SchemaObject & {
  definitions?: Record<string, SchemaObject>;
};

const generatedDefinitionPrefix = '__schema';
const openApiSchemaComponents = new Map<string, SchemaObject>();

function singleLocalDefinitionReference(
  schema: SchemaObject,
  definitionNames: ReadonlySet<string>,
): string | undefined {
  const allOf = (schema as SchemaObject & { allOf?: SchemaObject[] }).allOf;
  if (!allOf || allOf.length !== 1) {
    return undefined;
  }

  const referenceSchema = allOf[0];
  const reference =
    referenceSchema && '$ref' in referenceSchema
      ? referenceSchema.$ref
      : undefined;
  const prefix = '#/definitions/';
  if (
    typeof reference !== 'string' ||
    !reference.startsWith(prefix) ||
    !definitionNames.has(reference.slice(prefix.length))
  ) {
    return undefined;
  }

  return reference.slice(prefix.length);
}

function rewriteDefinitionReferences(
  value: unknown,
  componentNames: ReadonlyMap<string, string>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      rewriteDefinitionReferences(item, componentNames),
    );
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (
        key === '$ref' &&
        typeof child === 'string' &&
        child.startsWith('#/definitions/')
      ) {
        const definitionName = child.slice('#/definitions/'.length);
        const componentName = componentNames.get(definitionName);
        if (!componentName) {
          throw new Error(
            `OpenAPI schema has an unregistered recursive definition: ${definitionName}`,
          );
        }
        return [key, `#/components/schemas/${componentName}`];
      }
      return [key, rewriteDefinitionReferences(child, componentNames)];
    }),
  );
}

function hasRootSchemaReference(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasRootSchemaReference);
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }

  return Object.entries(value).some(
    ([key, child]) =>
      (key === '$ref' && child === '#') || hasRootSchemaReference(child),
  );
}

function registerSchemaDefinitions(
  schema: OpenApiSchemaWithDefinitions,
): OpenApiSchemaWithDefinitions {
  if (hasRootSchemaReference(schema)) {
    throw new Error(
      'Recursive Zod OpenAPI definitions require stable metadata IDs',
    );
  }

  const definitions = schema.definitions;
  if (!definitions) {
    return schema;
  }

  const definitionNames = new Set(Object.keys(definitions));
  const componentNames = new Map<string, string>();
  const componentSources = new Map<string, SchemaObject>();

  for (const [componentName, definition] of Object.entries(definitions)) {
    if (componentName.startsWith(generatedDefinitionPrefix)) {
      continue;
    }

    const targetName = singleLocalDefinitionReference(
      definition,
      definitionNames,
    );
    const sourceName = targetName ?? componentName;
    const source = definitions[sourceName];
    if (!source) {
      throw new Error(
        `OpenAPI component ${componentName} references a missing Zod definition`,
      );
    }

    for (const name of [componentName, sourceName]) {
      const existingName = componentNames.get(name);
      if (existingName && existingName !== componentName) {
        throw new Error(
          `OpenAPI definition ${name} has conflicting component IDs`,
        );
      }
      componentNames.set(name, componentName);
    }
    componentSources.set(componentName, source);
  }

  const unresolvedDefinitions = [...definitionNames].filter(
    (name) => !componentNames.has(name),
  );
  if (unresolvedDefinitions.length > 0) {
    throw new Error(
      `Recursive Zod OpenAPI definitions require stable metadata IDs: ${unresolvedDefinitions.join(', ')}`,
    );
  }

  for (const [componentName, source] of componentSources) {
    const registered = rewriteDefinitionReferences(
      source,
      componentNames,
    ) as SchemaObject;
    const existing = openApiSchemaComponents.get(componentName);
    if (existing && JSON.stringify(existing) !== JSON.stringify(registered)) {
      throw new Error(`Conflicting OpenAPI component schema: ${componentName}`);
    }
    openApiSchemaComponents.set(componentName, registered);
  }

  const rewritten = rewriteDefinitionReferences(
    schema,
    componentNames,
  ) as OpenApiSchemaWithDefinitions;
  delete rewritten.definitions;
  return rewritten;
}

function toOpenApiSchema(
  schema: z.ZodType,
  io: 'input' | 'output',
): SchemaObject {
  const converted = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    reused: 'inline',
    cycles: 'ref',
    unrepresentable: 'throw',
  }) as OpenApiSchemaWithDefinitions;

  return registerSchemaDefinitions(converted);
}

/** Returns named Zod definitions promoted to reusable OpenAPI components. */
export function openApiSchemaComponentsForDocument(): Record<
  string,
  SchemaObject
> {
  return Object.fromEntries(openApiSchemaComponents);
}

function applyMethodDecorator(
  target: object,
  propertyKey: string | symbol,
  decorator: MethodDecorator,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
  if (!descriptor || typeof descriptor.value !== 'function') {
    throw new Error(
      `OpenAPI metadata requires a method: ${String(propertyKey)}`,
    );
  }
  decorator(target, propertyKey, descriptor);
}

/** Documents the same Zod schema passed to the route's existing body pipe. */
export function ApiZodBody(schema: z.ZodType): MethodDecorator {
  return (target, propertyKey) => {
    applyMethodDecorator(
      target,
      propertyKey,
      ApiBody({ schema: toOpenApiSchema(schema, 'input') }),
    );
  };
}

/** Documents query parameters from the same object schema used at the boundary. */
export function ApiZodQuery<T extends Record<string, z.ZodType>>(
  schema: z.ZodObject<T>,
  options: ApiZodQueryOptions = {},
): MethodDecorator {
  const decorators = Object.entries(schema.shape).map(([name, fieldSchema]) => {
    const wireSchema =
      options.wireSchemas?.[name] ??
      toOpenApiSchema(z.object({ [name]: fieldSchema }), 'input').properties?.[
        name
      ];
    if (!wireSchema || typeof wireSchema !== 'object') {
      throw new Error(`Missing OpenAPI query schema for ${name}`);
    }
    return ApiQuery({
      name,
      required: !fieldSchema.safeParse(undefined).success,
      schema: wireSchema as SchemaObject,
    });
  });

  return (target, propertyKey) => {
    for (const decorator of decorators) {
      applyMethodDecorator(target, propertyKey, decorator);
    }
  };
}

/** Documents the same Zod schema passed to the route's existing parameter pipe. */
export function ApiZodParams<T extends Record<string, z.ZodType>>(
  schema: z.ZodObject<T>,
): MethodDecorator {
  const decorators = Object.entries(schema.shape).map(([name, fieldSchema]) =>
    ApiParam({
      name,
      required: true,
      schema: toOpenApiSchema(z.object({ [name]: fieldSchema }), 'input')
        .properties?.[name] as SchemaObject,
    }),
  );

  return (target, propertyKey) => {
    for (const decorator of decorators) {
      applyMethodDecorator(target, propertyKey, decorator);
    }
  };
}

/** Adds an output schema without changing the route's response handling. */
export function ApiZodResponse(
  schema: z.ZodType,
  status = 200,
  description = 'Successful response',
): MethodDecorator {
  return ApiResponse({
    status,
    description,
    schema: toOpenApiSchema(schema, 'output'),
  });
}

/** Reuses the shared safe API error envelope for a documented HTTP status. */
export function ApiZodErrorResponse(
  status: ApiErrorStatus,
  description = errorDescriptions[status],
): MethodDecorator {
  return ApiResponse({
    status,
    description,
    schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
  });
}

/** Lists the shared safe error envelope for the route's applicable statuses. */
export function ApiZodErrorResponses(
  ...statuses: readonly ApiErrorStatus[]
): MethodDecorator {
  return applyDecorators(
    ...statuses.map((status) => ApiZodErrorResponse(status)),
  );
}

/** Adds an operation summary alongside the project's concise, reusable metadata helpers. */
export function ApiOperationSummary(summary: string): MethodDecorator {
  return ApiOperation({ summary });
}

/** Documents a streamed response as binary content instead of a JSON schema. */
export function ApiFileResponse(
  contentType: string | readonly string[],
  description: string,
  status = 200,
): MethodDecorator {
  return ApiResponse({
    status,
    description,
    content: Object.fromEntries(
      (typeof contentType === 'string' ? [contentType] : contentType).map(
        (mediaType) => [
          mediaType,
          { schema: { type: 'string', format: 'binary' } },
        ],
      ),
    ),
  });
}

/** Treats the development and production Better Auth cookies as alternatives. */
export function ApiBetterAuthSession(): ClassDecorator {
  return applyDecorators(
    ApiSecurity('betterAuthSession'),
    ApiSecurity('betterAuthSecureSession'),
  );
}

/** Documents visitor cookies as request data, not as account authentication. */
export function ApiVisitorCookie(
  description: string,
  required = false,
): MethodDecorator {
  return ApiHeader({ name: 'Cookie', description, required });
}

/** Describes the no-content success response for a route that returns void. */
export function ApiNoContentResponse(
  description = 'The operation completed successfully.',
): MethodDecorator {
  return ApiResponse({ status: 204, description });
}

export function apiErrorSchemaForDocument(): SchemaObject {
  return toOpenApiSchema(apiErrorEnvelopeSchema, 'output');
}
