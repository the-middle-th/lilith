import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { canonical, validate } from "../../src/server/validation.js";
import { validRecord, validSnapshot } from "../../src/server/snapshot.js";
import { CONSENT_VERSION, NOTICE_VERSION } from "../../src/shared/contracts.js";
import type { RequestRecord } from "../../src/shared/contracts.js";
import { DETAIL_PRESETS } from "../../src/shared/catalog.js";

function record(): RequestRecord {
  return {
    id: `mock-request-${randomUUID()}`,
    revision: 4,
    category: "condo",
    details: DETAIL_PRESETS[0]?.details ?? null,
    contact_fixture_id: "mock-contact-01",
    state: "consented",
    notice: { version: NOTICE_VERSION, acknowledged: true },
    consent: {
      state: "accepted",
      version: CONSENT_VERSION,
      recorded_at: "2030-01-01T00:00:00.000Z",
      copy_status: "REVIEW_REQUIRED",
    },
    image_ids: [],
    images: [],
    handoff: {
      operations_destination: null,
      status: "BLOCKED_OWNER_AUTHORIZATION",
      notification_sent: false,
    },
    mock_data: true,
    prototype_only: true,
  };
}
describe("persisted contract validation", () => {
  it("canonical fingerprints ignore object-key ordering and preserve revision and literal value distinctions", () => {
    expect(canonical({ details: { b: 2, a: 1 }, mock_data: true })).toBe(
      canonical({ mock_data: true, details: { a: 1, b: 2 } }),
    );
    expect(canonical({ revision: 1 })).not.toBe(canonical({ revision: 2 }));
    expect(canonical({ mock_data: true })).not.toBe(
      canonical({ mock_data: "true" }),
    );
  });
  it("validates historical response records and rejects corrupted extra fields or contradictory states", () => {
    const valid = record();
    expect(validRecord(valid)).toBe(true);
    expect(validRecord({ ...valid, secret: "never-return" })).toBe(false);
    expect(
      validRecord({
        ...valid,
        consent: {
          state: "unset",
          version: null,
          recorded_at: null,
          copy_status: "REVIEW_REQUIRED",
        },
      }),
    ).toBe(false);
    expect(
      validRecord({
        ...valid,
        consent: { ...valid.consent, state: ["accepted"] },
      }),
    ).toBe(false);
    expect(
      validRecord({ ...valid, notice: { acknowledged: false, version: null } }),
    ).toBe(false);
    expect(
      validRecord({
        ...valid,
        state: "review_pending",
        contact_fixture_id: null,
      }),
    ).toBe(false);
    expect(validRecord({ ...valid, state: "draft" })).toBe(false);
    expect(
      validRecord({
        ...valid,
        handoff: { ...valid.handoff, notification_sent: true },
      }),
    ).toBe(false);
    expect(
      validRecord({
        ...valid,
        images: [
          {
            id: `mock-image-attachment-${randomUUID()}`,
            image_fixture_id: "mock-image-01",
            mock_data: true,
          },
        ],
      }),
    ).toBe(false);
  });
  it("rejects corruption in snapshot ownership, session role/locale and replay DTOs", () => {
    const r = record();
    const sessionId = `mock-session-${randomUUID()}`;
    const session = {
      id: sessionId,
      expires: 1999999999999,
      csrf: "a".repeat(43),
      locale: "th",
      role: "guest",
      scopes: [],
    };
    const snapshot = {
      version: 1,
      sessions: { [sessionId]: session },
      requests: { [r.id]: { owner: sessionId, record: r } },
      ledger: {
        [`${sessionId}|POST|/api/prototype/drafts|key-0001`]: {
          fingerprint: "{}",
          response: { status: 201, data: r },
        },
      },
    };
    expect(validSnapshot(snapshot)).toBe(true);
    expect(
      validSnapshot({
        ...snapshot,
        requests: { [r.id]: { owner: "missing", record: r } },
      }),
    ).toBe(false);
    expect(
      validSnapshot({
        ...snapshot,
        sessions: { [sessionId]: { ...session, locale: ["th"] } },
      }),
    ).toBe(false);
    expect(
      validSnapshot({
        ...snapshot,
        sessions: { [sessionId]: { ...session, role: ["guest"] } },
      }),
    ).toBe(false);
    expect(
      validSnapshot({
        ...snapshot,
        ledger: {
          [`${sessionId}|POST|/api/prototype/drafts|key-0001`]: {
            fingerprint: "{}",
            response: { status: 201, data: { ...r, secret: "invalid" } },
          },
        },
      }),
    ).toBe(false);
  });
  it("only literal consent choices and approved fixture combinations pass payload validation", () => {
    for (const decision of [["accept"], ["decline"], 1, true, {}])
      expect(() =>
        validate("consent", {
          mock_data: true,
          revision: 1,
          decision,
          consent_version: CONSENT_VERSION,
        }),
      ).toThrow("INVALID_PAYLOAD");
    expect(() =>
      validate("consent", {
        mock_data: true,
        revision: 1,
        decision: "accept",
        consent_version: CONSENT_VERSION,
      }),
    ).not.toThrow();
    expect(() =>
      validate("edit", {
        mock_data: true,
        revision: 1,
        category: "condo",
        contact_fixture_id: null,
        details: { ...DETAIL_PRESETS[0]?.details, passport: "unapproved" },
      }),
    ).toThrow("INVALID_PAYLOAD");
  });
});

