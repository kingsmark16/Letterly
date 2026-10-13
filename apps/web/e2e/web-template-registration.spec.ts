import { expect, test } from "@playwright/test";
import { templateCatalogPageResponseSchema } from "@letterly/contracts/catalog";

const templates = [
  {
    key: "secret-letter",
    name: "Secret Letter",
    id: "22222222-2222-4222-8222-222222222222",
    sample: "A few things I never want to forget",
  },
  {
    key: "choose-your-heart",
    name: "Choose Your Heart",
    id: "44444444-4444-4444-8444-444444444444",
    sample: "Which little moment with us makes you smile every time?",
  },
];

test("legacy and full identity preview routes render their registered samples", async ({
  page,
  request,
}) => {
  for (const template of templates) {
    await page.goto(`/preview/${template.key}`);
    await expect(
      page.getByRole("heading", { name: template.name, exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(template.sample, { exact: true }).first(),
    ).toBeVisible();
    const start = `/create?templateVersionId=${template.id}`;
    const query = new URLSearchParams({
      category: "confession",
      version: "1",
      start,
    });
    await page.goto(`/preview/${template.key}?${query}`);
    await expect(
      page.getByRole("button", { name: /^Use this template/ }),
    ).toBeVisible();
    const html = await (
      await request.get(`/preview/${template.key}?${query}`)
    ).text();
    expect(html).toContain(template.sample);
  }
});

test("unknown and invalid explicit preview identities are unavailable", async ({
  page,
}) => {
  for (const path of [
    "unknown",
    "__proto__",
    "secret-letter?category=other&version=1",
    "secret-letter?category=confession&version=999",
    "secret-letter?version=",
    "secret-letter?version=1.5",
  ]) {
    await page.goto(`/preview/${path}`);
    await expect(
      page.getByRole("heading", {
        name: "We could not load this design preview.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Use this template/ }),
    ).toHaveCount(0);
    await expect(
      page.getByText("A few things I never want to forget", { exact: true }),
    ).toHaveCount(0);
  }
});

test("catalog links carry full identity and lazy dialog previews retain focus", async ({
  page,
}) => {
  await page.goto("/templates/confession");
  for (const template of templates) {
    const card = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: template.name, exact: true }),
    });
    const trigger = card.getByRole("link", { name: "Preview", exact: true });
    const href = await trigger.getAttribute("href");
    const url = new URL(href!, "http://127.0.0.1:3100");
    expect(url.searchParams.get("category")).toBe("confession");
    expect(url.searchParams.get("version")).toBe("1");
    await expect(page.getByText(template.sample, { exact: true })).toHaveCount(
      0,
    );
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(template.sample, { exact: true }).first(),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
});

test("AC-7 category template pages retain search across forward and backward navigation", async ({
  page,
}) => {
  await page.goto("/templates/confession?q=synthetic");

  const templateGrid = page.locator("[data-template-count]");
  await expect(templateGrid).toHaveAttribute("data-template-count", "20");
  await expect(
    page.getByRole("link", { name: "Previous designs" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Next designs" })).toBeVisible();

  const nextLink = page.getByRole("link", { name: "Next designs" });
  const nextHref = await nextLink.getAttribute("href");
  expect(nextHref).toContain("q=synthetic");
  expect(nextHref).toContain("direction=after");
  await nextLink.click();
  await expect(page).toHaveURL(/\/templates\/confession\?q=synthetic&cursor=/u);
  await expect(templateGrid).toHaveAttribute("data-template-count", "5");
  await expect(page.getByRole("link", { name: "Next designs" })).toHaveCount(0);

  const previousLink = page.getByRole("link", { name: "Previous designs" });
  const previousHref = await previousLink.getAttribute("href");
  expect(previousHref).toContain("q=synthetic");
  expect(previousHref).toContain("direction=before");
  await previousLink.click();
  await expect(page).toHaveURL(/\/templates\/confession\?q=synthetic&cursor=/u);
  await expect(templateGrid).toHaveAttribute("data-template-count", "20");
  await expect(page.getByRole("link", { name: "Next designs" })).toBeVisible();
});

test("AC-7, AC-9, and AC-10 global catalog remains bounded from first through final growth page", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/templates?q=synthetic");
  const templateGrid = page.locator("[data-template-count]");
  const measurements: Array<{
    page: string;
    items: number;
    jsonBytes: number;
    ids: string[];
  }> = [];

  async function measureCurrentPage(label: string) {
    await expect(templateGrid).toHaveAttribute("data-template-count", "20");
    const currentUrl = new URL(page.url());
    const apiParams = new URLSearchParams({ size: "20" });
    for (const key of ["q", "cursor", "direction"] as const) {
      const value = currentUrl.searchParams.get(key);
      if (value) apiParams.set(key, value);
    }
    const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:3002";
    const response = await request.get(
      new URL("/api/v1/catalog/templates?" + apiParams, apiOrigin).toString(),
    );
    expect(response.ok()).toBe(true);
    const body = await response.body();
    const result = templateCatalogPageResponseSchema.parse(
      JSON.parse(body.toString("utf8")) as unknown,
    );
    expect(result.items).toHaveLength(20);
    measurements.push({
      page: label,
      items: result.items.length,
      jsonBytes: body.byteLength,
      ids: result.items.map((item) => item.id),
    });
  }

  async function advanceToNextPage() {
    const nextLink = page.getByRole("link", { name: "Next designs" });
    const targetPath = await nextLink.getAttribute("href");
    expect(targetPath).toBeTruthy();
    await Promise.all([
      page.waitForURL((url) => url.pathname + url.search === targetPath),
      nextLink.click(),
    ]);
    await expect(templateGrid).toHaveAttribute("data-template-count", "20");
  }

  await expect(
    page.getByRole("link", { name: "Previous designs" }),
  ).toHaveCount(0);
  await measureCurrentPage("first");
  for (let step = 0; step < 2; step += 1) {
    await advanceToNextPage();
  }
  await expect(page).toHaveURL(/\/templates\?q=synthetic&cursor=/u);
  await expect(
    page.getByRole("link", { name: "Previous designs" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Next designs" })).toBeVisible();
  await measureCurrentPage("middle");

  for (let step = 0; step < 2; step += 1) {
    await advanceToNextPage();
  }
  await expect(page).toHaveURL(/\/templates\?q=synthetic&cursor=/u);
  await expect(page.getByRole("link", { name: "Next designs" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Previous designs" }),
  ).toBeVisible();
  await measureCurrentPage("final");

  const firstIds = new Set(measurements[0]?.ids ?? []);
  expect(measurements[1]?.ids.some((id) => firstIds.has(id))).toBe(false);
  expect(measurements[2]?.ids.some((id) => firstIds.has(id))).toBe(false);
  expect(
    measurements[2]?.ids.some((id) => measurements[1]?.ids.includes(id)),
  ).toBe(false);
  await testInfo.attach("catalog-growth-measurements.json", {
    body: Buffer.from(JSON.stringify(measurements, null, 2)),
    contentType: "application/json",
  });
});

test("public metadata uses the pinned registration and unsupported versions stay unavailable", async ({
  page,
}) => {
  await page.goto("/p/fixture-heart-disabled");
  await expect(page).toHaveTitle(/Choose Your Heart/);
  await expect(page.locator('meta[name="letterly-template"]')).toHaveAttribute(
    "content",
    "choose-your-heart",
  );
  await expect(
    page.getByRole("button", { name: "The happy moments", exact: true }),
  ).toBeVisible();
  await page.goto("/p/fixture-heart-unsupported");
  await expect(
    page.getByRole("heading", { name: "This letter is not available." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "The happy moments", exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveTitle(/Letter unavailable/);
});

test("public Secret Letter rendering preserves content and the locked boundary", async ({
  page,
  request,
}) => {
  await page.route("**/p/*/visit**", (route) =>
    route.fulfill({ json: { viewId: null } }),
  );
  await page.goto("/p/fixture-letter?opening=1");
  await expect(page).toHaveTitle(/A Secret Letter on Letterly/);
  await expect(
    page.getByText("Dear Fixture Reader,", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByText("These words belong to the published letter.", {
        exact: false,
      })
      .first(),
  ).toBeVisible();
  await page.goto("/p/fixture-letter-locked");
  await page
    .getByRole("button", { name: "Open your protected letter", exact: true })
    .click();
  await expect(
    page.getByText("This letter is protected.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Unlock letter", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-password-input]")).toBeFocused();
  await expect(
    page.getByText("These words belong to the published letter.", {
      exact: false,
    }),
  ).toHaveCount(0);
  const html = await (await request.get("/p/fixture-letter-locked")).text();
  expect(html).not.toContain("These words belong to the published letter.");
});

test("public YouTube preload recovers after the visitor chooses Play", async ({
  page,
}) => {
  let iframeApiRequests = 0;
  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    iframeApiRequests += 1;
    await route.abort();
  });

  await page.goto("/p/fixture-letter-youtube?opening=1");
  await expect(
    page.locator('[data-opened="true"][data-revealed="true"]'),
  ).toHaveCount(1);

  const player = page.getByRole("region", {
    name: "Audio player: Fixture YouTube song",
  });
  await expect(player).toBeVisible();
  await expect(
    player.getByRole("button", {
      name: "Play Fixture YouTube song on YouTube",
    }),
  ).toBeVisible();
  await expect.poll(() => iframeApiRequests).toBe(1);
  await expect(player.getByRole("alert")).toHaveText(
    "The YouTube player could not be loaded.",
  );

  await player
    .getByRole("button", { name: "Play Fixture YouTube song on YouTube" })
    .click();
  await expect.poll(() => iframeApiRequests).toBe(2);
  await expect(player.getByRole("alert")).toHaveText(
    "The YouTube player could not be loaded.",
  );
});

test("public Secret Letter paginates a measured message with working controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/p/fixture-letter-paginated?opening=1");

  const reader = page.locator("[data-message-reader]");
  await reader.scrollIntoViewIfNeeded();
  const pagination = page.getByRole("navigation", { name: "Message pages" });
  await expect(pagination).toBeVisible();
  const indicator = pagination.locator('span[aria-live="polite"]');
  const paginationHearts = indicator.locator('span[aria-hidden="true"]');
  await expect(paginationHearts).toHaveCount(2);
  await expect(paginationHearts).toHaveText(["♡", "♡"]);
  await expect(indicator).toContainText(/Page 1 of/u);
  const totalPages = Number(
    (await indicator.textContent())?.match(/Page 1 of (\d+)/u)?.[1],
  );
  expect(totalPages).toBeGreaterThan(1);

  const firstPage = await reader.locator("[data-message-full]").textContent();
  expect(firstPage).toContain("Memory 1 stays close");
  await pagination.getByRole("button", { name: "Next message page" }).click();
  await expect(indicator).toContainText("Page 2 of");
  await expect(
    pagination.getByRole("button", { name: "Previous message page" }),
  ).toBeEnabled();
  expect(await reader.locator("[data-message-full]").textContent()).not.toBe(
    firstPage,
  );
});

test("public Secret Letter gallery keeps lazy images and failed-image fallback", async ({
  page,
}) => {
  const gallerySlug = "fixture-letter-gallery";
  const unavailableImageId = "40000000-0000-4000-8000-000000000001";

  await page.route("**/p/*/visit**", (route) =>
    route.fulfill({ json: { viewId: null } }),
  );
  await page.route(`**/p/${gallerySlug}/media/${unavailableImageId}`, (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.route(
    `**/p/${gallerySlug}/media/40000000-0000-4000-8000-000000000002`,
    (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480"><rect width="720" height="480" fill="#f2e6dc"/></svg>',
      }),
  );

  await page.goto(`/p/${gallerySlug}?opening=1`);

  const gallery = page.getByRole("region", {
    name: /Every version of life is better with you in it/u,
  });
  const memoryList = gallery.getByRole("list", { name: "Letter memories" });
  await expect(gallery).toBeVisible();

  const availableMemory = memoryList.getByRole("img", {
    name: "Second saved memory",
  });
  await expect(availableMemory).toHaveAttribute("loading", "lazy");
  await availableMemory.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      availableMemory.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);

  await expect(memoryList.getByRole("status")).toContainText(
    "This image is unavailable right now.",
  );
});

test("public registry mismatch and unknown identity are unavailable while legacy identity stays compatible", async ({
  page,
}) => {
  for (const slug of ["fixture-letter-mismatched", "fixture-letter-unknown"]) {
    await page.goto(`/p/${slug}?opening=1`);
    await expect(
      page.getByRole("heading", { name: "This letter is not available." }),
    ).toBeVisible();
    await expect(page).toHaveTitle(/Letter unavailable/);
    await expect(
      page.getByText("These words belong to the published letter.", {
        exact: false,
      }),
    ).toHaveCount(0);
  }
  await page.goto("/p/fixture-letter-legacy?opening=1");
  await expect(page).toHaveTitle(/A Secret Letter on Letterly/);
  await expect(
    page.getByText("Dear Fixture Reader,", { exact: true }),
  ).toBeVisible();
});
