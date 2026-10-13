import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, mock, test } from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ownerPageProjectionSchema,
  type OwnerPageProjection,
  type PublicSecretLetterProjection,
} from "@letterly/contracts/pages";
import * as registrationModule from "../../templates/registration";
import { createWebTemplateImplementationRegistry } from "../../templates/implementation-registry";
import { pageKeys } from "./api/query-keys";
import { PublicPageUnavailableError } from "../../lib/public-page-projection";

const entries = [1, 2].map((version) => ({
  id: `fixture.secret-letter.v${version}`,
  templateKey: "secret-letter",
  categoryKey: "fixture",
  version,
  name: `Retained design v${version}`,
  status: version === 1 ? "INACTIVE" : "ACTIVE",
  capabilities: [],
  previewDescription: `Preview description v${version}`,
  previewLabel: `Preview v${version}`,
  thumbnailAppearance: "letter",
  publicTitle: `Public title v${version}`,
  publicDescription: `Public description v${version}`,
  metadataTag: undefined,
}));
type Surface = "Editor" | "Public" | "Preview";
let surface: Surface = "Editor";
const constructedSurfaces: Surface[] = [];
const renderedVersions: Array<{ surface: Surface; version: number }> = [];
interface FixtureProps {
  pageQuery?: { data: OwnerPageProjection };
  page?: PublicSecretLetterProjection;
}
function fixtureBindings(selectedSurface: Surface) {
  return Object.fromEntries(
    entries.map(({ id, version }) => [
      id,
      {
        registryKey: id,
        version,
        implementation(props: FixtureProps = {}) {
          renderedVersions.push({ surface: selectedSurface, version });
          const message =
            props.pageQuery?.data.content.mainMessage ??
            (props.page && "mainMessage" in props.page
              ? props.page.mainMessage
              : "Sample message");
          return createElement(
            "section",
            {
              "aria-label": `${selectedSurface} v${version}`,
              "data-template-version-id":
                props.pageQuery?.data.template.templateVersionId,
            },
            message,
          );
        },
      },
    ]),
  );
}
function replaceModule(
  specifier: string | URL,
  exports: Record<string, unknown>,
) {
  const options = { cache: false, exports };
  mock.module(specifier, options);
}
function replaceLocal(path: string, exports: Record<string, unknown>) {
  replaceModule(new URL(path, import.meta.url), exports);
}
const styles = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".module.css"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default {};",
      };
    return nextLoad(url, context);
  },
});
after(() => {
  styles.deregister();
  mock.restoreAll();
});

replaceLocal("../../templates/registration.ts", {
  ...registrationModule,
  webTemplateRegistrations: entries,
  getWebTemplate: (identity: registrationModule.WebTemplateIdentity) =>
    registrationModule.resolveWebTemplate(identity, entries),
  hasWebTemplateFamily: (key: string) =>
    registrationModule.hasWebTemplateFamily(key, entries),
  getPublicWebTemplate: (
    identity: Parameters<typeof registrationModule.getPublicWebTemplate>[0],
  ) =>
    registrationModule.resolveWebTemplate(
      {
        templateKey: identity.key,
        version: identity.version,
        ...("registryKey" in identity
          ? { registryKey: identity.registryKey }
          : {}),
      },
      entries,
    ),
});
replaceLocal("../../templates/implementation-registry.ts", {
  createWebTemplateImplementationRegistry() {
    constructedSurfaces.push(surface);
    return createWebTemplateImplementationRegistry(
      entries,
      fixtureBindings(surface),
    );
  },
});
replaceModule("next/link", {
  default: (props: {
    children?: ReactNode;
    href: string;
    className?: string;
  }) => createElement("a", props),
});
replaceModule("@repo/ui/button", {
  Button: (props: { children?: ReactNode }) => createElement("button", props),
});
replaceModule("@repo/ui/status", {
  Status: ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children),
});
const readOwner = mock.fn(async (): Promise<OwnerPageProjection> => {
  throw new Error("Unexpected owner transport call");
});
replaceLocal("./api/lifecycle.ts", { getOwnerPage: readOwner });
replaceLocal("../../components/loading-state.tsx", {
  LoadingState: ({ title }: { title: string }) =>
    createElement("p", { role: "status" }, title),
});
replaceLocal("../../templates/secret-letter/renderer.tsx", {
  SecretLetterRenderer: () => null,
});
for (const [path, name] of [
  ["./public/choose-your-heart-page.tsx", "ChooseYourHeartPage"],
  ["./public/visitor-response-form.tsx", "VisitorResponseForm"],
  ["./public/public-report-form.tsx", "PublicReportForm"],
  ["./public/public-visit-tracker.tsx", "PublicVisitTracker"],
] as const)
  replaceLocal(path, { [name]: () => null });
