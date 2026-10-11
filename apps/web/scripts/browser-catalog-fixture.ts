import { createServer } from "node:http";
import { createHash } from "node:crypto";
import {
  templateCatalogCursorPayloadSchema,
  templateCatalogLookupResponseSchema,
  templateCatalogOverviewResponseSchema,
  templateCatalogPageResponseSchema,
  type TemplateCatalogItem,
} from "@letterly/contracts/catalog";
import { catalogCategories, catalogTemplates } from "../e2e/fixtures/catalog";
import { publicLetterFixtures } from "../e2e/fixtures/public-letter";
import { publicJourneyFixtures } from "../e2e/fixtures/public-journey";

const syntheticCategory = {
  key: "fixture-growth",
  name: "Growth fixtures",
  description: "An isolated browser fixture category.",
  displayOrder: 2,
};
const fixtureCategories = [...catalogCategories, syntheticCategory];

const syntheticTemplates: TemplateCatalogItem[] = Array.from(
  { length: 100 },
  (_, index) => {
    const sequence = String(index + 1).padStart(12, "0");
    const versionOne = {
      id: `20000000-0000-4000-8000-${sequence}`,
      version: 1,
      capabilities: [],
      audioCapability: "hidden" as const,
    };
    const versions =
      (index + 1) % 10 === 0
        ? [
            versionOne,
            {
              id: `30000000-0000-4000-8000-${sequence}`,
              version: 2,
              capabilities: [],
              audioCapability: "hidden" as const,
            },
          ]
        : [versionOne];
    return {
      id: `10000000-0000-4000-8000-${sequence}`,
      categoryKey: index < 25 ? "confession" : syntheticCategory.key,
      key: `synthetic-${index + 1}`,
      name: `Synthetic design ${String(index + 1).padStart(2, "0")}`,
      description: "A browser pagination fixture.",
      displayOrder: index + 1,
      versions,
    };
  },
);

const catalogOverview = templateCatalogOverviewResponseSchema.parse({
  categories: catalogCategories.map((category) => ({
    ...category,
    templates: catalogTemplates
      .filter(
        (template) =>
          template.categoryKey === category.key && template.versions.length > 0,
      )
      .sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.id.localeCompare(right.id),
      )
      .slice(0, 4)
      .map((template) => ({
        id: template.id,
        categoryKey: template.categoryKey,
        key: template.key,
        name: template.name,
        description: template.description,
        displayOrder: template.displayOrder,
        currentVersion: template.versions.at(-1)!,
      })),
  })),
});

function catalogLookup(url: URL): { status: number; payload: unknown } {
  const key = url.searchParams.get("templateKey");
  const categoryKey = url.searchParams.get("categoryKey") ?? undefined;
  const rawVersion = url.searchParams.get("version");
  const version = rawVersion === null ? undefined : Number(rawVersion);
  if (
    !key ||
    (rawVersion !== null && (!Number.isInteger(version) || (version ?? 0) < 1))
  ) {
    return { status: 400, payload: { code: "BAD_REQUEST" } };
  }

  const matches = catalogTemplates.filter(
    (template) =>
      template.key === key &&
      (categoryKey === undefined || template.categoryKey === categoryKey),
  );
  const template = matches[0];
  if (matches.length !== 1 || !template) {
    return { status: 404, payload: { code: "NOT_FOUND" } };
  }

  const selectedVersion =
    version === undefined
      ? template.versions.at(-1)
      : template.versions.find((entry) => entry.version === version);
  if (!selectedVersion) {
    return { status: 404, payload: { code: "NOT_FOUND" } };
  }

  return {
    status: 200,
    payload: templateCatalogLookupResponseSchema.parse({
      id: template.id,
      categoryKey: template.categoryKey,
      key: template.key,
      name: template.name,
      description: template.description,
      displayOrder: template.displayOrder,
      selectedVersion,
    }),
  };
}

const identityFixtures = {
  "fixture-letter-mismatched": {
    ...publicLetterFixtures["fixture-letter"],
    template: {
      key: "secret-letter",
      version: 1,
      registryKey: "confession.choose-your-heart",
    },
  },
  "fixture-letter-unknown": {
    ...publicLetterFixtures["fixture-letter"],
    template: { key: "secret-letter", version: 1, registryKey: "unknown" },
  },
  "fixture-letter-legacy": {
    ...publicLetterFixtures["fixture-letter"],
    template: { key: "secret-letter", version: 1 },
  },
};

