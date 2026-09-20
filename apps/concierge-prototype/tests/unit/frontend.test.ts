import { describe, expect, it, vi } from "vitest";
import { PrototypeClient } from "../../src/client/api.js";
import {
  findDetailPreset,
  mayAdoptRequest,
  nextRequestPath,
} from "../../src/client/state.js";
import {
  REQUIRED_KEYS,
  resources,
  resolveLocale,
  validateLocaleResources,
} from "../../src/shared/locales.js";
import { ERROR_CODES, REQUEST_STATES } from "../../src/shared/contracts.js";
import type { RequestRecord } from "../../src/shared/contracts.js";
import {
  CONTACT_FIXTURES,
  DETAIL_PRESETS,
  IMAGE_FIXTURES,
} from "../../src/shared/catalog.js";
import { ROUTES } from "../../src/shared/routes.js";

const record = (
  revision: number,
  state: RequestRecord["state"] = "consented",
): RequestRecord => ({
  id: "mock-request-test",
  revision,
  category: "condo",
  details: DETAIL_PRESETS[0]?.details ?? null,
  contact_fixture_id: CONTACT_FIXTURES[0].id,
  state,
  consent: {
    state: state === "consent_pending" ? "declined" : "accepted",
    version: "prototype-demo-v1",
    copy_status: "REVIEW_REQUIRED",
    recorded_at: "2030-01-01T00:00:00Z",
  },
  notice: { version: "prototype-no-guarantee-v1", acknowledged: true },
  image_ids: [],
  images: [],
  handoff: {
    operations_destination: null,
    status: "BLOCKED_OWNER_AUTHORIZATION",
    notification_sent: false,
  },
  mock_data: true,
  prototype_only: true,
});
const response = (data: unknown) =>
  new Response(
    JSON.stringify({ data, mock_data: true, prototype_only: true }),
    { status: 200 },
  );

describe("locale contract", () => {
  it("covers every route, API error, state and shipped fixture in both languages", () => {
    const contractKeys = [
      ...ROUTES.map((route) => `routes.${route.content_key}.title`),
      ...ERROR_CODES.map((code) => `error.${code}`),
      ...REQUEST_STATES.map((state) => `status.${state}`),
      ...CONTACT_FIXTURES.map((fixture) => fixture.display_key),
      ...DETAIL_PRESETS.map((fixture) => fixture.label_key),
      ...IMAGE_FIXTURES.map((fixture) => fixture.label_key),
    ];
    for (const key of contractKeys) {
      expect(REQUIRED_KEYS).toContain(key);
      expect(resources.en[key]?.trim()).toBeTruthy();
      expect(resources.th[key]?.trim()).toBeTruthy();
    }
    expect(() => validateLocaleResources()).not.toThrow();
  });
  it("uses a complete English page when one required Thai key is missing", () => {
    const bundles = { en: { ...resources.en }, th: { ...resources.th } };
    delete bundles.th["consent.body"];
    const resolved = resolveLocale("th", REQUIRED_KEYS, bundles);
    expect(resolved.locale).toBe("en");
    expect(resolved.fallback).toBe(true);
    expect(resolved.t("nav.explore")).toBe(resources.en["nav.explore"]);
    expect(resolved.t("consent.body")).toBe(resources.en["consent.body"]);
  });
  it("fails before rendering if even a rarely used English API error is missing", () => {
    const bundles = { en: { ...resources.en }, th: { ...resources.th } };
    delete bundles.en["error.IDEMPOTENCY_CONFLICT"];
    expect(() => validateLocaleResources(bundles)).toThrow(
      "error.IDEMPOTENCY_CONFLICT",
    );
    expect(() => resolveLocale("th", REQUIRED_KEYS, bundles)).toThrow();
  });
  it("defaults unknown locale to Thai and fails closed on an unregistered runtime key", () => {
    expect(resolveLocale("fr").locale).toBe("th");
    expect(() => resolveLocale("en").t("missing.runtime.copy")).toThrow(
      "Content unavailable",
    );
  });
});

