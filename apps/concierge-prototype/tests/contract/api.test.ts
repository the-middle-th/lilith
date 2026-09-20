import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import { createPrototypeServer } from "../../src/server/http.js";
import type { PrototypeRuntime } from "../../src/server/http.js";
import {
  CATEGORIES,
  CONSENT_VERSION,
  NOTICE_VERSION,
} from "../../src/shared/contracts.js";
import type {
  ApiErrorCode,
  RequestRecord,
} from "../../src/shared/contracts.js";
import { DETAIL_PRESETS, IMAGE_FIXTURES } from "../../src/shared/catalog.js";

interface Client {
  cookie: string;
  csrf: string;
}
interface Reply {
  status: number;
  data: RequestRecord;
  error?: { code: string };
  raw: string;
}
let directory: string;
let runtime: PrototypeRuntime;
let client: Client;
let failCommit = false;
let time = Date.now();
let logEntries: Array<{ event: "request"; code: ApiErrorCode | "OK" }> = [];
const log = (entry: { event: "request"; code: ApiErrorCode | "OK" }): void => {
  logEntries.push(entry);
};
async function start(): Promise<void> {
  runtime = await createPrototypeServer({
    storeDir: path.join(directory, "store"),
    publicDir: path.join(directory, "public"),
    enableTestHarness: true,
    now: () => time,
    logger: (entry) => {
      log(entry);
    },
    testHooks: {
      beforeCommit: () => {
        if (failCommit) {
          failCommit = false;
          throw new Error("SIMULATED_DISK_FAILURE");
        }
      },
    },
  });
}
async function bootstrap(): Promise<Client> {
  const response = await fetch(`${runtime.origin}/api/prototype/bootstrap`);
  const json = (await response.json()) as { data: { csrf_token: string } };
  return {
    cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
    csrf: json.data.csrf_token,
  };
}
async function call(
  method: string,
  route: string,
  body?: unknown,
  key: string = randomUUID(),
  actor = client,
  extra: Record<string, string> = {},
): Promise<Reply> {
  const response = await fetch(`${runtime.origin}/api/prototype${route}`, {
    method,
    headers: {
      Cookie: actor.cookie,
      Origin: runtime.origin,
      "X-CSRF-Token": actor.csrf,
      "Idempotency-Key": key,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  const value = JSON.parse(raw) as {
    data: RequestRecord;
    error?: { code: string };
  };
  return { status: response.status, ...value, raw };
}
async function create(
  category: (typeof CATEGORIES)[number] = "condo",
): Promise<RequestRecord> {
  const r = await call("POST", "/drafts", { mock_data: true, category });
  expect(r.status).toBe(201);
  return r.data;
}
async function details(record: RequestRecord): Promise<RequestRecord> {
  const preset = DETAIL_PRESETS.find((p) => p.category === record.category);
  const r = await call("PUT", `/drafts/${record.id}`, {
    mock_data: true,
    revision: record.revision,
    category: record.category,
    details: preset?.details,
    contact_fixture_id: "mock-contact-01",
  });
  expect(r.status).toBe(200);
  return r.data;
}
async function notice(record: RequestRecord): Promise<RequestRecord> {
  const r = await call("POST", `/requests/${record.id}/notice`, {
    mock_data: true,
    revision: record.revision,
    notice_version: NOTICE_VERSION,
  });
  expect(r.status).toBe(200);
  return r.data;
}
async function consent(
  record: RequestRecord,
  decision = "accept",
): Promise<RequestRecord> {
  const r = await call("POST", `/requests/${record.id}/consent`, {
    mock_data: true,
    revision: record.revision,
    decision,
    consent_version: CONSENT_VERSION,
  });
  expect(r.status).toBe(200);
  return r.data;
}
async function ready(): Promise<RequestRecord> {
  return consent(await notice(await details(await create())));
}
async function image(
  record: RequestRecord,
  index: number,
): Promise<RequestRecord> {
  const r = await call("POST", `/requests/${record.id}/images`, {
    mock_data: true,
    revision: record.revision,
    image_fixture_id: IMAGE_FIXTURES[index]?.id,
  });
  expect(r.status).toBe(200);
  return r.data;
}
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "lilith-contract-"));
  time = Date.now();
  failCommit = false;
  logEntries = [];
  await mkdir(path.join(directory, "public/assets/fixtures"), {
    recursive: true,
  });
  await writeFile(
    path.join(directory, "public/index.html"),
    "<!doctype html><title>synthetic fixture</title>",
  );
  for (const fixture of IMAGE_FIXTURES)
    await writeFile(
      path.join(directory, "public", fixture.src),
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
    );
  await start();
  client = await bootstrap();
});
afterEach(async () => {
  await runtime.close();
  await rm(directory, { recursive: true, force: true });
});