replaceLocal("../catalog/components/create-draft-button.tsx", {
  CreateDraftButton: () => createElement("button", null, "Use this template"),
});
let projection = publicPage(1);
replaceLocal("../../lib/public-page.ts", {
  getPublicPage: async () => projection,
  PublicPageUnavailableError,
});
replaceLocal("../../lib/server-config.ts", {
  getServerConfig: () => ({ PUBLIC_SUPPORT_CONTACT_URL: undefined }),
});
replaceLocal("./public/locked-letter.tsx", {
  LockedLetter: ({ recipientName }: { recipientName?: string }) =>
    createElement("section", { "aria-label": "Locked letter" }, recipientName),
});
replaceLocal("./dashboard/dashboard-shell.tsx", {
  WorkspaceFrame: ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children),
});
replaceModule("@repo/ui/link", {
  Link: (props: { children?: ReactNode; href: string; className?: string }) =>
    createElement("a", props),
});
const readCatalogItem = mock.fn(async () => undefined);
replaceLocal("../catalog/server/catalog.ts", {
  getCategories: async () => [],
  getTemplateCatalogItem: readCatalogItem,
});

const { DraftEditor } = await import("./editor/draft-editor");
surface = "Public";
const { renderPublicTemplate } = await import("./public/template-content");
surface = "Preview";
const { RegisteredTemplatePreview } =
  await import("../catalog/preview/registered-preview");
const { TemplatePreviewContent } =
  await import("../catalog/preview/template-preview-content");
const { default: PublicPageRoute, generateMetadata } =
  await import("../../app/p/[slug]/page");
const { default: TemplatePreviewRoute } =
  await import("../../app/preview/[templateKey]/page");

function owner(version: number) {
  return ownerPageProjectionSchema.parse({
    id:
      version === 1
        ? "11111111-1111-4111-8111-111111111111"
        : "55555555-5555-4555-8555-555555555555",
    slug: "savedletter",
    canonicalUrl: null,
    recipientLabel: "Recipient",
    status: "PUBLISHED",
    contentVersion: 0,
    content: {
      recipientName: "Recipient",
      mainMessage: "Saved <message> & words",
      sections: [],
    },
    settings: {
      theme: "romantic",
      fontStyle: "handwritten",
      autoPlayMusic: false,
      music: null,
    },
    template: {
      id: "22222222-2222-4222-8222-222222222222",
      key: "secret-letter",
      name: `Retained design v${version}`,
      templateVersionId:
        version === 1
          ? "33333333-3333-4333-8333-333333333333"
          : "44444444-4444-4444-8444-444444444444",
      registryKey: `fixture.secret-letter.v${version}`,
      version,
    },
    createdAt: "2026-10-03T00:00:00.000Z",
    updatedAt: "2026-10-03T00:00:00.000Z",
  });
}
function publicPage(version: number): PublicSecretLetterProjection {
  return {
    displaySlug: "savedletter",
    canonicalUrl: "https://letterly.test/p/savedletter",
    template: {
      key: "secret-letter",
      registryKey: `fixture.secret-letter.v${version}`,
      version,
    },
    recipientName: "Recipient",
    mainMessage: "Saved <message> & words",
    sections: [],
    images: [],
    response: { enabled: false },
  };
}
function renderOwner(page: OwnerPageProjection): string {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(pageKeys.detail(page.id), page);
  try {
    return renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(DraftEditor, { pageId: page.id }),
      ),
    );
  } finally {
    client.clear();
  }
}

test("all actual components construct their isolated version registries", () =>
  assert.deepEqual(constructedSurfaces, ["Editor", "Public", "Preview"]));