function catalogPage(url: URL): { status: number; payload: unknown } {
  const categoryKey = url.searchParams.get("categoryKey") ?? undefined;
  const query = url.searchParams.get("q")?.trim() || undefined;
  const rawSize = url.searchParams.get("size");
  const size = rawSize === null ? 20 : Number(rawSize);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const direction = url.searchParams.get("direction") ?? "after";

  if (
    !Number.isInteger(size) ||
    size < 1 ||
    size > 50 ||
    (query !== undefined && query.length > 120) ||
    (direction !== "after" && direction !== "before") ||
    (direction === "before" && !cursor)
  ) {
    return { status: 400, payload: { code: "BAD_REQUEST" } };
  }

  const filterFingerprint = createHash("sha256")
    .update(JSON.stringify([categoryKey ?? null, query ?? null]))
    .digest("hex");
  let position: { displayOrder: number; id: string } | undefined;

  if (cursor) {
    try {
      const parsed = templateCatalogCursorPayloadSchema.parse(
        JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
      );
      if (
        parsed.filterFingerprint !== filterFingerprint ||
        parsed.size !== size
      ) {
        throw new Error("Cursor filters changed");
      }
      position = { displayOrder: parsed.displayOrder, id: parsed.id };
    } catch {
      return { status: 400, payload: { code: "BAD_REQUEST" } };
    }
  }

  const categoryNames = new Map(
    fixtureCategories.map((category) => [category.key, category.name]),
  );
  const sourceTemplates =
    query?.toLocaleLowerCase() === "synthetic"
      ? [...catalogTemplates, ...syntheticTemplates]
      : catalogTemplates;
  const eligible = sourceTemplates
    .filter((template) => template.versions.length > 0)
    .filter(
      (template) =>
        categoryKey === undefined || template.categoryKey === categoryKey,
    )
    .filter((template) =>
      query === undefined
        ? true
        : [
            template.name,
            template.description,
            categoryNames.get(template.categoryKey),
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase()),
    )
    .sort(
      (left, right) =>
        left.displayOrder - right.displayOrder ||
        left.id.localeCompare(right.id),
    );
  const compare = (
    template: TemplateCatalogItem,
    anchor: { displayOrder: number; id: string },
  ) =>
    template.displayOrder - anchor.displayOrder ||
    template.id.localeCompare(anchor.id);
  const candidates = position
    ? eligible.filter((template) =>
        direction === "after"
          ? compare(template, position) > 0
          : compare(template, position) < 0,
      )
    : eligible;
  const ordered =
    direction === "before" ? [...candidates].reverse() : candidates;
  const rows = ordered.slice(0, size + 1);
  const hasExtra = rows.length > size;
  const selected = rows.slice(0, size);
  if (direction === "before") selected.reverse();

  const encode = (template: TemplateCatalogItem) =>
    Buffer.from(
      JSON.stringify({
        version: 1,
        displayOrder: template.displayOrder,
        id: template.id,
        filterFingerprint,
        size,
      }),
      "utf8",
    ).toString("base64url");
  const first = selected[0];
  const last = selected.at(-1);
  const page = templateCatalogPageResponseSchema.parse({
    items: selected.map((template) => ({
      id: template.id,
      categoryKey: template.categoryKey,
      key: template.key,
      name: template.name,
      description: template.description,
      displayOrder: template.displayOrder,
      currentVersion: template.versions.at(-1),
    })),
    previousCursor: first
      ? direction === "after"
        ? cursor
          ? encode(first)
          : null
        : hasExtra
          ? encode(first)
          : null
      : null,
    nextCursor: last
      ? direction === "after"
        ? hasExtra
          ? encode(last)
          : null
        : cursor
          ? encode(last)
          : null
      : null,
  });

  return { status: 200, payload: page };
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3002");
  const publicFixture = Object.entries({
    ...publicJourneyFixtures,
    ...publicLetterFixtures,
    ...identityFixtures,
  }).find(([slug]) => url.pathname === `/api/v1/public/pages/${slug}`)?.[1];
  const result =
    request.method !== "GET"
      ? { status: 503, payload: undefined }
      : url.pathname === "/api/v1/categories"
        ? { status: 200, payload: fixtureCategories }
        : url.pathname === "/api/v1/catalog/overview"
          ? { status: 200, payload: catalogOverview }
          : url.pathname === "/api/v1/catalog/templates/lookup"
            ? catalogLookup(url)
            : url.pathname === "/api/v1/catalog/templates"
              ? catalogPage(url)
              : url.pathname === "/api/v1/templates"
                ? {
                    status: 200,
                    payload: catalogTemplates.filter(
                      (template) =>
                        !url.searchParams.has("categoryKey") ||
                        template.categoryKey ===
                          url.searchParams.get("categoryKey"),
                    ),
                  }
                : publicFixture
                  ? { status: 200, payload: publicFixture }
                  : url.pathname === "/health"
                    ? { status: 200, payload: { status: "ok" } }
                    : { status: 503, payload: undefined };
  response.writeHead(result.status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(
    JSON.stringify(result.payload ?? { error: "Unmocked fixture request" }),
  );
});

const fixturePort = new URL(process.env.API_ORIGIN ?? "http://127.0.0.1:3002")
  .port;
server.listen(Number(fixturePort || 3002), "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close());
}
