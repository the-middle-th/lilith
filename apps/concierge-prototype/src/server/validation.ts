import {
  CATEGORIES,
  CONSENT_VERSION,
  NOTICE_VERSION,
} from "../shared/contracts.js";
import {
  CONTACT_FIXTURES,
  DETAIL_PRESETS,
  IMAGE_FIXTURES,
} from "../shared/catalog.js";
import { ApiError, invariant } from "./errors.js";

export type JsonObject = Record<string, unknown>;
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as JsonObject)[key])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export function object(value: unknown): asserts value is JsonObject {
  invariant(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "INVALID_PAYLOAD",
    422,
  );
}
export type Action =
  | "create"
  | "edit"
  | "notice"
  | "consent"
  | "review"
  | "handoff"
  | "image-add"
  | "image-remove"
  | "locale";
const keys: Record<Action, readonly string[]> = {
  create: ["mock_data", "category"],
  edit: ["mock_data", "revision", "category", "details", "contact_fixture_id"],
  notice: ["mock_data", "revision", "notice_version"],
  consent: ["mock_data", "revision", "decision", "consent_version"],
  review: ["mock_data", "revision"],
  handoff: ["mock_data", "revision"],
  "image-add": ["mock_data", "revision", "image_fixture_id"],
  "image-remove": ["mock_data", "revision"],
  locale: ["mock_data", "locale"],
};
export function validate(action: Action, value: unknown): JsonObject {
  object(value);
  invariant(value["mock_data"] === true, "MOCK_DATA_REQUIRED", 422);
  const expected = keys[action];
  invariant(
    Object.keys(value).length === expected.length &&
      expected.every((key) => Object.hasOwn(value, key)),
    "INVALID_PAYLOAD",
    422,
  );
  if ("revision" in value)
    invariant(
      Number.isSafeInteger(value["revision"]) && Number(value["revision"]) > 0,
      "INVALID_PAYLOAD",
      422,
    );
  if (action === "create" || action === "edit")
    invariant(
      CATEGORIES.includes(value["category"] as never),
      "INVALID_PAYLOAD",
      422,
    );
  if (action === "edit") {
    invariant(
      value["contact_fixture_id"] === null ||
        CONTACT_FIXTURES.some(
          (fixture) => fixture.id === value["contact_fixture_id"],
        ),
      "INVALID_PAYLOAD",
      422,
    );
    invariant(
      value["details"] === null ||
        DETAIL_PRESETS.some(
          (preset) =>
            preset.category === value["category"] &&
            canonical(preset.details) === canonical(value["details"]),
        ),
      "INVALID_PAYLOAD",
      422,
    );
  }
  if (action === "notice")
    invariant(
      value["notice_version"] === NOTICE_VERSION,
      "INVALID_PAYLOAD",
      422,
    );
  if (action === "consent")
    invariant(
      (value["decision"] === "accept" || value["decision"] === "decline") &&
        value["consent_version"] === CONSENT_VERSION,
      "INVALID_PAYLOAD",
      422,
    );
  if (action === "image-add")
    invariant(
      IMAGE_FIXTURES.some(
        (fixture) => fixture.id === value["image_fixture_id"],
      ),
      "INVALID_PAYLOAD",
      422,
    );
  if (
    action === "locale" &&
    value["locale"] !== "th" &&
    value["locale"] !== "en"
  )
    throw new ApiError(422, "INVALID_PAYLOAD");
  return value;
}