// Exercise the transaction queue itself: a valid HTTP session can expire while
// waiting for another durable commit and must not authorize a queued mutation.
it("rechecks session expiry inside the serialized mutation and denies expired replay", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { default: os } = await import("node:os");
  const { PrototypeStore } = await import("../../src/server/store.js");
  const { SessionAuth } = await import("../../src/server/auth.js");
  const { RequestService } = await import("../../src/server/service.js");
  const directory = await mkdtemp(path.join(os.tmpdir(), "lilith-queue-"));
  let now = 100000;
  let block = false;
  let signalStarted: () => void = () => undefined;
  let release: () => void = () => undefined;
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const store = await PrototypeStore.open(directory, {
    beforeCommit: async () => {
      if (block) {
        block = false;
        signalStarted();
        await released;
      }
    },
  });
  try {
    const auth = new SessionAuth(store, () => now);
    const session = await auth.create();
    const service = new RequestService(store, () => now);
    const body = { mock_data: true, category: "condo" };
    const firstKey = randomUUID();
    const saved = await service.mutate(
      session,
      "create",
      "POST",
      "/api/prototype/drafts",
      firstKey,
      body,
    );
    expect(saved.status).toBe(201);
    block = true;
    const holding = store.transact(() => undefined);
    await started;
    const queued = service.mutate(
      session,
      "create",
      "POST",
      "/api/prototype/drafts",
      randomUUID(),
      body,
    );
    const rejection = expect(queued).rejects.toThrow("UNAUTHORIZED");
    now = session.expires + 1;
    release();
    await holding;
    await rejection;
    await expect(
      service.mutate(
        session,
        "create",
        "POST",
        "/api/prototype/drafts",
        firstKey,
        body,
      ),
    ).rejects.toThrow("UNAUTHORIZED");
    expect(Object.keys(store.read().requests)).toHaveLength(1);
  } finally {
    release();
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it("stale writer recovery admits one concurrent opener and a stranded startup guard fails closed", async () => {
  const { mkdtemp, rm, writeFile, unlink } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { default: os } = await import("node:os");
  const { PrototypeStore } = await import("../../src/server/store.js");
  const directory = await mkdtemp(path.join(os.tmpdir(), "lilith-lock-"));
  try {
    // This PID is outside the host's usable PID range; ESRCH is checked first.
    expect(() => process.kill(2147483647, 0)).toThrow();
    await writeFile(path.join(directory, "writer.lock"), "2147483647", {
      mode: 0o600,
    });
    const attempts = await Promise.allSettled([
      PrototypeStore.open(directory),
      PrototypeStore.open(directory),
    ]);
    expect(
      attempts.filter((entry) => entry.status === "fulfilled"),
    ).toHaveLength(1);
    for (const attempt of attempts)
      if (attempt.status === "fulfilled") await attempt.value.close();
    await writeFile(path.join(directory, "startup.lock"), "2147483647", {
      mode: 0o600,
    });
    await expect(PrototypeStore.open(directory)).rejects.toThrow(
      "STORE_STARTUP_LOCKED",
    );
    await unlink(path.join(directory, "startup.lock"));
    const reopened = await PrototypeStore.open(directory);
    await reopened.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
