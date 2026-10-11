import { z } from "zod";
import { templateAudioCapabilitySchema } from "@letterly/templates";

export const categoryCatalogItemSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  displayOrder: z.number().int().nonnegative(),
});

export const templateVersionCatalogItemSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  capabilities: z.array(z.string().min(1)),
  audioCapability: templateAudioCapabilitySchema,
});

export const templateCatalogItemSchema = z.object({
  id: z.string().uuid(),
  categoryKey: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  displayOrder: z.number().int().nonnegative(),
  versions: z.array(templateVersionCatalogItemSchema),
});

export const categoryCatalogQuerySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
});

export const templateListQuerySchema = z.object({
  categoryKey: z.string().optional(),
});

export const templateCatalogSummarySchema = z.object({
  id: z.string().uuid(),
  categoryKey: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  displayOrder: z.number().int().nonnegative(),
  currentVersion: templateVersionCatalogItemSchema,
});

export const templateCatalogPageQuerySchema = z
  .object({
    categoryKey: z.string().trim().min(1).optional(),
    q: z
      .string()
      .trim()
      .max(120)
      .transform((value) => value || undefined)
      .optional(),
    size: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z
      .string()
      .min(1)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    direction: z.enum(["after", "before"]).default("after"),
  })
  .superRefine((query, context) => {
    if (query.direction === "before" && !query.cursor) {
      context.addIssue({
        code: "custom",
        message: "A cursor is required for before navigation",
        path: ["cursor"],
      });
    }
  });

export const templateCatalogCursorPayloadSchema = z
  .object({
    version: z.literal(1),
    displayOrder: z.number().int().nonnegative(),
    id: z.string().uuid(),
    filterFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    size: z.number().int().min(1).max(50),
  })
  .strict();

export const templateCatalogPageResponseSchema = z.object({
  items: z.array(templateCatalogSummarySchema).max(50),
  nextCursor: z.string().max(512).nullable(),
  previousCursor: z.string().max(512).nullable(),
});

export const templateCatalogLookupQuerySchema = z.object({
  templateKey: z.string().trim().min(1).max(120),
  categoryKey: z.string().trim().min(1).max(120).optional(),
  version: z.coerce.number().int().min(1).max(2_147_483_647).optional(),
});

export const templateCatalogLookupResponseSchema = templateCatalogSummarySchema
  .omit({ currentVersion: true })
  .extend({ selectedVersion: templateVersionCatalogItemSchema });

export const MAX_CATALOG_PREVIEW_SIZE = 4;

export const templateCatalogOverviewCategorySchema = categoryCatalogItemSchema
  .extend({
    templates: z
      .array(templateCatalogSummarySchema)
      .max(MAX_CATALOG_PREVIEW_SIZE),
  })
  .superRefine((category, context) => {
    category.templates.forEach((template, index) => {
      if (template.categoryKey !== category.key) {
        context.addIssue({
          code: "custom",
          message: "Template preview must match its category",
          path: ["templates", index, "categoryKey"],
        });
      }
    });
  });

export const templateCatalogOverviewResponseSchema = z.object({
  categories: z.array(templateCatalogOverviewCategorySchema),
});

export const categoryCatalogResponseSchema = z.array(categoryCatalogItemSchema);

export const templateCatalogResponseSchema = z.array(templateCatalogItemSchema);

export type CategoryCatalogItem = z.infer<typeof categoryCatalogItemSchema>;

export type TemplateCatalogItem = z.infer<typeof templateCatalogItemSchema>;

export type TemplateCatalogSummary = z.infer<
  typeof templateCatalogSummarySchema
>;

export type TemplateCatalogPageQuery = z.infer<
  typeof templateCatalogPageQuerySchema
>;

export type TemplateCatalogPage = z.infer<
  typeof templateCatalogPageResponseSchema
>;

export type TemplateCatalogLookupQuery = z.infer<
  typeof templateCatalogLookupQuerySchema
>;

export type TemplateCatalogLookup = z.infer<
  typeof templateCatalogLookupResponseSchema
>;

export type TemplateCatalogOverviewCategory = z.infer<
  typeof templateCatalogOverviewCategorySchema
>;

export type TemplateCatalogOverview = z.infer<
  typeof templateCatalogOverviewResponseSchema
>;
