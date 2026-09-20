# LILITH Connect — approved prototype implementation contract

**APPROVE_FOR_CODEX · PRE-CODE SPECIFICATION · UI-017 · 2026-09-20**

Owner approved the repository/base/branch/app path. Claude round 3 approved this specification with the amendments below. No implementation/test success is implied. Workspace package name is fixed: `@lilith/concierge-prototype`. Node 24 + TypeScript, empty runtime dependencies, browser-native ES modules; separate server/client compilation. The approved amendments below take precedence if wording overlaps.

## 1 / 5 — Approved scope, path and governance

```yaml
contract_id: LILITH-CONCIERGE-PROTOTYPE-01
contract_status: APPROVE_FOR_CODEX
repository: the-middle-th/lilith
base_branch: codex/lilith-prototype
base_sha: 762affefba84209a9a96263ef7f834ddc8e7fd7c
task: UI-017
branch: feat/UI-017-lilith-connect-prototype
runtime: apps/concierge-prototype
required_merged_dependency: ARCH-001
implementation_authorized: true
mock_data: true
prototype_only: true
production_publish: false
real_traffic: false
real_leads: false
paid_traffic: false
google_ads: false
dns_change: false
billing_change: false
real_customer_contact: false
external_notification: false
```

**Approved namespace decision:** a separate app/runtime inside the approved monorepo, with its own router, API and local persistence. Preserve all 38 proposed Notion application paths in that runtime. The marketplace remains `apps/web`; its future `/welcome` and `/property/[id]` meanings remain in that separate runtime. No shared HTTP router, reverse proxy, public host assignment or domain mapping. Local execution binds only to loopback. Logical route count excludes API endpoints and assets. Property Pulse remains a separate content/intelligence context; no mutable store or runtime import connects it to concierge.

UI-017 is proposed because the full exact-SHA handoff lists UI-001–UI-016, with no UI-017; the complete tree and fetched branch list contain neither this task path nor the proposed branch. This is evidence of availability at inspection, not a reservation; recheck before branch creation. The candidate is a fork of `arithachboss-cmyk/lilith`; upstream ARCH-001 PR #2 merged at the candidate SHA. ARCH-002 PR #3 remains unmerged.

**Approved scoped exception:** UI-017 is an isolated mock prototype task depending only on merged ARCH-001. It neither implements nor satisfies production ARCH-002+, AUTH, DB, matching or marketplace UI tasks. Its internal contracts, auth simulation and storage remain inside the app. It may reuse boundary tooling and build configuration, but must not add production domain exports to shared packages. This exception is expressly approved and recorded in ADR-0014.

Owner path approval and applicable Claude APPROVE_FOR_CODEX are recorded. Governance artifacts precede implementation. Canonical paths:

- `docs/governance/WEB_PORTFOLIO_REGISTRY.md`
- `docs/governance/LILITH_P0_RELIABILITY_GATE.md`
- `docs/governance/LILITH_38_ROUTE_MANIFEST.md`
- `docs/adr/ADR-0014-lilith-connect-prototype-boundary.md` — fresh collision check passed before creation.
- `docs/concierge-prototype-contract.md`, plus UI-017 entries in existing handoff/order and architecture/status documentation.

Registry: Slot 1 LILITH Connect; Slot 2 Property Pulse; Slots 3–4 `identity_status:missing`. Domains `opuslilithconnect.com` and `lilithconnect.com` remain jointly known with individual mapping null. These intentional unknowns do not block the isolated prototype. Do not create redundant equivalents. Approval requires this specification and decisions; executable schemas and passing tests are post-approval delivery requirements, not prerequisites demanding code before the gate.

## 2 / 5 — Route, template, locale and minimum-data contracts

The route names and logical paths are exactly the 38 rows in the attached Notion manifest (`evidence.json.notion`); parameter spellings are route patterns, not public URLs. A machine-readable registry inside the proposed app will be the only routing source:

```yaml
route_fields:
  route_id: R01..R38
  route_key: unique_stable_identifier
  route_path: exact_Notion_application_path
  template_id: T1..T8
  category: reception|property|hospitality|mobility|concierge|lili|intake|operations|support|governance
  supported_locales: [th, en]
  requires_consent: boolean
  requires_human_handoff: boolean
  data_requirement_level: none|mock_detail|minimal|contact|consent|review|status
  prototype_only: true
  mock_data: true
  status: prototype
  content_key: unique_locale_resource_prefix
templates:
  T1: [R01,R02,R03,R04]
  T2: [R05,R06,R07,R08,R09,R10,R11,R14,R15,R18,R19,R20,R24,R25,R26,R27]
  T3: [R12,R16]
  T4: [R13,R17,R21,R22,R23]
  T5: [R28,R29,R30]
  T6: [R31,R32,R33]
  T7: [R34,R35,R36]
  T8: [R37,R38]
```

