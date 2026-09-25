import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.js";
import { CATEGORIES } from "../../src/shared/contracts.js";
async function start(page: Page, category: string = "condo") {
  await page.goto("/lili/reception");
  await page.locator('[data-locale="en"]').click();
  await page.locator(`[data-category="${category}"]`).first().click();
  await expect(page.getByTestId("request-state")).toHaveAttribute(
    "data-state",
    "draft",
  );
  await page
    .locator(`input[name="detail-preset"][value="${category}-01"]`)
    .check();
  await page.getByTestId("save-details").click();
  await expect(page.getByTestId("request-state")).toHaveAttribute(
    "data-state",
    "details_captured",
  );
  await page
    .locator('input[name="contact-fixture"][value="mock-contact-01"]')
    .check();
  await page.getByTestId("save-contact").click();
  await page.getByTestId("notice-acknowledge").click();
  await expect(page.getByTestId("request-state")).toHaveAttribute(
    "data-state",
    "consent_pending",
  );
}
async function accept(page: Page) {
  await page.getByTestId("consent-accept").click();
  await expect(page.getByTestId("request-state")).toHaveAttribute(
    "data-state",
    "consented",
  );
}
for (const category of CATEGORIES) {
  test(`${category}: minimum synthetic details → consent → pending → human handoff`, async ({
    page,
  }) => {
    await start(page, category);
    await expect(page.getByTestId("consent-accept")).toBeVisible();
    await expect(page.getByTestId("consent-decline")).toBeVisible();
    await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(0);
    await expect(page.getByText(/REVIEW_REQUIRED/).first()).toBeVisible();
    await accept(page);
    await page.getByTestId("review-link").click();
    await page.getByTestId("review-submit").click();
    await expect(page.getByTestId("request-state")).toHaveAttribute(
      "data-state",
      "review_pending",
    );
    await page.getByTestId("handoff-submit").click();
    await expect(page.getByTestId("request-state")).toHaveAttribute(
      "data-state",
      "human_handoff_pending",
    );
    await page.reload();
    await expect(page.getByTestId("request-state")).toHaveAttribute(
      "data-state",
      "human_handoff_pending",
    );
  });
}
test("decline retains draft, clears saved images and prevents review", async ({
  page,
}) => {
  await start(page);
  await accept(page);
  await page.locator('[data-image-preview="mock-image-01"]').click();
  await page.locator('[data-image-save="mock-image-01"]').click();
  await expect(
    page.locator('[data-saved-image="mock-image-01"]'),
  ).toBeVisible();
  await page.getByTestId("consent-decline").click();
  await expect(page.getByTestId("request-state")).toHaveAttribute(
    "data-state",
    "consent_pending",
  );
  await expect(page.locator("[data-saved-image]")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-saved-image]")).toHaveCount(0);
  await page.goto("/intake/review");
  await expect(page.getByTestId("review-submit")).toHaveCount(0);
});
test("one to four saved synthetic images survive refresh and reopen", async ({
  page,
  context,
}) => {
  await start(page);
  await accept(page);
  for (const suffix of ["01", "02", "03", "04"]) {
    await page.locator(`[data-image-preview="mock-image-${suffix}"]`).click();
    await page.locator(`[data-image-save="mock-image-${suffix}"]`).click();
    await expect(
      page.locator(`[data-saved-image="mock-image-${suffix}"]`),
    ).toBeVisible();
  }
  await expect(page.locator("[data-saved-image]")).toHaveCount(4);
  await page.reload();
  await expect(page.locator("[data-saved-image]")).toHaveCount(4);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/intake/consent");
  await expect(reopened.locator("[data-saved-image]")).toHaveCount(4);
});
test("lost save response retries the same operation without duplicate image", async ({
  page,
}) => {
  await start(page);
  await accept(page);
  let dropped = false;
  const keys: string[] = [];
  await page.route("**/api/prototype/requests/*/images", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    if (!dropped) {
      dropped = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.locator('[data-image-preview="mock-image-01"]').click();
  await page.locator('[data-image-save="mock-image-01"]').click();
  await expect(page.getByTestId("retry-operation")).toBeVisible();
  await page.getByTestId("retry-operation").click();
  await expect(page.locator("[data-saved-image]")).toHaveCount(1);
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe("");
  expect(keys[0]).toBe(keys[1]);
});
test("narrow viewport and 200% text keep consent reachable by keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await start(page);
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      "font-size",
      "200%",
      "important",
    ),
  );
  expect(
    await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    ),
  ).toBeGreaterThanOrEqual(32);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
  await expect(page.getByTestId("consent-accept")).toBeEnabled();
  await expect(page.getByTestId("consent-decline")).toBeEnabled();
  for (let i = 0; i < 50; i++) {
    if (
      await page
        .getByTestId("consent-accept")
        .evaluate((el) => el === document.activeElement)
    )
      break;
    await page.keyboard.press("Tab");
  }
  await expect(page.getByTestId("consent-accept")).toBeFocused();
  await page.screenshot({
    path: "output/playwright/consent-320-text-200.png",
    fullPage: true,
  });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("request-state")).toHaveAttribute(
    "data-state",
    "consented",
  );
});
test("English preference persists without locale routes, welcome remains usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/welcome");
  await page.locator('[data-locale="en"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(new URL(page.url()).pathname).toBe("/welcome");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: "output/playwright/welcome-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "output/playwright/welcome-desktop.png",
    fullPage: true,
  });
});

test("successful create followed by failed refresh retries read without a second draft", async ({
  page,
}) => {
  await page.goto("/lili/reception");
  await page.locator('[data-locale="en"]').click();
  let failedRead = false;
  await page.route("**/api/prototype/requests/*", async (route) => {
    if (!failedRead && route.request().method() === "GET") {
      failedRead = true;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.locator('[data-category="hotel"]').first().click();
  await expect(page.getByTestId("retry-operation")).toBeVisible();
  await page.getByTestId("retry-operation").click();
  await expect(page.getByTestId("request-state")).toHaveAttribute(
    "data-state",
    "draft",
  );
  const response = await page.request.get("/api/prototype/bootstrap");
  expect((await response.json()).data.request_ids).toHaveLength(1);
});