for (const version of [1, 2]) {
  test(`actual owner query component retains version ${version}`, () => {
    const page = owner(version);
    const html = renderOwner(page);
    assert.ok(html.includes(`aria-label="Editor v${version}"`));
    assert.ok(html.includes("Saved &lt;message&gt; &amp; words"));
    assert.ok(!html.includes(`Editor v${version === 1 ? 2 : 1}`));
    assert.ok(
      html.includes(
        `data-template-version-id="${page.template.templateVersionId}"`,
      ),
    );
    assert.equal(readOwner.mock.callCount(), 0);
  });
  test(`actual public presentation component retains version ${version}`, () => {
    const html = renderToStaticMarkup(
      renderPublicTemplate({
        page: publicPage(version),
        slug: "savedletter",
        skipOpening: false,
      }),
    );
    assert.ok(html.includes(`aria-label="Public v${version}"`));
    assert.ok(html.includes("Saved &lt;message&gt; &amp; words"));
  });
  test(`actual preview composition retains version ${version}`, () => {
    const html = renderToStaticMarkup(
      createElement(TemplatePreviewContent, {
        templateKey: "secret-letter",
        categoryKey: "fixture",
        version,
        capabilities: [],
        startHref: "/sign-in",
      }),
    );
    assert.ok(html.includes(`aria-label="Preview v${version}"`));
    assert.ok(html.includes("Sample message"));
    assert.ok(!html.includes(`Preview v${version === 1 ? 2 : 1}`));
  });
  test(`AC-6 actual public route and metadata retain pinned version ${version}`, async () => {
    projection = publicPage(version);
    const props = {
      params: Promise.resolve({ slug: "savedletter" }),
      searchParams: Promise.resolve({}),
    };
    const metadata = await generateMetadata(props);
    const html = renderToStaticMarkup(await PublicPageRoute(props));
    assert.equal(metadata.title, `Public title v${version}`);
    assert.equal(metadata.description, `Public description v${version}`);
    assert.deepEqual(metadata.alternates, {
      canonical: projection.canonicalUrl,
    });
    assert.ok(html.includes(`aria-label="Public v${version}"`));
    assert.ok(html.includes("Saved &lt;message&gt; &amp; words"));
  });
  test(`actual preview route selects version ${version} without catalog fallback`, async () => {
    const html = renderToStaticMarkup(
      await TemplatePreviewRoute({
        params: Promise.resolve({ templateKey: "secret-letter" }),
        searchParams: Promise.resolve({
          category: "fixture",
          version: String(version),
          start: "/sign-in",
        }),
      }),
    );
    assert.ok(html.includes(`Retained design v${version}`));
    assert.ok(html.includes(`aria-label="Preview v${version}"`));
    assert.equal(readCatalogItem.mock.callCount(), 0);
  });
  test(`AC-6 locked public route for version ${version} never dispatches a private body`, async () => {
    projection = { ...publicPage(version), state: "LOCKED" };
    renderedVersions.length = 0;
    const html = renderToStaticMarkup(
      await PublicPageRoute({
        params: Promise.resolve({ slug: "savedletter" }),
        searchParams: Promise.resolve({}),
      }),
    );
    assert.ok(html.includes('aria-label="Locked letter"'));
    assert.ok(!html.includes("Saved &lt;message&gt;"));
    assert.deepEqual(renderedVersions, []);
  });
}
test("actual owner component rejects a conflicting saved identity before displaying fixture content", () => {
  const page = owner(1);
  page.template.version = 2;
  const html = renderOwner(page);
  assert.ok(html.includes("This design version is unavailable."));
  assert.ok(!html.includes("Saved &lt;message&gt;"));
});
test("actual owner queries keep coexisting saved pages separate in one query client", () => {
  const pages = [owner(1), owner(2)];
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  for (const page of pages) client.setQueryData(pageKeys.detail(page.id), page);
  try {
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        pages.map((page) =>
          createElement(DraftEditor, { key: page.id, pageId: page.id }),
        ),
      ),
    );
    for (const page of pages) {
      assert.ok(html.includes(`aria-label="Editor v${page.template.version}"`));
      assert.ok(
        html.includes(
          `data-template-version-id="${page.template.templateVersionId}"`,
        ),
      );
      assert.equal(client.getQueryData(pageKeys.detail(page.id)), page);
    }
  } finally {
    client.clear();
  }
});
test("actual public and preview dispatch reject conflicting identities", () => {
  const page = publicPage(1);
  page.template.version = 2;
  assert.throws(
    () =>
      renderPublicTemplate({ page, slug: "savedletter", skipOpening: false }),
    PublicPageUnavailableError,
  );
  assert.throws(
    () =>
      renderToStaticMarkup(
        createElement(RegisteredTemplatePreview, {
          identity: {
            templateKey: "secret-letter",
            registryKey: "fixture.secret-letter.v1",
            version: 2,
          },
        }),
      ),
    /implementation unavailable/,
  );
});
test("actual preview route rejects ambiguous and conflicting known families without catalog fallback", async () => {
  for (const searchParams of [
    {},
    { version: "3" },
    { category: "other", version: "1" },
  ]) {
    const html = renderToStaticMarkup(
      await TemplatePreviewRoute({
        params: Promise.resolve({ templateKey: "secret-letter" }),
        searchParams: Promise.resolve(searchParams),
      }),
    );
    assert.ok(html.includes("We could not load this design preview."));
    assert.ok(!html.includes("Sample message"));
  }
  assert.equal(readCatalogItem.mock.callCount(), 0);
});
test("actual public route rejects a conflicting version and returns unavailable metadata", async () => {
  projection = publicPage(1);
  projection.template.version = 2;
  const props = {
    params: Promise.resolve({ slug: "savedletter" }),
    searchParams: Promise.resolve({}),
  };
  assert.equal(
    (await generateMetadata(props)).title,
    "Letter unavailable | Letterly",
  );
  const html = renderToStaticMarkup(await PublicPageRoute(props));
  assert.ok(html.includes("This letter is not available."));
  assert.ok(!html.includes("Saved &lt;message&gt;"));
});
