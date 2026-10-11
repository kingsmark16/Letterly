import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export async function mountSharedPrimitiveFixture(page: Page): Promise<void> {
  const markup = execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(new URL("../fixtures/shared-layout.tsx", import.meta.url)),
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: fileURLToPath(
          new URL("../../tsconfig.test.json", import.meta.url),
        ),
      },
    },
  );
  await page.goto("/");
  await page.evaluate((html) => {
    const host = document.createElement("div");
    host.id = "shared-layout-host";
    host.innerHTML = html;
    document.body.append(host);
  }, markup);
}