describe("synthetic HTTP API", () => {
  it("boots an HttpOnly, SameSite session and returns exactly 38 routes / 8 templates", async () => {
    const boot = await fetch(`${runtime.origin}/api/prototype/bootstrap`);
    expect(boot.headers.get("set-cookie")).toContain(
      "HttpOnly; SameSite=Strict",
    );
    const routes = await call("GET", "/routes");
    expect(routes.status).toBe(200);
    const data = routes.data as unknown as {
      routes: unknown[];
      templates: unknown[];
    };
    expect(data.routes).toHaveLength(38);
    expect(data.templates).toHaveLength(8);
    expect((await fetch(`${runtime.origin}/hotel/not-a-fixture`)).status).toBe(
      404,
    );
    expect((await fetch(`${runtime.origin}/server/auth.js`)).status).toBe(404);
    const record = await create();
    expect(
      (await call("GET", `/requests/${record.id}/status/unknown`)).status,
    ).toBe(404);
  });
  it.each(CATEGORIES)(
    "runs every minimum-details category through notice, consent, review and explicit handoff: %s",
    async (category) => {
      let record = await create(category);
      expect(record.state).toBe("draft");
      expect(record.consent.state).toBe("unset");
      record = await details(record);
      expect(record.state).toBe("details_captured");
      record = await notice(record);
      expect(record.state).toBe("consent_pending");
      record = await consent(record);
      expect(record.state).toBe("consented");
      expect(record.consent.version).toBe(CONSENT_VERSION);
      expect(record.consent.copy_status).toBe("REVIEW_REQUIRED");
      const review = await call("POST", `/requests/${record.id}/review`, {
        mock_data: true,
        revision: record.revision,
      });
      expect(review.status).toBe(200);
      expect(review.data.state).toBe("review_pending");
      const handoff = await call("POST", `/requests/${record.id}/handoff`, {
        mock_data: true,
        revision: review.data.revision,
      });
      expect(handoff.status).toBe(200);
      expect(handoff.data.state).toBe("human_handoff_pending");
      expect(handoff.data.handoff).toEqual({
        operations_destination: null,
        status: "BLOCKED_OWNER_AUTHORIZATION",
        notification_sent: false,
      });
      expect([
        "confirmed",
        "booked",
        "matched",
        "available",
        "accepted",
        "completed",
      ]).not.toContain(handoff.data.state);
    },
  );
  it.each([false, "true", undefined, null])(
    "rejects non-literal mock data %s without creating records",
    async (mock) => {
      const r = await call("POST", "/drafts", {
        ...(mock === undefined ? {} : { mock_data: mock }),
        category: "condo",
      });
      expect(r.status).toBe(422);
      expect(r.error?.code).toBe("MOCK_DATA_REQUIRED");
      const snapshot = JSON.parse(
        await readFile(path.join(directory, "store/snapshot.json"), "utf8"),
      ) as { requests: object };
      expect(Object.keys(snapshot.requests)).toHaveLength(0);
    },
  );
  it("strict schemas reject unknown fields, real input, wrong category details and unsupported versions", async () => {
    expect(
      (
        await call("POST", "/drafts", {
          mock_data: true,
          category: "condo",
          owner: "me",
        })
      ).status,
    ).toBe(422);
    const r = await create();
    const base = {
      mock_data: true,
      revision: r.revision,
      category: r.category,
      details: DETAIL_PRESETS[0]?.details,
      contact_fixture_id: "mock-contact-01",
    };
    expect(
      (
        await call("PUT", `/drafts/${r.id}`, {
          ...base,
          contact_fixture_id: "real@example.com",
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call("PUT", `/drafts/${r.id}`, {
          ...base,
          details: { description: "real person" },
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call("PUT", `/drafts/${r.id}`, {
          ...base,
          details: DETAIL_PRESETS[2]?.details,
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call("POST", `/requests/${r.id}/notice`, {
          mock_data: true,
          revision: 1,
          notice_version: "legal-approved",
        })
      ).status,
    ).toBe(422);
  });
  it.each([
    { decision: ["accept"] },
    { decision: ["decline"] },
    { decision: 1 },
    { decision: {} },
    { decision: true },
  ])("rejects coerced consent decisions $decision", async ({ decision }) => {
    const record = await notice(await details(await create()));
    const reply = await call("POST", `/requests/${record.id}/consent`, {
      mock_data: true,
      revision: record.revision,
      decision,
      consent_version: CONSENT_VERSION,
    });
    expect(reply.status).toBe(422);
    expect(
      (await call("GET", `/requests/${record.id}`)).data.consent.state,
    ).toBe("unset");
  });
  it("fails closed for absent consent, direct handoff, and incomplete/contactless details", async () => {
    let r = await create();
    expect(
      (
        await call("POST", `/requests/${r.id}/review`, {
          mock_data: true,
          revision: r.revision,
        })
      ).error?.code,
    ).toBe("CONSENT_REQUIRED");
    expect(
      (
        await call("POST", `/requests/${r.id}/handoff`, {
          mock_data: true,
          revision: r.revision,
        })
      ).error?.code,
    ).toBe("INVALID_TRANSITION");
    expect(
      (
        await call("POST", `/requests/${r.id}/notice`, {
          mock_data: true,
          revision: r.revision,
          notice_version: NOTICE_VERSION,
        })
      ).status,
    ).toBe(409);
    const incomplete = await call("PUT", `/drafts/${r.id}`, {
      mock_data: true,
      revision: r.revision,
      category: "condo",
      details: null,
      contact_fixture_id: null,
    });
    expect(incomplete.data.state).toBe("draft");
    r = await details(incomplete.data);
    r = (
      await call("PUT", `/drafts/${r.id}`, {
        mock_data: true,
        revision: r.revision,
        category: r.category,
        details: r.details,
        contact_fixture_id: null,
      })
    ).data;
    r = await consent(await notice(r));
    expect(
      (
        await call("POST", `/requests/${r.id}/review`, {
          mock_data: true,
          revision: r.revision,
        })
      ).error?.code,
    ).toBe("CONTACT_REQUIRED");
  });
  it("persists decline and clears attachments; edits reset every consent/notice/image field atomically", async () => {
    let r = await image(await ready(), 0);
    r = await consent(r, "decline");
    expect(r.state).toBe("consent_pending");
    expect(r.consent.state).toBe("declined");
    expect(r.image_ids).toEqual([]);
    expect(
      (
        await call("POST", `/requests/${r.id}/review`, {
          mock_data: true,
          revision: r.revision,
        })
      ).error?.code,
    ).toBe("CONSENT_REQUIRED");
    r = await details(r);
    expect(r.consent).toEqual({
      state: "unset",
      version: null,
      recorded_at: null,
      copy_status: "REVIEW_REQUIRED",
    });
    expect(r.notice).toEqual({ version: null, acknowledged: false });
    r = await image(await consent(await notice(r)), 1);
    const attachmentId = r.image_ids[0];
    r = await details(r);
    expect(r.images).toEqual([]);
    expect(r.image_ids).toEqual([]);
    expect(r.consent.state).toBe("unset");
    expect(
      (await call("GET", `/requests/${r.id}/images/${attachmentId}`)).status,
    ).toBe(404);
    r = await consent(await notice(r));
    const reviewed = await call("POST", `/requests/${r.id}/review`, {
      mock_data: true,
      revision: r.revision,
    });
    expect(
      (
        await call("PUT", `/drafts/${r.id}`, {
          mock_data: true,
          revision: reviewed.data.revision,
          category: r.category,
          details: r.details,
          contact_fixture_id: r.contact_fixture_id,
        })
      ).error?.code,
    ).toBe("INVALID_TRANSITION");
  });
  it("isolates requests/images and denies anonymous, tampered, expired and unscoped Operations sessions", async () => {
    const r = await image(await ready(), 0);
    const other = await bootstrap();
    expect(
      (await call("GET", `/requests/${r.id}`, undefined, randomUUID(), other))
        .status,
    ).toBe(404);
    expect(
      (
        await call(
          "GET",
          `/requests/${r.id}/images/${r.image_ids[0]}`,
          undefined,
          randomUUID(),
          other,
        )
      ).status,
    ).toBe(404);
    expect(
      (await call("GET", `/requests/missing`, undefined, randomUUID(), other))
        .raw,
    ).toBe(
      (await call("GET", `/requests/${r.id}`, undefined, randomUUID(), other))
        .raw,
    );
    expect(
      (
        await call("GET", `/requests/${r.id}`, undefined, randomUUID(), {
          cookie: "",
          csrf: "",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await call("GET", `/requests/${r.id}`, undefined, randomUUID(), {
          ...client,
          cookie: `${client.cookie}tampered`,
        })
      ).status,
    ).toBe(401);
    expect((await call("GET", `/operations/requests/${r.id}`)).status).toBe(
      403,
    );
    const allowed = await runtime.testHarness?.issueOperationsSession([r.id]);
    expect(allowed).toBeDefined();
    const operator = {
      cookie: allowed?.cookie ?? "",
      csrf: allowed?.csrf_token ?? "",
    };
    expect(
      (
        await call(
          "GET",
          `/operations/requests/${r.id}`,
          undefined,
          randomUUID(),
          operator,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await call(
          "GET",
          "/operations/requests/unscoped",
          undefined,
          randomUUID(),
          operator,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          "GET",
          `/requests/${r.id}`,
          undefined,
          randomUUID(),
          operator,
        )
      ).status,
    ).toBe(404);
    time += 24 * 60 * 60 * 1000 + 1;
    expect((await call("GET", `/requests/${r.id}`)).status).toBe(401);
  });
  it("requires same origin, CSRF, JSON and valid idempotency keys before writes", async () => {
    const payload = { mock_data: true, category: "condo" };
    expect(
      (
        await call("POST", "/drafts", payload, randomUUID(), client, {
          Origin: "https://example.invalid",
        })
      ).error?.code,
    ).toBe("ORIGIN_DENIED");
    expect(
      (
        await call("POST", "/drafts", payload, randomUUID(), client, {
          "X-CSRF-Token": "wrong",
        })
      ).error?.code,
    ).toBe("CSRF_INVALID");
    expect((await call("POST", "/drafts", payload, "bad")).error?.code).toBe(
      "IDEMPOTENCY_REQUIRED",
    );
    expect(
      (
        await call("POST", "/drafts", payload, randomUUID(), client, {
          "Content-Type": "text/plain",
        })
      ).status,
    ).toBe(415);
    expect(
      (await call("POST", "/drafts", { ...payload, text: "x".repeat(17000) }))
        .status,
    ).toBe(413);
    const hostStatus = await new Promise<number | undefined>(
      (resolve, reject) => {
        const request = httpRequest(
          `${runtime.origin}/api/prototype/bootstrap`,
          { headers: { Host: "example.invalid" } },
          (response) => {
            response.resume();
            resolve(response.statusCode);
          },
        );
        request.once("error", reject);
        request.end();
      },
    );
    expect(hostStatus).toBe(403);
  });
  it("replays concurrent creation/double clicks and lost responses; detects changed-body key reuse", async () => {
    const key = randomUUID();
    const body = { mock_data: true, category: "condo" };
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => call("POST", "/drafts", body, key)),
    );
    expect(new Set(responses.map((r) => r.data.id)).size).toBe(1);
    expect(responses.every((r) => r.status === 201)).toBe(true);
    expect((await call("POST", "/drafts", body, key)).raw).toBe(
      responses[0]?.raw,
    );
    expect(
      (await call("POST", "/drafts", { ...body, category: "hotel" }, key)).error
        ?.code,
    ).toBe("IDEMPOTENCY_CONFLICT");
    const snapshot = JSON.parse(
      await readFile(path.join(directory, "store/snapshot.json"), "utf8"),
    ) as { requests: object };
    expect(Object.keys(snapshot.requests)).toHaveLength(1);
  });
  it("serializes concurrent submissions, replays before stale checks and preserves original revision", async () => {
    const record = await ready();
    const key = randomUUID();
    const body = { mock_data: true, revision: record.revision };
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        call("POST", `/requests/${record.id}/review`, body, key),
      ),
    );
    expect(
      results.every(
        (r) => r.status === 200 && r.data.revision === record.revision + 1,
      ),
    ).toBe(true);
    expect(
      (await call("POST", `/requests/${record.id}/review`, body)).error?.code,
    ).toBe("REVISION_CONFLICT");
    const reviewed = results[0]?.data;
    expect(reviewed).toBeDefined();
    await call("POST", `/requests/${record.id}/handoff`, {
      mock_data: true,
      revision: reviewed?.revision,
    });
    expect(
      (await call("POST", `/requests/${record.id}/review`, body, key)).data
        .state,
    ).toBe("review_pending");
    expect((await call("GET", `/requests/${record.id}`)).data.state).toBe(
      "human_handoff_pending",
    );
  });
  it("saves 1–4 images, rejects fifth, prevents concurrent overflow and makes duplicate fixture a no-op", async () => {
    let r = await ready();
    for (let i = 0; i < 3; i++) {
      r = await image(r, i);
      expect(r.images).toHaveLength(i + 1);
    }
    const concurrent = await Promise.all(
      [3, 4].map((i) =>
        call("POST", `/requests/${r.id}/images`, {
          mock_data: true,
          revision: r.revision,
          image_fixture_id: IMAGE_FIXTURES[i]?.id,
        }),
      ),
    );
    expect(concurrent.filter((item) => item.status === 200)).toHaveLength(1);
    expect(
      concurrent.filter((item) => item.error?.code === "REVISION_CONFLICT"),
    ).toHaveLength(1);
    r = (await call("GET", `/requests/${r.id}`)).data;
    expect(r.images).toHaveLength(4);
    const absent = IMAGE_FIXTURES.find(
      (fixture) =>
        !r.images.some((image) => image.image_fixture_id === fixture.id),
    );
    expect(
      (
        await call("POST", `/requests/${r.id}/images`, {
          mock_data: true,
          revision: r.revision,
          image_fixture_id: absent?.id,
        })
      ).error?.code,
    ).toBe("IMAGE_LIMIT");
    const duplicate = await call("POST", `/requests/${r.id}/images`, {
      mock_data: true,
      revision: r.revision,
      image_fixture_id: r.images[0]?.image_fixture_id,
    });
    expect(duplicate.data.revision).toBe(r.revision);
    expect(duplicate.data.images).toHaveLength(4);
    const imageResponse = await fetch(
      `${runtime.origin}/api/prototype/requests/${r.id}/images/${r.image_ids[0]}`,
      { headers: { Cookie: client.cookie } },
    );
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers.get("content-type")).toBe("image/svg+xml");
    const removed = await call(
      "DELETE",
      `/requests/${r.id}/images/${r.image_ids[0]}`,
      { mock_data: true, revision: r.revision },
    );
    expect(removed.data.images).toHaveLength(3);
  });
  it("retains committed gallery after failed save, and retries same key exactly once", async () => {
    const r = await image(await ready(), 0);
    const key = randomUUID();
    const payload = {
      mock_data: true,
      revision: r.revision,
      image_fixture_id: IMAGE_FIXTURES[1]?.id,
    };
    failCommit = true;
    expect(
      (await call("POST", `/requests/${r.id}/images`, payload, key)).status,
    ).toBeGreaterThanOrEqual(500);
    expect((await call("GET", `/requests/${r.id}`)).data.images).toHaveLength(
      1,
    );
    const retried = await call(
      "POST",
      `/requests/${r.id}/images`,
      payload,
      key,
    );
    expect(retried.status).toBe(200);
    expect(retried.data.images).toHaveLength(2);
    expect(
      (await call("POST", `/requests/${r.id}/images`, payload, key)).raw,
    ).toBe(retried.raw);
  });
  it("reopens durable requests/images/session locale/idempotency ledger after process restart", async () => {
    const r = await ready();
    const key = randomUUID();
    const payload = {
      mock_data: true,
      revision: r.revision,
      image_fixture_id: IMAGE_FIXTURES[0]?.id,
    };
    const saved = await call("POST", `/requests/${r.id}/images`, payload, key);
    expect(
      (await call("PUT", "/locale", { mock_data: true, locale: "en" })).status,
    ).toBe(200);
    await runtime.close();
    await start();
    expect((await call("GET", `/requests/${r.id}`)).data).toEqual(saved.data);
    expect(
      (await call("POST", `/requests/${r.id}/images`, payload, key)).raw,
    ).toBe(saved.raw);
    const boot = await fetch(`${runtime.origin}/api/prototype/bootstrap`, {
      headers: { Cookie: client.cookie },
    });
    const data = (await boot.json()) as {
      data: { locale: string; request_ids: string[] };
    };
    expect(data.data.locale).toBe("en");
    expect(data.data.request_ids).toEqual([r.id]);
    expect((await stat(path.join(directory, "store"))).mode & 0o777).toBe(
      0o700,
    );
    for (const name of ["snapshot.json", "session-key", "writer.lock"])
      expect(
        (await stat(path.join(directory, "store", name))).mode & 0o777,
      ).toBe(0o600);
  });
  it("refuses a second process writer and corrupted snapshots; keeps logs free of headers, payloads and secrets", async () => {
    await expect(
      createPrototypeServer({
        storeDir: path.join(directory, "store"),
        publicDir: path.join(directory, "public"),
      }),
    ).rejects.toThrow("STORE_LOCKED");
    await call("POST", "/drafts", {
      mock_data: true,
      category: "condo",
      contact: "private@example.com",
    });
    const logs = JSON.stringify(logEntries);
    expect(logs).not.toContain(client.cookie);
    expect(logs).not.toContain(client.csrf);
    expect(logs).not.toContain("private@example.com");
    expect(logs).not.toContain("contact");
    const key = await readFile(path.join(directory, "store/session-key"));
    expect(logs).not.toContain(key.toString("base64url"));
    const separate = path.join(directory, "corrupt");
    await mkdir(separate);
    await writeFile(path.join(separate, "snapshot.json"), "{broken");
    await expect(
      createPrototypeServer({
        storeDir: separate,
        publicDir: path.join(directory, "public"),
      }),
    ).rejects.toThrow();
  });
});