`requires_consent:true` on R33–R36; other routes false. `requires_human_handoff:true` on R13, R17, R21–R23, R28–R36 describes the requested eventual handoff, never human acceptance. Data levels: T1/T2/T8 none; T3 mock_detail; T4/T5 minimal; R31 contact; R32 consent; R33 review; R34–R36 status. Category/group follows the Notion row. Template registry has exactly eight renderers. Parameter validation admits only shipped synthetic property/hotel IDs; resolve `/hotel/search` before `/hotel/:hotel_id`. Unknown routes/IDs yield localized safe 404 without draft creation.

Locale resources cover `th` and `en`, with no per-language route copies. Explicit language selection persists in local preference storage and the synthetic session. Default is `th`; an unsupported locale selects `th`. A missing key in a required page bundle switches the **whole page** to complete English resources with a translated fallback notice, avoiding mixed-language fragments. Missing English fallback is a blocking development/test error. Persist locale-independent IDs and values; localize labels when rendering. Both demo consent resources carry `REVIEW_REQUIRED`; no authoritative legal translation is claimed.

Draft details are a strict discriminated union, with no unknown keys:

| category | Required minimum details |
|---|---|
| condo | intent `rent\|buy`; area/BTS fixture key; budget `{min,max,currency:THB}`; bedrooms; move timeframe key |
| hotel | location fixture key; check-in/out dates; guest count; basic preference keys |
| airport_transfer | pickup/destination fixture keys; date-time with offset; passenger count |
| car_with_driver / private_driver | date-time; pickup fixture key; general itinerary fixture key; passenger count |
| bespoke | short synthetic description fixture key; timing key |

Only shipped synthetic catalog values are accepted in this prototype, including date/count/budget combinations; UI controls identify them as sample choices. Conditional contact input is only `contact_fixture_id`, resolving a synthetic contact display—never actual phone/email/LINE input. No passport, ID, financial/medical fields, sensitive attributes or free-text contact ingestion. Rejected values are not persisted or logged. Future arbitrary-input support requires a separate contract revision.

## 3 / 5 — Draft API, isolation and truthful journey

All endpoints are local to the isolated runtime under `/api/prototype`; they are not production APIs. Writes require JSON, literal `mock_data:true`, strict schemas, same-origin validation, a valid synthetic session, CSRF token and `Idempotency-Key`. Missing/false/string `mock_data` returns 422 without mutation. Unknown fields return 422. Body size limits apply before parsing. No provider/network integration exists.

Synthetic session: server-generated random identity in an expiring HMAC-signed `HttpOnly; SameSite=Strict; Path=/` cookie, issued by local page bootstrap; no human identity is asserted. The signing key is generated locally, stored outside source with mode 0600, never embedded in client bundles or logs. Session expires after 24 hours; a valid cookie reopens only its own requests. CSRF token is provided to that session at bootstrap. Host/Origin must match the configured loopback origin; disallow wildcard binding and cross-origin access. A caller cannot choose actor/role/owner fields. No public API issues Operations sessions; unit/E2E harnesses may inject server-signed synthetic Operations sessions with explicit request scopes to exercise authorization. Normal runtime Operations access remains denied.

```yaml
request_record:
  id: server_generated_mock-request-UUID
  revision: monotonically_increasing_integer
  category: six_category_enum
  details: category_union
  contact_fixture_id: nullable_catalog_id
  state: draft|details_captured|consent_pending|consented|review_pending|human_handoff_pending
  notice: {version: nullable_string, acknowledged: boolean}
  consent: {state: unset|accepted|declined, version: nullable_string, copy_status: REVIEW_REQUIRED, recorded_at: nullable_timestamp}
  image_ids: synthetic_ids_max_4
  handoff: {operations_destination: null, status: BLOCKED_OWNER_AUTHORIZATION, notification_sent: false}
  mock_data: true
  prototype_only: true
success: {data: object, mock_data: true, prototype_only: true}
error: {error: {code: string, message_key: string}, mock_data: true, prototype_only: true}
```

The server stores ownership separately and never accepts it from payloads. Public DTOs omit signing material, other requests and internal actor scopes. Unauthenticated reads/writes return 401. A foreign/nonexistent request ID returns indistinguishable 404 after authentication. Unauthorized Operations access returns 403, without request data.

