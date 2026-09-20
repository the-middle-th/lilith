import { randomUUID } from "node:crypto";
import type {
  Category,
  Locale,
  RequestDetails,
  RequestRecord,
} from "../shared/contracts.js";
import { CONSENT_VERSION, NOTICE_VERSION } from "../shared/contracts.js";
import type {
  PrototypeStore,
  SessionRecord,
  Snapshot,
  StoredReply,
} from "./store.js";
import { ApiError, invariant } from "./errors.js";
import { canonical, validate } from "./validation.js";
import type { Action } from "./validation.js";

function emptyConsent(): RequestRecord["consent"] {
  return {
    state: "unset",
    version: null,
    copy_status: "REVIEW_REQUIRED",
    recorded_at: null,
  };
}
export function owned(
  snapshot: Snapshot,
  session: SessionRecord,
  id: string,
): RequestRecord {
  const request = Object.hasOwn(snapshot.requests, id)
    ? snapshot.requests[id]
    : undefined;
  if (!request || request.owner !== session.id)
    throw new ApiError(404, "NOT_FOUND");
  return request.record;
}
export class RequestService {
  constructor(
    private readonly store: PrototypeStore,
    private readonly now: () => number,
  ) {}
  get(session: SessionRecord, id: string, operations = false): RequestRecord {
    const snapshot = this.store.read();
    if (!operations) return owned(snapshot, session, id);
    invariant(
      session.role === "operations" && session.scopes.includes(id),
      "FORBIDDEN",
      403,
    );
    const record = snapshot.requests[id]?.record;
    invariant(record, "NOT_FOUND", 404);
    return record;
  }
  mutate(
    session: SessionRecord,
    action: Action,
    method: string,
    pathname: string,
    key: string,
    raw: unknown,
    id?: string,
    imageId?: string,
  ): Promise<StoredReply> {
    const body = validate(action, raw);
    const fingerprint = canonical(body);
    const ledgerKey = `${session.id}|${method}|${pathname}|${key}`;
    return this.store.transact((snapshot) => {
      const activeSession = snapshot.sessions[session.id];
      invariant(
        activeSession &&
          activeSession.expires > this.now() &&
          activeSession.expires === session.expires &&
          activeSession.csrf === session.csrf,
        "UNAUTHORIZED",
        401,
      );
      const record = id ? owned(snapshot, session, id) : undefined;
      const replay = snapshot.ledger[ledgerKey];
      if (replay) {
        invariant(replay.fingerprint === fingerprint, "IDEMPOTENCY_CONFLICT");
        return replay.response;
      }
      let result: unknown;
      let status = 200;
      if (action === "create") {
        invariant(session.role === "guest", "FORBIDDEN", 403);
        const newRecord: RequestRecord = {
          id: `mock-request-${randomUUID()}`,
          revision: 1,
          category: body["category"] as Category,
          details: null,
          contact_fixture_id: null,
          state: "draft",
          notice: { version: null, acknowledged: false },
          consent: emptyConsent(),
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
        snapshot.requests[newRecord.id] = {
          owner: session.id,
          record: newRecord,
        };
        result = newRecord;
        status = 201;
      } else if (action === "locale") {
        const persisted = snapshot.sessions[session.id];
        invariant(persisted, "UNAUTHORIZED", 401);
        persisted.locale = body["locale"] as Locale;
        result = { locale: persisted.locale };
      } else {
        invariant(record, "NOT_FOUND", 404);
        invariant(record.revision === body["revision"], "REVISION_CONFLICT");
        if (action === "edit") {
          invariant(
            !["review_pending", "human_handoff_pending"].includes(record.state),
            "INVALID_TRANSITION",
          );
          record.category = body["category"] as Category;
          record.details = body["details"] as RequestDetails | null;
          record.contact_fixture_id = body["contact_fixture_id"] as
            string | null;
          record.state = record.details ? "details_captured" : "draft";
          record.notice = { version: null, acknowledged: false };
          record.consent = emptyConsent();
          record.images = [];
          record.image_ids = [];
        } else if (action === "notice") {
          invariant(record.state === "details_captured", "INVALID_TRANSITION");
          invariant(record.details, "DETAILS_REQUIRED");
          record.notice = { version: NOTICE_VERSION, acknowledged: true };
          record.state = "consent_pending";
        } else if (action === "consent") {
          invariant(
            ["consent_pending", "consented"].includes(record.state),
            "INVALID_TRANSITION",
          );
          invariant(
            record.notice.acknowledged &&
              record.notice.version === NOTICE_VERSION,
            "NOTICE_REQUIRED",
          );
          const accepted = body["decision"] === "accept";
          record.consent = {
            state: accepted ? "accepted" : "declined",
            version: CONSENT_VERSION,
            copy_status: "REVIEW_REQUIRED",
            recorded_at: new Date(this.now()).toISOString(),
          };
          record.state = accepted ? "consented" : "consent_pending";
          if (!accepted) {
            record.images = [];
            record.image_ids = [];
          }
        } else if (action === "review") {
          invariant(
            record.consent.state === "accepted" &&
              record.consent.version === CONSENT_VERSION,
            "CONSENT_REQUIRED",
          );
          invariant(
            record.notice.acknowledged &&
              record.notice.version === NOTICE_VERSION,
            "NOTICE_REQUIRED",
          );
          invariant(record.state === "consented", "INVALID_TRANSITION");
          invariant(record.details, "DETAILS_REQUIRED");
          invariant(record.contact_fixture_id, "CONTACT_REQUIRED");
          record.state = "review_pending";
        } else if (action === "handoff") {
          invariant(record.state === "review_pending", "INVALID_TRANSITION");
          record.state = "human_handoff_pending";
        } else {
          invariant(
            record.state === "consented" && record.consent.state === "accepted",
            "CONSENT_REQUIRED",
          );
          if (action === "image-add") {
            const fixture = body["image_fixture_id"] as string;
            if (
              !record.images.some((image) => image.image_fixture_id === fixture)
            ) {
              invariant(record.images.length < 4, "IMAGE_LIMIT");
              const image = {
                id: `mock-image-attachment-${randomUUID()}`,
                image_fixture_id: fixture,
                mock_data: true as const,
              };
              record.images.push(image);
              record.image_ids.push(image.id);
            } else {
              // A new key for the same fixture is a no-op with a durable replay entry.
              const response = { status, data: record };
              snapshot.ledger[ledgerKey] = {
                fingerprint,
                response: structuredClone(response),
              };
              return response;
            }
          } else if (action === "image-remove") {
            invariant(
              record.images.some((image) => image.id === imageId),
              "NOT_FOUND",
              404,
            );
            record.images = record.images.filter(
              (image) => image.id !== imageId,
            );
            record.image_ids = record.images.map((image) => image.id);
          }
        }
        record.revision += 1;
        result = record;
      }
      const response: StoredReply = { status, data: result };
      snapshot.ledger[ledgerKey] = {
        fingerprint,
        response: structuredClone(response),
      };
      return response;
    });
  }
}
