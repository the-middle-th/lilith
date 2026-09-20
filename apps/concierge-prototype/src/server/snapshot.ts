import {
  CATEGORIES,
  CONSENT_VERSION,
  NOTICE_VERSION,
  REQUEST_STATES,
} from "../shared/contracts.js";
import {
  CONTACT_FIXTURES,
  DETAIL_PRESETS,
  IMAGE_FIXTURES,
} from "../shared/catalog.js";
import { canonical } from "./validation.js";
import type { Snapshot } from "./store.js";
function map(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function shape(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    map(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
function member(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === "string" && allowed.includes(value);
}
const uuid =
  "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const requestId = new RegExp(`^mock-request-${uuid}$`);
export function validRecord(value: unknown): boolean {
  if (
    !shape(value, [
      "id",
      "revision",
      "category",
      "details",
      "contact_fixture_id",
      "state",
      "notice",
      "consent",
      "image_ids",
      "images",
      "handoff",
      "mock_data",
      "prototype_only",
    ])
  )
    return false;
  const r = value;
  if (
    typeof r["id"] !== "string" ||
    !requestId.test(r["id"]) ||
    !Number.isSafeInteger(r["revision"]) ||
    Number(r["revision"]) < 1 ||
    r["mock_data"] !== true ||
    r["prototype_only"] !== true ||
    !CATEGORIES.includes(r["category"] as never) ||
    !REQUEST_STATES.includes(r["state"] as never)
  )
    return false;
  if (
    r["details"] !== null &&
    !DETAIL_PRESETS.some(
      (preset) =>
        preset.category === r["category"] &&
        canonical(preset.details) === canonical(r["details"]),
    )
  )
    return false;
  if (
    r["contact_fixture_id"] !== null &&
    !CONTACT_FIXTURES.some((fixture) => fixture.id === r["contact_fixture_id"])
  )
    return false;
  if (
    !Array.isArray(r["images"]) ||
    r["images"].length > 4 ||
    !Array.isArray(r["image_ids"]) ||
    r["images"].length !== r["image_ids"].length
  )
    return false;
  const imageIds = new Set<string>();
  const fixtureIds = new Set<string>();
  for (const image of r["images"]) {
    if (
      !shape(image, ["id", "image_fixture_id", "mock_data"]) ||
      typeof image["id"] !== "string" ||
      !new RegExp(`^mock-image-attachment-${uuid}$`).test(image["id"]) ||
      image["mock_data"] !== true ||
      !IMAGE_FIXTURES.some((f) => f.id === image["image_fixture_id"]) ||
      imageIds.has(image["id"]) ||
      fixtureIds.has(String(image["image_fixture_id"]))
    )
      return false;
    imageIds.add(image["id"]);
    fixtureIds.add(String(image["image_fixture_id"]));
  }
  if (
    canonical(r["image_ids"]) !==
    canonical(r["images"].map((image: { id: string }) => image.id))
  )
    return false;
  if (
    !shape(r["consent"], ["state", "version", "recorded_at", "copy_status"]) ||
    !member(r["consent"]["state"], ["unset", "accepted", "declined"]) ||
    r["consent"]["copy_status"] !== "REVIEW_REQUIRED"
  )
    return false;
  const consent = r["consent"];
  if (consent["state"] === "unset") {
    if (consent["version"] !== null || consent["recorded_at"] !== null)
      return false;
  } else if (
    consent["version"] !== CONSENT_VERSION ||
    typeof consent["recorded_at"] !== "string" ||
    !Number.isFinite(Date.parse(consent["recorded_at"]))
  )
    return false;
  if (
    !shape(r["notice"], ["version", "acknowledged"]) ||
    typeof r["notice"]["acknowledged"] !== "boolean" ||
    r["notice"]["version"] !==
      (r["notice"]["acknowledged"] ? NOTICE_VERSION : null)
  )
    return false;
  if (r["state"] === "draft" || r["state"] === "details_captured") {
    if (
      consent["state"] !== "unset" ||
      r["notice"]["acknowledged"] ||
      r["images"].length !== 0 ||
      (r["state"] === "draft") !== (r["details"] === null)
    )
      return false;
  } else {
    if (r["details"] === null || !r["notice"]["acknowledged"]) return false;
    if (r["state"] === "consent_pending") {
      if (consent["state"] === "accepted" || r["images"].length !== 0)
        return false;
    } else if (consent["state"] !== "accepted") return false;
    if (
      ["review_pending", "human_handoff_pending"].includes(
        String(r["state"]),
      ) &&
      r["contact_fixture_id"] === null
    )
      return false;
  }
  return (
    shape(r["handoff"], [
      "operations_destination",
      "status",
      "notification_sent",
    ]) &&
    r["handoff"]["operations_destination"] === null &&
    r["handoff"]["status"] === "BLOCKED_OWNER_AUTHORIZATION" &&
    r["handoff"]["notification_sent"] === false
  );
}
export function validSnapshot(value: unknown): value is Snapshot {
  if (
    !shape(value, ["version", "sessions", "requests", "ledger"]) ||
    value["version"] !== 1 ||
    !map(value["sessions"]) ||
    !map(value["requests"]) ||
    !map(value["ledger"])
  )
    return false;
  const sessions = value["sessions"];
  const requests = value["requests"];
  for (const [id, session] of Object.entries(sessions)) {
    if (
      !shape(session, ["id", "expires", "csrf", "locale", "role", "scopes"]) ||
      id !== session["id"] ||
      !new RegExp(`^mock-session-${uuid}$`).test(id) ||
      !Number.isSafeInteger(session["expires"]) ||
      Number(session["expires"]) <= 0 ||
      typeof session["csrf"] !== "string" ||
      !/^[a-zA-Z0-9_-]{43}$/.test(session["csrf"]) ||
      !member(session["locale"], ["th", "en"]) ||
      !member(session["role"], ["guest", "operations"]) ||
      !Array.isArray(session["scopes"]) ||
      !session["scopes"].every((scope) => typeof scope === "string")
    )
      return false;
    if (session["role"] === "guest" && session["scopes"].length !== 0)
      return false;
  }
  for (const [id, item] of Object.entries(requests)) {
    if (
      !shape(item, ["owner", "record"]) ||
      typeof item["owner"] !== "string" ||
      !Object.hasOwn(sessions, item["owner"]) ||
      !map(item["record"]) ||
      item["record"]["id"] !== id ||
      !validRecord(item["record"])
    )
      return false;
  }
  for (const [key, entry] of Object.entries(value["ledger"])) {
    const sessionId = key.split("|")[0];
    if (
      !sessionId ||
      !Object.hasOwn(sessions, sessionId) ||
      !shape(entry, ["fingerprint", "response"]) ||
      typeof entry["fingerprint"] !== "string" ||
      !shape(entry["response"], ["status", "data"]) ||
      typeof entry["response"]["status"] !== "number" ||
      ![200, 201].includes(entry["response"]["status"])
    )
      return false;
    const data = entry["response"]["data"];
    if (shape(data, ["locale"]) && member(data["locale"], ["th", "en"]))
      continue;
    if (!map(data) || !validRecord(data) || typeof data["id"] !== "string")
      return false;
    const current = requests[data["id"]];
    if (!map(current) || current["owner"] !== sessionId) return false;
  }
  return true;
}