| Method / endpoint | Strict payload / result |
|---|---|
| GET `/routes` | 38 route DTOs + eight-template registry/version |
| POST `/drafts` | `{mock_data:true,category}` → new `draft`, synthetic ID, revision 1 |
| GET `/requests/:id` | own draft/state DTO |
| PUT `/drafts/:id` | `{mock_data:true,revision,category,details,contact_fixture_id}` → validated draft DTO |
| POST `/requests/:id/notice` | `{mock_data:true,revision,notice_version}` → `consent_pending` only after complete minimum details |
| POST `/requests/:id/consent` | `{mock_data:true,revision,decision:accept\|decline,consent_version}` → persisted choice/version/time |
| POST `/requests/:id/review` | `{mock_data:true,revision}` → `review_pending` only after current notice, accepted demo consent and complete details |
| GET `/requests/:id/status` | same truthful state, no invented availability/acceptance |
| POST `/requests/:id/handoff` | `{mock_data:true,revision}` → `human_handoff_pending`; destination null/blocked metadata; no send |
| GET `/operations/requests/:id` | explicit scoped synthetic Operations authorization only; default deny |

An incomplete PUT remains `draft`; complete details become `details_captured`. Notice acknowledgement then creates `consent_pending`. Lili displays short welcome, category, minimum details and no-guarantee notice before consent. Accept creates `consented`; Decline retains `consent_pending` with `consent.state:declined`, removes saved images and prevents review/handoff. Decline truthfully says the synthetic draft remains in local prototype storage and nothing was sent. Editing before review invalidates prior consent/notice and returns draft/details_captured; post-review edits are rejected. Consent decisions are allowed only in consent_pending/consented; image mutation only in consented; review only from consented; handoff only from review_pending. After review, consent UI displays its recorded choice without offering unsupported withdrawal. Review requires a selected synthetic contact fixture. Illegal transitions return 409. Review and handoff are separate explicit actions; no automatic qualification, confirmed/booked/matched/available/accepted/completed state.

## 4 / 5 — Persistence, consent and image reliability

**Approved demo consent decision:** prototype copy is visibly labeled `REVIEW_REQUIRED — prototype demonstration, not approved legal wording`. Version `prototype-demo-v1` identifies sample copy, not legal validity. Accept and Decline are equally operable, never preselected. Explicit demo consent permits the entire **synthetic** journey through review_pending and human_handoff_pending. Legal-copy review status never creates an invented permanent block on that demo; production remains prohibited. A future copy change requires a versioned contract revision.

Persistence: app-private local JSON store in ignored `.local/concierge-prototype/`, directory 0700/files 0600; no database/Prisma/shared mutable package. One process holds an exclusive store lock; a second writer refuses startup. Serialize mutations, write data plus idempotency ledger in one atomic file replacement, and acknowledge success only after durable commit. Recovery loads the last complete snapshot; corrupted snapshots fail closed. All stored records are synthetic. Refresh/reopen and process restart retain committed drafts/images while the session is valid. Test reset operates only on an isolated temporary directory.

Idempotency applies to **every business mutation**. Scope = authenticated session + method + normalized path + idempotency key. Fingerprint = canonical validated body, including revision and mock flag. Under the same serialized commit lock: authorize resource → consult ledger → replay matching saved response, or reject different fingerprint with 409 `IDEMPOTENCY_CONFLICT` → check revision/state → commit mutation and response ledger together. Replay precedes revision comparison, so lost-response retries return the original result. New stale writes return 409 `REVISION_CONFLICT`. Concurrent identical calls receive one mutation/ID. Do not evict ledger entries while their request/session remains accessible. Failed pre-commit writes are retryable; uncertain responses use the same key. The UI retains an outstanding key until the result is resolved.

Responses carry committed revisions. A replay describes its original commit, not a new transition. Clients discard responses older than displayed revision or from an invalidated local flow, and refetch current state on reopen/replay before restoring saved images. Decline invalidates pending preview/restore callbacks, preventing a delayed older response from restoring removed images or showing stale consent.

**Approved image scope: included for synthetic reliability testing.** Optional 0–4 images per request; pick from a shipped catalog of generated geometric images. No user photo/file ingestion, remote URLs or EXIF. Before accepted demo consent, preview selections live only in UI memory. After acceptance, `POST /requests/:id/images` takes `{mock_data:true,revision,image_fixture_id}` and returns a saved request-bound image ID; bytes come from the local catalog. `DELETE /requests/:id/images/:image_id` takes `{mock_data:true,revision}`. Both use the same transaction/revision/idempotency rules. Fifth image is rejected without changing the existing four; repeats of the same catalog image return the existing attachment without duplicates. Authorization gates image reads, writes and removal; an image ID is not a bearer credential.

