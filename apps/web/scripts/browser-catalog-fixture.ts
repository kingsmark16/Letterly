import { createServer } from "node:http";
import { catalogCategories, catalogTemplates } from "../e2e/fixtures/catalog";
import { publicJourneyFixtures } from "../e2e/fixtures/public-journey";

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3002");
  const publicFixture = Object.entries(publicJourneyFixtures).find(
    ([slug]) => url.pathname === `/api/v1/public/pages/${slug}`,
  )?.[1];
  const payload =
    request.method !== "GET"
      ? undefined
      : url.pathname === "/api/v1/categories"
        ? catalogCategories
        : url.pathname === "/api/v1/templates"
          ? catalogTemplates.filter(
              (template) =>
                !url.searchParams.has("categoryKey") ||
                template.categoryKey === url.searchParams.get("categoryKey"),
            )
          : publicFixture
            ? publicFixture
            : url.pathname === "/health"
              ? { status: "ok" }
              : undefined;
  response.writeHead(payload === undefined ? 503 : 200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(
    JSON.stringify(payload ?? { error: "Unmocked fixture request" }),
  );
});

server.listen(3002, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close());
}