describe("authoritative request display", () => {
  it("restores a catalog selection despite reordered JSON keys, including nested budget", () => {
    const restored = {
      move_timeframe: "mock-next-month",
      bedrooms: 1,
      budget: { currency: "THB" as const, max: 35000, min: 20000 },
      area_bts: "mock-bts-garden",
      intent: "rent" as const,
    };
    expect(findDetailPreset("condo", restored)?.id).toBe("condo-01");
    expect(findDetailPreset("hotel", restored)).toBeUndefined();
    expect(
      findDetailPreset("condo", {
        ...restored,
        budget: { ...restored.budget, max: 99999 },
      }),
    ).toBeUndefined();
    expect(findDetailPreset("condo", null)).toBeUndefined();
  });
  it("ignores older replay and invalidated callbacks after decline/edit", () => {
    const declined = record(8, "consent_pending");
    const accepted = record(7);
    expect(mayAdoptRequest(declined, accepted, 3, 3)).toBe(false);
    expect(mayAdoptRequest(declined, record(9), 4, 3)).toBe(false);
    expect(mayAdoptRequest(declined, record(9), 4, 4)).toBe(true);
    expect(mayAdoptRequest(null, accepted, 4, 3)).toBe(false);
  });
  it("restores the correct next step from persisted state", () => {
    expect(nextRequestPath(record(1, "review_pending"))).toBe(
      "/status/pending",
    );
    expect(nextRequestPath(record(2, "human_handoff_pending"))).toBe(
      "/status/handoff",
    );
    expect(nextRequestPath(record(3, "consent_pending"))).toBe(
      "/intake/consent",
    );
    expect(nextRequestPath({ ...record(4, "draft"), details: null })).toBe(
      "/lili/requirements",
    );
  });
});

describe("client retry lifecycle", () => {
  it("retains the exact idempotency key and payload after a lost response", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("lost response"))
      .mockResolvedValueOnce(response(record(2)));
    const client = new PrototypeClient(transport);
    client.csrf = "mock-csrf";
    await expect(
      client.write(
        "request-image-1",
        "POST",
        "/requests/mock-request-test/images",
        { revision: 1, image_fixture_id: "mock-image-01" },
      ),
    ).rejects.toThrow("lost response");
    await client.write(
      "request-image-1",
      "POST",
      "/requests/mock-request-test/images",
      { revision: 1, image_fixture_id: "mock-image-01" },
    );
    expect(transport.mock.calls[0]?.[1]).toEqual(transport.mock.calls[1]?.[1]);
    const payload = JSON.parse(String(transport.mock.calls[1]?.[1]?.body)) as {
      mock_data: unknown;
    };
    expect(payload.mock_data).toBe(true);
  });
  it("coalesces double clicks until the operation resolves", async () => {
    let complete: (value: Response) => void = () => undefined;
    const transport = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    const client = new PrototypeClient(transport);
    const first = client.write("draft", "POST", "/drafts", {
      category: "condo",
    });
    const second = client.write("draft", "POST", "/drafts", {
      category: "condo",
    });
    complete(response(record(1)));
    expect(await first).toEqual(await second);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("does not issue a second write if its successful response was followed by a failed refresh", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(record(1)))
      .mockRejectedValueOnce(new TypeError("refresh failed"))
      .mockResolvedValueOnce(response(record(1)));
    const client = new PrototypeClient(transport);
    await client.write("create-condo", "POST", "/drafts", {
      category: "condo",
    });
    await expect(client.get("/requests/mock-request-test")).rejects.toThrow(
      "refresh failed",
    );
    await client.write("create-condo", "POST", "/drafts", {
      category: "condo",
    });
    await client.get("/requests/mock-request-test");
    client.resolve("create-condo");
    expect(
      transport.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(1);
  });
  it("restores acknowledged writes after a client reload before its follow-up read", async () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
    };
    const firstFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response(record(1)));
    await new PrototypeClient(firstFetch, storage).write(
      "create-condo",
      "POST",
      "/drafts",
      { category: "condo" },
    );
    const secondFetch = vi.fn<typeof fetch>();
    const reloaded = new PrototypeClient(secondFetch, storage);
    expect(
      await reloaded.write("create-condo", "POST", "/drafts", {
        category: "condo",
      }),
    ).toEqual(record(1));
    expect(secondFetch).not.toHaveBeenCalled();
    reloaded.resolve("create-condo");
    expect(data.size).toBe(0);
  });
  it("clears an inaccessible old-session acknowledgement after authoritative 404", async () => {
    const denied = new Response(
      JSON.stringify({
        error: { code: "NOT_FOUND", message_key: "error.NOT_FOUND" },
        mock_data: true,
        prototype_only: true,
      }),
      { status: 404 },
    );
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(record(1)))
      .mockResolvedValueOnce(denied)
      .mockResolvedValueOnce(
        response({ ...record(1), id: "mock-request-new-session" }),
      );
    const client = new PrototypeClient(transport);
    await client.write("create-condo", "POST", "/drafts", {
      category: "condo",
    });
    await expect(
      client.confirm("create-condo", "/requests/mock-request-test"),
    ).rejects.toThrow("NOT_FOUND");
    const next = await client.write<RequestRecord>(
      "create-condo",
      "POST",
      "/drafts",
      { category: "condo" },
    );
    expect(next.id).toBe("mock-request-new-session");
    expect(
      transport.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(2);
  });
});
