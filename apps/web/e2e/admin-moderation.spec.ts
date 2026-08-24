import { expect, test } from "@playwright/test";

test.describe("administrator moderation routes", () => {
  test("protects report and audit shells before hydrating the console", async ({
    page,
  }) => {
    for (const path of [
      "/admin/moderation/reports",
      "/admin/moderation/audit",
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", {
          name: "Administration is unavailable",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /Report queue|Audit history/u }),
      ).toHaveCount(0);
    }
  });
});
