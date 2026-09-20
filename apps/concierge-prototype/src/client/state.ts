import type {
  Category,
  RequestDetails,
  RequestRecord,
} from "../shared/contracts.js";
import { DETAIL_PRESETS } from "../shared/catalog.js";
import type { DetailPreset } from "../shared/catalog.js";

function structuralKey(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(structuralKey).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${structuralKey(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

/** JSON object field order must not hide a valid restored catalog selection. */
export function findDetailPreset(
  category: Category,
  details: RequestDetails | null,
): DetailPreset | undefined {
  const key = structuralKey(details);
  return DETAIL_PRESETS.find(
    (preset) =>
      preset.category === category && structuralKey(preset.details) === key,
  );
}

/** A delayed replay cannot undo consent decline or an edit that removed images. */
export function mayAdoptRequest(
  current: RequestRecord | null,
  candidate: RequestRecord,
  currentGeneration: number,
  responseGeneration: number,
): boolean {
  return (
    currentGeneration === responseGeneration &&
    (!current ||
      current.id !== candidate.id ||
      candidate.revision >= current.revision)
  );
}

export function nextRequestPath(request: RequestRecord): string {
  if (request.state === "human_handoff_pending") return "/status/handoff";
  if (request.state === "review_pending") return "/status/pending";
  if (request.state === "consented") return "/intake/review";
  if (!request.details) return "/lili/requirements";
  if (!request.contact_fixture_id) return "/intake/contact";
  return "/intake/consent";
}