Serialized capacity checks prevent concurrent fifth-image admission. Preview, saving, saved and failed states are distinct; display saved only after committed response. Failed save keeps the previous committed gallery. Refresh/reopen restores committed count/order. Decline removes saved attachments in the same transaction as consent change. Test-only failure injection is internal to the isolated harness, never a browser-selectable production feature. Handoff exposes only committed images. No email, LINE, operator notification, booking or delivery evidence is implied.

## 5 / 5 — Acceptance, Lovable boundary and release sequence

These are **planned acceptance tests**, not executed results. Implement schemas/state validators and these cases after approval, then report actual command outputs on exact HEAD:

| Test group | Required assertions |
|---|---|
| ROUTE-01..04 | exactly 38 unique IDs/paths, eight renderers, complete one-template mapping; unknown/dynamic IDs safe; hotel/search specificity; no locale route duplication |
| LILI-01..06 | every category/minimum schema, no-guarantee before consent, truthful pending/handoff; forbidden status/guarantee claims absent |
| CONSENT-01..05 | unset/accept/decline, version persistence, direct-API missing-consent denial, edit invalidation; full synthetic flow remains usable with REVIEW_REQUIRED label |
| A11Y-01..04 | 390px/mobile, 320px/narrow, desktop, keyboard and 200% text; readable copy, visible focus, errors and operable Accept/Decline |
| MOCK-01..04 | literal true accepted; false/missing/string rejected before persistence; real contact/free-text/image inputs rejected |
| IDEMP-01..05 | double-click, lost response, retry, concurrent submit, changed-body key reuse; one request/transition; restart retains ledger |
| AUTH-01..05 | anonymous denial, foreign-request/image denial, scoped synthetic Operations positive/negative, cookie tamper/expiry, CSRF/Origin denial |
| IMAGE-01..05 | save 1–4, fifth/concurrent fifth denial, preview/save/refresh/reopen, failed-save retry, isolation/removal/decline cleanup including delayed stale callbacks |
| LOCALE-01..03 | th/en preference survives refresh, unsupported locale and missing-key whole-page fallback, no mixed-language or duplicate implementations |
| BOUNDARY-01..04 | zero non-loopback browser/server calls, no secrets in bundles/logs, no private fields in logs, production/service adapters absent |

Browser evidence covers the actual eight reusable families and all 38 route resolutions, plus the six category journeys, rather than claiming 38 independent implementations. HTTP contract tests cover strict payloads, error codes, authorization and concurrency. Logs contain case ID, synthetic request ID, state and error code only; no cookies, CSRF tokens, headers, payloads or contacts.

Package-native verification: the existing frozen install/build/typecheck/lint/test/boundary checks remain. UI-017 adds app contract/unit/browser scripts and CI jobs explicitly; their exact names must be documented when created. No claim that current foundation CI already supplies those tests. Update the route/governance manifest and architecture documentation with changed behavior. No deployment or hosted preview is required to approve this pre-code specification or test a loopback prototype.

Lovable receives versioned route/template/DTO/state/locale contracts, sample synthetic fixtures, and loading/error/empty/unauthorized/pending matrices. It may implement layouts, navigation, responsive components, reception/forms and consent UX. It must not add backend fields, alter semantics, bypass consent, invent success/availability, grant roles or connect services. A missing field returns `CONTRACT_GAP` with the proposed need; no UI-only substitute changes truth.

**Decision sequence:** Owner/Director confirms candidate path and isolated UI-017 proposal → Claude reviews this concrete pre-code contract and either returns applicable APPROVE_FOR_CODEX with path and governance-first specification, or REVISE/BLOCKED → Codex rechecks branch/HEAD/task collisions and reads required repo state → governance first → implementation → local/CI tests → commit/push/PR without merge → Lovable verification → Manus QA on exact HEAD → Claude final review → Director verdict. Pre-code approval is now present; actual implementation/test/CI evidence remains required.


# Approved amendments from Claude round 3


These provisions amend proposed-implementation-contract.md; other clauses remain unchanged.

1. **Edit invalidation:** every successful pre-review draft-details/contact edit resets consent to {state:unset,version:null,recorded_at:null,copy_status:REVIEW_REQUIRED} and notice to {version:null,acknowledged:false}. It removes committed images in the same durable transaction and increments revision; the UI also discards unsaved previews and in-flight restore callbacks. It returns draft for incomplete details and details_captured for complete minimum details. A no-op identical request with the same idempotency key replays its earlier response rather than applying another reset. Current-state authorization/state guards and the existing stale-response/refetch rules remain. New explicit consent and current notice acknowledgement are needed again before image saving/review. Add tests for accept → image save → edit → unset/no images, re-consent, declined → edit reset, delayed replay and post-review edit rejection.

