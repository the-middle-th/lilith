import { describe, expect, it } from "vitest";
import {
  ROUTES,
  TEMPLATE_IDS,
  resolveRoute,
  concretePath,
} from "../../src/shared/routes.js";
describe("approved 38-route / 8-template manifest", () => {
  it("has exact unique coverage with no unmapped routes", () => {
    expect(ROUTES).toHaveLength(38);
    expect(new Set(ROUTES.map((x) => x.route_id)).size).toBe(38);
    expect(ROUTES.map((x) => x.route_id)).toEqual(
      Array.from(
        { length: 38 },
        (_, i) => `R${String(i + 1).padStart(2, "0")}`,
      ),
    );
    expect(new Set(ROUTES.map((x) => x.route_path)).size).toBe(38);
    expect(TEMPLATE_IDS).toHaveLength(8);
    expect(
      TEMPLATE_IDS.map((t) => ROUTES.filter((r) => r.template_id === t).length),
    ).toEqual([4, 16, 2, 5, 3, 3, 3, 2]);
    expect(
      ROUTES.every(
        (r) =>
          TEMPLATE_IDS.includes(r.template_id) &&
          r.mock_data &&
          r.prototype_only &&
          r.supported_locales.join() === "th,en",
      ),
    ).toBe(true);
  });
  it("resolves every approved path, prioritizes static hotel search and fails closed", () => {
    for (const route of ROUTES)
      expect(resolveRoute(concretePath(route))).toEqual(route);
    expect(resolveRoute("/hotel/search")?.route_id).toBe("R15");
    for (const path of [
      "/missing",
      "/property/real-1",
      "/hotel/real-1",
      "/en/welcome",
      "/th/welcome",
      "/api/prototype/missing",
    ])
      expect(resolveRoute(path)).toBeNull();
  });
});
