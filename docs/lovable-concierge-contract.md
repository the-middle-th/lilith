# Lovable frontend contract — LILITH Connect UI-017

Contract `LILITH-CONCIERGE-PROTOTYPE-01`, version `prototype-v1`. Scope: `mock_data:true`, `prototype_only:true`, local-only. [Approved architecture](adr/ADR-0014-lilith-connect-prototype-boundary.md), [full semantics](concierge-prototype-contract.md), [route manifest](governance/LILITH_38_ROUTE_MANIFEST.md). This is a UI verification handoff, not a production integration or publishing instruction.

## Sources that must remain aligned

- `apps/concierge-prototype/src/shared/routes.ts`: exactly 38 application routes with one template each; parameter values come from shipped synthetic catalog IDs only.
- `src/shared/contracts.ts`: request DTO, error codes, safety flags, six category IDs and six truthful request states.
- `src/shared/catalog.ts`: allowed detail scenarios, contact fixtures, synthetic image fixtures. Arbitrary input and new backend fields are outside scope.
- `src/shared/locales.ts`: Thai/English resources. Locale-independent data is separate from labels. Default Thai, whole-page English fallback for missing Thai page keys, hard build failure for missing English keys; no duplicated route implementations by locale.
- `src/client/main.ts` (`TEMPLATE_REGISTRY`): eight reusable families; route variants use content keys.

Source paths above are relative to the prototype app except the first. Exact delivery HEAD/PR/CI must be recorded in the execution report; this contract never substitutes a future implementation claim for evidence.

## Permitted frontend work

Layouts, navigation, responsive behavior, reception UI, synthetic forms, consent UI, visual components, loading/error/empty/unauthorized/pending states. Maintain 320px narrow, 390px mobile, desktop, keyboard and 200% text operation. Keep focus visible, errors announced and Accept/Decline equally operable. Preserve app-private runtime and original visual assets; no external scripts, fonts, analytics or image services.

## State and action contract

| Screen phase | Action | Server state / required truth |
| --- | --- | --- |
| Welcome/category | Explicit category selection creates synthetic draft | draft; one ID after durable response |
| Minimum details/contact | Save only catalog scenario and contact fixture | details_captured when complete; edit invalidates prior notice/consent/images |
| No-guarantee notice | Explicit acknowledgement of current version | consent_pending; no availability, matching, viewing or booking promise |
| Consent | Accept or Decline demonstration copy | accepted → consented; declined → consent_pending and images removed |
| Review | Explicit protected review submission | review_pending only with current notice, accepted demo consent and complete minimum data/contact |
| Human/Operations handoff | Explicit handoff request | human_handoff_pending; destination null, BLOCKED_OWNER_AUTHORIZATION, notification_sent:false |

`REVIEW_REQUIRED` labels demonstration consent, not authoritative legal wording. Decline explains that the synthetic draft remains locally and nothing was sent. Pending never implies human acceptance, booking or delivery. Review and handoff are separate actions. Post-review edits are rejected.

## HTTP behavior

All URLs are application endpoints under `/api/prototype`; no public domain assignment. Bootstrap sets a server-signed HttpOnly synthetic session and returns CSRF token, locale and owned synthetic request IDs. Client stores no signing key. Requests use same-origin credentials. Every business write sends literal `mock_data:true`, strict allowed fields, `X-CSRF-Token` and `Idempotency-Key`; draft changes also carry current revision. Retry an unresolved operation with the identical key/body; never mint a new key on a lost-response retry.

Success envelope: `{data, mock_data:true, prototype_only:true}`. Failure envelope: `{error:{code,message_key}, mock_data:true, prototype_only:true}`. Render localized error keys, never raw payloads or headers. A stale revision triggers refresh; discard older responses and invalidated local callbacks. Reopen/refetch current state before restoring committed images. Do not expose Operations role selectors or fabricate a recipient.

## Required UI states

| State | UI behavior |
| --- | --- |
| Loading / in-flight write | Clear progress, disabled duplicate action, outstanding idempotency key retained |
| Empty request | Explain no local request; link to Lili category selection |
| Network or save failure | Show failure, preserve committed gallery, offer same-key retry |
| 401 | Session unavailable; no leaked request details |
| 403 Operations | Access denied; no role escalation control |
| 404 unknown/foreign request | Same safe unavailable presentation |
| 409 revision/state conflict | Refresh server truth; no optimistic confirmation |
| Declined/missing consent | Protected review/handoff blocked |
| Review/handoff pending | Explicit pending label; no delivery notification claim |

Images: optional zero to four geometric fixtures. Unsaved previews remain in memory. Save only after consent; show saved only after durable response. Fifth rejected. Refresh/reopen restore only committed owned images. Decline/edit invalidates pending preview/restore callbacks and clears saved attachments. No real uploads, remote URLs or image metadata ingestion.

## Change boundary

Lovable must not alter schema, add fields, change API semantics, bypass consent, fabricate states, grant roles, connect production services, publish or deploy. If a needed field does not exist, return `CONTRACT_GAP` with the UI need, affected route/template and suggested field for architecture review. Do not invent a UI-only substitute.

Handoff: Codex contract and evidence → Lovable UX/UI verification → Manus independent QA on exact HEAD → Claude final architecture/governance review → ChatGPT / เจริญ Director decision. No downstream review is claimed completed here.