2. **Fallback of fallback:** English is the complete required fallback resource for every route, field, status, validation error and consent/notice key. Schema/key completeness validation is a hard pre-build and CI gate, including keys that are used only on fallback/error paths. Missing English keys stop build/test and cannot silently render blank content. Missing a selected Thai page key falls the entire page back to validated English with its notice. Unexpected runtime resource corruption fails closed to a minimal content-unavailable error, not a partly mixed-language request form. This does not create an additional logical route/template family.

3. **CI scope:** keep repository-root pnpm build/typecheck/lint/test as aggregate commands across every workspace, including the prototype, and run them for the task's final local evidence. Preserve the ARCH-001 foundation workflow's original nine workspace coverage and boundary suite; explicitly exclude ONLY @lilith/concierge-prototype from the foundation workflow's Turbo build/typecheck/lint selection once the new workspace exists. No pre-existing check or workspace is removed. Add .github/workflows/ui-017-concierge-prototype.yml, a separate PR/non-production-branch workflow, running frozen install and the prototype's build/typecheck/lint/unit/contract/browser checks plus the shared boundary regression tests. Browser tests start a loopback server only and make no external application calls. Workspace selection is explicit and verified by dry-run task inventory: foundation retains all original workspaces; UI-017 contains the new app and its tooling needs. No deployment job, credentials, service account or production service is added. Prototype-runtime failures surface in its named job; shared boundary-rule failures still correctly fail the common guard tests.

4. **Import enforcement:** explicitly register apps/concierge-prototype in the shared boundary rule's workspace recognition; currently the apps/**/* lint glob sees its files but workspaceOf only recognizes web/worker. Add a self-only prototype runtime dependency entry and correct resolution for @lilith/concierge-prototype to this app if that alias is encountered. Runtime imports from prototype to shared core/db/ai/contracts/ui/i18n or the legacy static prototype are prohibited; so are imports from production workspaces into the prototype. Existing production dependency allowances remain unchanged. The prototype's domain/types/state/storage/UI stay app-private. Shared config/tooling may be consumed only by build/lint/test configuration, not by runtime modules. Enforce the rule for relative paths, aliases, static/dynamic imports, re-exports and require to the same coverage level as existing rules; unresolved computed imports fail closed. Add regression fixtures proving both directions of isolation. Server modules containing file storage, signing keys or session verification must not enter client bundles; enforce with server-only boundaries plus build/bundle checks. No access to unmerged ARCH-002 or other branches is introduced.

5. **ID/branch/ADR collision checks:** fresh GitHub GET on 2026-09-20 confirms five candidate branches with no feat/UI-017-lilith-connect-prototype; codex/lilith-prototype is still the approved base SHA. The complete immutable tree has 99 entries, truncated:false; no apps/concierge-prototype, UI-017 task path or ADR-0014 exists. Full handoff UI headings end at UI-016. Recheck remote branch names and the exact target tree immediately before creating the branch/documents. If anything now conflicts or base unexpectedly moves, stop and report the specific conflict; do not reuse an occupied ID, overwrite another branch, migrate source or silently change the approved base.


The scoped ARCH-001-only dependency exception and governance-first paths are approved in ADR-0014. Shared tooling edits are explicitly within scope. Base proof and actual reviewer note are in docs/governance/evidence. Approval is limited to implementation, tests and PR without merge.

## Implemented transport details

The public request DTO includes `images: [{id, image_fixture_id, mock_data:true}]` alongside `image_ids`; this maps committed request-bound attachment IDs to the already-approved shipped catalog. It is returned by the server and is not an extra user-input field. Mutations still accept only the documented strict payloads.

`GET /api/prototype/bootstrap` issues/recovers a synthetic session and returns CSRF token, locale and owned request IDs. `GET /api/prototype/locale` and idempotent `PUT /api/prototype/locale` persist the th/en preference; PUT requires literal mock_data:true, CSRF and the same-origin session. Request-bound image reads use `GET /requests/:id/images/:image_id` with ownership verification. Public geometric catalog assets contain no request data.

The store uses an exclusive startup guard during writer-lock acquisition. Normal shutdown removes its writer lock; an old dead-process writer lock can be reclaimed under the guard. A crash leaving `startup.lock` fails closed. Stop all processes using that exact store and verify none holds it before manually removing only that guard; never delete snapshot/key/ledger as an automatic recovery step. This preserves pending synthetic requests and idempotency evidence.
