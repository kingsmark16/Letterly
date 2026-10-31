import { expect, type Page } from "@playwright/test";
import { installOwnerEditorRoutes } from "./owner-editor";
import { pageId, session } from "../fixtures/owner-page";
import { adminReportId } from "../fixtures/admin-moderation";

interface PerformanceSurface {
  readonly name: string;
  readonly path: string;
  readonly prepare?: (page: Page) => Promise<void>;
  readonly exercise: (page: Page) => Promise<void>;
}

const landingReady = async (page: Page) => {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};

export const uiPerformanceSurfaces: readonly PerformanceSurface[] = [
  { name: "landing", path: "/", exercise: landingReady },
  ...(["empty", "error", "loading"] as const).map((state) => ({
    name: `landing-${state}`,
    path: `/?uiFixture=${state}`,
    exercise: async (page: Page) => {
      await landingReady(page);
      await expect(
        state === "loading"
          ? page.locator('main[aria-busy="true"]')
          : page
              .locator("#templates")
              .getByRole(state === "error" ? "alert" : "status"),
      ).toBeVisible();
    },
  })),
  {
    name: "legal-dialog",
    path: "/",
    exercise: async (page) => {
      await page
        .locator("[data-landing-root] > footer")
        .getByRole("link", { name: "Privacy", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    name: "catalog-preview-dialog",
    path: "/templates/confession",
    exercise: async (page) => {
      await page
        .getByRole("article")
        .filter({
          has: page.getByRole("heading", {
            name: "Secret Letter",
            exact: true,
          }),
        })
        .getByRole("link", { name: "Preview", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  ...(["sign-in"] as const).map((route) => ({
    name: route,
    path: `/${route}`,
    exercise: async (page: Page) => {
      await expect(
        page.getByRole("navigation", { name: "Footer navigation" }),
      ).toBeVisible();
    },
  })),
  ...(["secret-letter", "choose-your-heart"] as const).map((key) => ({
    name: `preview-${key}`,
    path: `/preview/${key}`,
    exercise: async (page: Page) => {
      await expect(
        page.getByRole("link", { name: /Return to categories/ }),
      ).toBeVisible();
    },
  })),
  {
    name: "dashboard",
    path: "/dashboard/pages",
    prepare: async (page) => {
      await page.route("**/api/auth/get-session**", (route) =>
        route.fulfill({ json: session }),
      );
      await page.route("**/api/v1/pages?*", (route) =>
        route.fulfill({ json: { items: [], nextCursor: null } }),
      );
    },
    exercise: async (page) => {
      await expect(
        page.getByRole("navigation", {
          name: "Workspace footer navigation",
        }),
      ).toBeVisible();
    },
  },
  ...(["overview", "content", "settings"] as const).map((section) => ({
    name: `owner-editor-${section}`,
    path: `/dashboard/pages/${pageId}/edit?section=${section}`,
    prepare: installOwnerEditorRoutes,
    exercise: async (page: Page) => {
      await expect(
        page.getByRole("navigation", { name: "Letter editor", exact: true }),
      ).toBeVisible();
      if (section === "content")
        await expect(page.getByLabel("Your message")).toBeVisible();
    },
  })),
  {
    name: "admin-reports",
    path: "/admin/moderation/reports",
    exercise: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Report queue" }),
      ).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "Page ID" }),
      ).toBeVisible();
    },
  },
  {
    name: "admin-confirmation",
    path: `/admin/moderation/reports?report=${adminReportId}`,
    exercise: async (page) => {
      await page
        .getByRole("button", { name: "Mark reviewed", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Review report" }),
      ).toBeVisible();
    },
  },
  {
    name: "admin-audit",
    path: "/admin/moderation/audit",
    exercise: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Audit history" }),
      ).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "Target ID" }),
      ).toBeVisible();
    },
  },
  {
    name: "public-secret-letter",
    path: "/p/fixture-letter",
    exercise: async (page) => {
      await page
        .getByRole("button", { name: "Open your letter", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Open your letter", exact: true }),
      ).not.toBeVisible();
    },
  },
  {
    name: "public-journey-response",
    path: "/p/fixture-heart",
    exercise: async (page) => {
      await page
        .getByRole("button", {
          name: "Continue to Questions",
          exact: true,
        })
        .click();
      for (const name of ["The happy moments", "Share the warm result"])
        await page.getByRole("button", { name, exact: true }).click();
      await expect(
        page.getByRole("heading", {
          name: "A heart full of warmth",
          exact: true,
        }),
      ).toBeVisible();
    },
  },
];
