import { test, expect } from "./fixtures.js";
import { ROUTES, concretePath } from "../../src/shared/routes.js";
test("all 38 paths render exactly eight template families", async ({
  page,
}) => {
  const ids = new Set<string>();
  const templates = new Set<string>();
  for (const route of ROUTES) {
    await page.goto(concretePath(route));
    const surface = page.locator(`[data-route-id="${route.route_id}"]`);
    await expect(surface).toBeVisible();
    await expect(surface.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(surface).toHaveAttribute(
      "data-template-id",
      route.template_id,
    );
    ids.add(route.route_id);
    templates.add(route.template_id);
  }
  expect(ids.size).toBe(38);
  expect(templates.size).toBe(8);
  const registry = await page.evaluate(
    "import('/client/main.js').then(m=>({keys:Object.keys(m.TEMPLATE_REGISTRY).sort(),unique:new Set(Object.values(m.TEMPLATE_REGISTRY)).size}))",
  );
  expect(registry).toEqual({
    keys: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"],
    unique: 8,
  });
});
test("unknown route and noncatalog detail fail safely without creating drafts", async ({
  page,
  request,
}) => {
  await page.goto("/welcome");
  for (const path of [
    "/route-does-not-exist",
    "/hotel/unverified-id",
    "/property/unverified-id",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.locator("main")).toHaveAttribute(
      "data-route-id",
      "unknown",
    );
    await expect(page.locator("main")).toHaveAttribute("data-template-id", "");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  const bootstrap = await page.request.get("/api/prototype/bootstrap");
  expect((await bootstrap.json()).data.request_ids).toEqual([]);
  for (const path of [
    "/server/store.js",
    "/dist/server/main.js",
    "/.local/concierge-prototype/store.json",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
});
