# LILITH by THE MIDDLE — Architecture Blueprint
## Part 7 — Codex Implementation Handoff (Section 30)

---

# 30. Codex Implementation Handoff

## 30.0 How to use this document

**Rules for the implementing agent (Codex):**

1. Work **one task at a time**, in the order given by `IMPLEMENTATION_ORDER.md`. Do not start a task whose dependencies are not merged.
2. One task = one branch (`feat/<TASK-ID>-slug`) = one PR titled `<TASK-ID>: <goal>`.
3. A task is done only when **every acceptance criterion is demonstrably true** and the listed tests pass in CI. Not "implemented" — *verified*.
4. Files listed are the expected surface. Creating additional files is fine; touching files owned by another in-flight task is not.
5. If a task cannot be completed as specified, **stop and report** with: what was attempted, what blocked it, the proposed alternative, and its architectural consequence. Do not silently redesign.
6. Never weaken a database constraint, an authz check, or a test to make a task pass.
7. Every PR ends with the completion report: `STATUS / EVIDENCE / RISKS / BLOCKERS / NEXT / OWNER APPROVAL`.

**ID prefixes:** `ARCH` foundation · `DB` schema · `AUTH` identity · `API` endpoints · `MATCH` matching · `AI` Lilith · `DEAL` deal machine · `FEE` billing · `UI` screens · `SEC` security · `OPS` observability/deploy · `QA` testing · `ADMIN` backoffice.

---

## PHASE 0 — Foundation

### ARCH-001 — Monorepo scaffold
- **Goal:** working pnpm + Turborepo monorepo with the package layout of §19 and enforced import boundaries.
- **Files:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `apps/web/*`, `apps/worker/*`, `packages/{contracts,core,db,ai,ui,i18n,config}/package.json`, `packages/config/eslint.config.js`, `tsconfig.base.json`.
- **Dependencies:** —
- **Acceptance:** `pnpm install && pnpm build && pnpm typecheck && pnpm lint` all pass. An import of `@prisma/client` from `apps/web/src/app/api/**` fails lint. An import of `next` from `packages/core/**` fails lint.
- **Tests:** `packages/config/__tests__/boundaries.test.ts` — asserts each forbidden import produces a lint error.

### ARCH-002 — Shared kernel
- **Goal:** `Result`, `DomainError`, `ActorContext`, `Money`, id generation, injectable `Clock`.
- **Files:** `packages/core/shared/{result.ts,errors.ts,actor.ts,money.ts,ids.ts,clock.ts}`.
- **Dependencies:** ARCH-001
- **Acceptance:** `Money` uses `bigint` only; `Money.fromBaht('12500.50') → 1250050n`; formatting round-trips; `Clock` is injectable so tests never touch `Date.now()` directly.
- **Tests:** unit + fast-check property test: `fromBaht(format(x)) === x` for 10k random values.

### ARCH-003 — Contracts package + error envelope
- **Goal:** zod DTO schemas, canonical error codes, event registry, OpenAPI generator.
- **Files:** `packages/contracts/src/{dto/*,errors.ts,events.ts,openapi.ts}`.
- **Dependencies:** ARCH-002
- **Acceptance:** `pnpm contracts:openapi` emits a valid OpenAPI 3.1 document; every error code in §18.0 exists; `trackEvent('not_registered')` is a TypeScript error.
- **Tests:** schema round-trip tests; OpenAPI validated with `@redocly/cli lint`.

### ARCH-004 — Database package + local dev stack
- **Goal:** Postgres 16 + PostGIS + pgvector in Docker; Prisma configured; RLS-aware client wrapper.
- **Files:** `docker-compose.yml`, `packages/db/{prisma/schema.prisma,client.ts,migrations/0001_extensions.sql}`.
- **Dependencies:** ARCH-001
- **Acceptance:** `docker compose up` then `pnpm db:migrate` succeeds; `client.withActor(userId, fn)` sets `app.user_id` via `SET LOCAL` inside a transaction; extensions `postgis`, `pgcrypto`, `pg_trgm`, `vector`, `citext` installed.
- **Tests:** integration test asserts `current_setting('app.user_id')` is correct inside `withActor` and cleared outside.

### ARCH-005 — CI pipeline
- **Goal:** GitHub Actions running typecheck, lint, unit, integration (Testcontainers), migration dry-run, env check, bundle budget.
- **Files:** `.github/workflows/ci.yml`, `scripts/{env-check.ts,bundle-budget.ts}`.
- **Dependencies:** ARCH-001, ARCH-004
- **Acceptance:** PR with a missing `.env.example` key fails; PR exceeding the `(app)` bundle budget fails; full pipeline < 10 minutes.
- **Tests:** the pipeline itself, proven by a deliberately failing sample PR.

---

## PHASE 1 — Data model

### DB-001 — Identity, roles, sessions, OTP
- **Goal:** tables of §8.2.1 with constraints and indexes.
- **Files:** `packages/db/prisma/schema.prisma`, `migrations/0002_identity.sql`.
- **Dependencies:** ARCH-004
- **Acceptance:** every constraint in §8.2.1 exists in the migration (phone/email check, partial uniques, role unique-while-active); `updated_at` trigger applied to all tables.
- **Tests:** integration — duplicate active phone rejected; a soft-deleted user's phone can be reused; role uniqueness holds only while `revoked_at IS NULL`.

### DB-002 — Verification, documents & consents
- **Files:** `migrations/0003_verification.sql`
- **Dependencies:** DB-001
- **Acceptance:** `verification_records` supports all subject types; `documents.classification` defaults to `SENSITIVE` for verification uploads; admin queue index exists; `consents (user_id, purpose, version, granted_at, revoked_at, ip, evidence)` and `deletion_requests` created per §15.1/§8.3.
- **Tests:** tier recomputation from approved records yields T0→T4 correctly across 12 cases.

### DB-003 — Geo: locations, transit stations, property_transit
- **Files:** `migrations/0004_geo.sql`, `packages/db/seed/{locations.ts,stations.ts}`
- **Dependencies:** ARCH-004
- **Acceptance:** BTS/MRT stations On Nut→Ari seeded with real coordinates; GIST indexes present; `nearestStations(point, 1500)` returns correct ordering.
- **Tests:** known-distance assertions (Thong Lo station → a fixed test point, ±50 m).

### DB-004 — Properties, units, media, documents, amenities, mandates
- **Files:** `migrations/0005_property.sql`, `packages/db/seed/amenities.ts`
- **Dependencies:** DB-001, DB-003
- **Acceptance:** all CHECK constraints of §8.2.3 present, **including** the publish guard (`status<>'PUBLISHED' OR completion_score>=70`) and the sale-price/rent-price consistency checks; partial unique index for a single cover photo; partial unique for one active exclusive mandate.
- **Tests:** integration — publishing an incomplete property fails **at the database level**; two active exclusive mandates rejected; two cover photos rejected.

### DB-005 — Requirements & preferences
- **Files:** `migrations/0006_requirement.sql`
- **Dependencies:** DB-001, DB-003
- **Acceptance:** budget/date ordering checks; GIN index on `location_ids`; hnsw index on `embedding`.
- **Tests:** invalid budget range rejected; array containment query uses the GIN index (`EXPLAIN` assertion).

### DB-006 — Matching tables
- **Files:** `migrations/0007_matching.sql`
- **Dependencies:** DB-004, DB-005
- **Acceptance:** `matches` unique on `(requirement_id, property_id)`; feed indexes present; `match_scores` retains history (no unique on match_id); `interests` unique per side while not deleted.
- **Tests:** duplicate match insert rejected; two concurrent interests on the same side produce one row.

### DB-007 — Deal, participants, transitions, messaging, viewings, offers, agreements
- **Files:** `migrations/0008_deal.sql`
- **Dependencies:** DB-006
- **Acceptance:** `deal_transitions` append-only trigger raises on UPDATE/DELETE; a trigger on `deals` raises when `status` changes without a same-transaction transition row; `messages.seq` monotonic per room.
- **Tests:** integration — direct `UPDATE deals SET status` raises; transition via the proper path succeeds; message seq strictly increasing under concurrent inserts.

### DB-008 — Billing: fee_rules, fees, invoices, payments, receipts
- **Files:** `migrations/0009_billing.sql`, `packages/db/seed/fee-rules.ts`
- **Dependencies:** DB-007
- **Acceptance:** seed inserts `middle_success_fee@1` with `rate_bp=10`; invoice number sequence gapless; one non-void fee per deal enforced by partial unique.
- **Tests:** concurrent invoice issuance produces no duplicate or skipped numbers (100 parallel inserts).

### DB-009 — AI runs, prompt versions, events, outbox, audit, notifications
- **Files:** `migrations/0010_platform.sql`
- **Dependencies:** DB-001
- **Acceptance:** `audit_logs` append-only trigger; `events` partitioned monthly with an automatic partition-creation job; `outbox` partial index on unprocessed rows; `feature_flags`, `job_failures`, `pending_admin_actions`, `moderation_queue`, `reports`, `trust_scores`, `disputes` created per §8.2.8/§17.2.
- **Tests:** audit UPDATE raises; next-month partition auto-created; outbox claim query uses the partial index.

### DB-010 — Row Level Security policies
- **Files:** `migrations/0011_rls.sql`
- **Dependencies:** DB-007, DB-009
- **Acceptance:** RLS enabled on `deal_rooms, deals, messages, offers, viewings, deal_participants, property_documents, documents`; a non-participant connection returns zero rows for another user's deal even with a raw `SELECT *`; the admin role bypasses.
- **Tests:** RLS test suite — for each protected table, participant sees, non-participant does not, admin role does.

### DB-011 — Seed world
- **Goal:** deterministic development dataset.
- **Files:** `packages/db/seed/{index.ts,properties.ts,requirements.ts,users.ts}`
- **Dependencies:** DB-004, DB-005, DB-008
- **Acceptance:** `pnpm db:seed` creates 3 areas, 24 stations, 60 properties, 20 requirements, 12 users covering every role/tier; re-running is idempotent.
- **Tests:** seed twice → identical row counts and identical ids (fixed UUID namespace).

---

## PHASE 2 — Identity & access

### AUTH-001 — OTP request/verify + sessions
- **Files:** `packages/core/identity/{service.ts,otp.ts,session.ts,repository.ts}`, `apps/web/src/app/api/auth/otp/{request,verify}/route.ts`
- **Dependencies:** DB-001, ARCH-003
- **Acceptance:** codes hashed (bcrypt cost 12), 5-min TTL, max 5 attempts, rate limits of §7.6 enforced; response identical for existing and non-existing numbers; session cookie flags exactly as §14.1; `next_step` computed server-side.
- **Tests:** unit (code generation/compare, timing-safe), integration (rate limit, attempt lockout, replay of a consumed code fails), contract test on both routes.

### AUTH-002 — ActorContext resolution + `authorize()`
- **Files:** `packages/core/authz/{policies.ts,matrix.ts,authorize.ts}`, `apps/web/src/lib/actor.ts`
- **Dependencies:** AUTH-001, DB-002
- **Acceptance:** `authorize(ctx, op, resource)` implements L1 role + L2 ownership + L3 tier; the full matrix of §14.3 is a data table used by both runtime and tests.
- **Tests:** table-driven test over every `(role, tier, operation, ownership)` combination — must be exhaustive, not sampled.

### AUTH-003 — CI guard: every mutating route calls `authorize`
- **Files:** `scripts/authz-lint.ts`, wired into `ci.yml`
- **Dependencies:** AUTH-002
- **Acceptance:** an AST scan of `apps/web/src/app/api/**/route.ts` fails the build if a `POST/PATCH/PUT/DELETE` handler has no `authorize(` call or an explicit `// authz: public` annotation.
- **Tests:** fixture route without authorize → script exits non-zero.

### AUTH-004 — Profile, roles, sessions, trust endpoints
- **Files:** `apps/web/src/app/api/me/**`
- **Dependencies:** AUTH-002
- **Acceptance:** endpoints of §18.1 implemented; role addition is additive-only; session list/revoke works; `/api/me/trust` returns tier + verifications + response stats.
- **Tests:** contract tests; IDOR test (user A cannot revoke user B's session).

### SEC-001 — Column encryption + blind index
- **Files:** `packages/db/crypto.ts`, `migrations/0012_encrypted_columns.sql`
- **Dependencies:** DB-001
- **Acceptance:** `national_id`, `tax_id`, `licence_no`, `line_id`, `payout_method` stored encrypted (AES-256-GCM); `phone_e164` searchable via HMAC blind index; key rotation supported via `ENCRYPTION_KEY_PREVIOUS`.
- **Tests:** round-trip encrypt/decrypt; rotation test decrypts old and new; raw table read shows ciphertext.

### SEC-002 — Uploads: presign, verify, EXIF strip, virus scan
- **Files:** `packages/core/documents/*`, `apps/web/src/app/api/uploads/**`, `apps/worker/src/jobs/media.process.ts`
- **Dependencies:** AUTH-002
- **Acceptance:** presigned PUT with size/MIME limits; post-upload magic-byte validation; images re-encoded with **GPS EXIF removed**; documents unreadable until `virus_scanned_at` is set; signed-URL issuance writes a `document.read` audit row.
- **Tests:** upload a JPEG with GPS EXIF → stored file has none; a `.exe` renamed to `.jpg` is rejected; unscanned document URL request returns 403.

---

## PHASE 3 — Supply & demand

### API-001 — Property CRUD + wizard steps
- **Files:** `packages/core/property/*`, `apps/web/src/app/api/properties/**`
- **Dependencies:** DB-004, AUTH-002, SEC-002
- **Acceptance:** endpoints of §18.4; `completion_score` and `missing_for_publish` computed server-side; `If-Match` version conflicts return 409; `PropertyPublicDTO` and `PropertyPrivateDTO` are separate types.
- **Tests:** contract tests; **serialiser snapshot test proving the public DTO has no address/unit/contact/document fields**; concurrent PATCH → one 409.

### API-002 — Property publish guard
- **Files:** `packages/core/property/publish.ts`
- **Dependencies:** API-001, DB-002
- **Acceptance:** publish requires T2 (T4 or `ownership_verified` for SALE), `completion_score ≥ 70`, ≥3 photos incl. a cover, price consistent with transaction types; emits `property_published` domain + analytics events; enqueues `match.generate.property`.
- **Tests:** 8 rejection cases each returning the correct code and field errors; success path asserts both events and the job enqueue.

### API-003 — Requirement CRUD + activate
- **Files:** `packages/core/requirement/*`, `apps/web/src/app/api/requirements/**`
- **Dependencies:** DB-005, AUTH-002
- **Acceptance:** endpoints of §18.5; activation enqueues `match.generate.requirement`; `MAX_ACTIVE_REQUIREMENTS_PER_CLIENT` enforced; agent-on-behalf-of requires an active management consent.
- **Tests:** contract tests; agent without consent → 403; quota exceeded → 422.

### API-004 — Geo & amenity endpoints
- **Files:** `packages/core/geo/*`, `apps/web/src/app/api/geo/**`, `api/amenities/route.ts`
- **Dependencies:** DB-003
- **Acceptance:** Thai and English search both work (trigram + exact); `property_transit` recomputed whenever a property's location changes; amenities cached 24h.
- **Tests:** `"ทองหล่อ"` and `"thong lo"` both return the same location; moving a property recomputes its transit rows.

---

## PHASE 4 — Matching engine

### MATCH-001 — Normalisation layer
- **Goal:** map DB rows into `NormalizedRequirement` / `NormalizedProperty` scoring views.
- **Files:** `packages/core/matching/normalize.ts`
- **Dependencies:** API-001, API-003
- **Acceptance:** the scoring view contains only the fields used by scoring; the same input always yields the same canonical JSON (key order stable) so `inputs_hash` is deterministic.
- **Tests:** canonical JSON stability across 1,000 permutations of key insertion order.

### MATCH-002 — Dimension scoring functions
- **Files:** `packages/core/matching/dimensions.ts`
- **Dependencies:** MATCH-001
- **Acceptance:** all 12 functions of §9.4 implemented exactly; each returns `[0,1]` or `null`; **no I/O in the file**.
- **Tests:** per-dimension table tests with the worked values from §9.4; property tests for bounds and budget monotonicity; a lint rule asserts the file imports nothing with side effects.

### MATCH-003 — Weight profiles & rules engine
- **Files:** `packages/core/matching/{profiles.ts,rules.ts,dsl.ts}`, `packages/db/seed/weight-profiles.ts`
- **Dependencies:** DB-006
- **Acceptance:** `default_rent_v1` and `default_sale_v1` seeded exactly as §9.5; the rule DSL supports comparison/logic/`in`/date ops and **cannot execute arbitrary code**; unknown operators are rejected at parse time.
- **Tests:** DSL fuzz test asserting no code execution path; hard/disqualify rules H1–H8, D1–D7 each covered.

### MATCH-004 — `scoreMatch()` aggregation, modifiers, confidence
- **Files:** `packages/core/matching/score.ts`
- **Dependencies:** MATCH-002, MATCH-003
- **Acceptance:** implements §9.6 exactly, including weight redistribution for null dimensions, modifier clamping to ±12, and `inputs_hash`.
- **Tests:** **all six matching invariants of §22.2**; golden fixture file with 30 hand-verified score expectations; ≥95% branch coverage on this file.

### MATCH-005 — Candidate generation SQL
- **Files:** `packages/core/matching/candidates.sql`, `repository.ts`
- **Dependencies:** MATCH-003, DB-011
- **Acceptance:** query of §9.8; returns ≤500 rows; p95 ≤80 ms on a 100k-property benchmark dataset.
- **Tests:** `pnpm bench:match` fails the build above 80 ms p95; correctness test asserts no candidate violates H1–H8.

### MATCH-006 — Reason assembly + i18n templates
- **Files:** `packages/core/matching/reasons.ts`, `packages/i18n/reasons.{th,en}.ts`
- **Dependencies:** MATCH-004
- **Acceptance:** produces `matched/tradeoffs/unmatched` per §9.7 with both languages populated from templates; no reason text is ever produced by an LLM in this path.
- **Tests:** every reason code has th+en templates (exhaustive test over the code enum); parameter interpolation correct.

### MATCH-007 — Match generation jobs
- **Files:** `apps/worker/src/jobs/{match.generate.requirement.ts,match.generate.property.ts,match.rescore.batch.ts}`
- **Dependencies:** MATCH-005, MATCH-006, DB-006
- **Acceptance:** generates/updates `matches`, `match_scores`, `match_reasons` transactionally, emits `match_generated`; idempotent — rerunning does not duplicate matches; suppresses below `show_min_score`.
- **Tests:** run twice → same match count, second `match_scores` row appended (history preserved); disqualified pairs recorded as `SUPPRESSED` with a reason.

### MATCH-008 — Feed API with serving policy
- **Files:** `apps/web/src/app/api/matches/feed/route.ts`, `packages/core/matching/feed.ts`
- **Dependencies:** MATCH-007
- **Acceptance:** §18.6 contract; serving policy of §9.9 applied; cursor pagination stable under concurrent inserts; 90s cache invalidated by any interest action; p95 ≤400 ms.
- **Tests:** contract test; diversity rule verified (no more than 2 units from one project in the first 10); load test at 50 rps.

### MATCH-009 — Interest / pass / super match
- **Files:** `packages/core/interest/*`, `apps/web/src/app/api/matches/[id]/{interest,pass}/route.ts`
- **Dependencies:** MATCH-008, DB-006
- **Acceptance:** one decision per side; mutual detection is race-safe (unique index, not a read-then-write); super-match quota enforced; emits `interest_expressed`, `match_mutual`; on mutual, opens the deal room atomically.
- **Tests:** 50 concurrent interest calls from both sides produce exactly one mutual and one deal room; quota exhaustion returns 429 with `resets_at`.

---

## PHASE 5 — Lilith AI

### AI-001 — LilithClient abstraction + ai_runs
- **Files:** `packages/ai/{client.ts,providers/openai.ts,providers/mock.ts,runs.ts}`
- **Dependencies:** DB-009
- **Acceptance:** provider-agnostic interface; every call writes an `ai_runs` row with model, prompt version, tokens, cost, latency, status; `AI_PROVIDER=mock` returns deterministic fixtures.
- **Tests:** a failed provider call still writes an `ai_runs` row with `status='ERROR'`; cost calculation verified against a known token count.

### AI-002 — Guardrails: redaction, schema validation, timeout, retry, budget
- **Files:** `packages/ai/guard/{redact.ts,schema.ts,budget.ts,timeout.ts}`
- **Dependencies:** AI-001
- **Acceptance:** `redact()` removes Thai and international phone formats, emails, LINE IDs, national IDs, unit numbers; schema failure triggers one repair retry then the fallback; budget ceilings enforced per user/org; timeouts per §20.
- **Tests:** fuzz test over 500 generated PII strings (`08x-xxx-xxxx`, `+66 8x xxx xxxx`, `๐๘๑…` Thai numerals) → zero leaks; malformed JSON → fallback, never a 500.

### AI-003 — Prompt version registry
- **Files:** `packages/ai/prompts/*`, `packages/db/seed/prompt-versions.ts`, `apps/web/src/app/admin/api/prompt-versions/**`
- **Dependencies:** AI-001
- **Acceptance:** exactly one ACTIVE version per task code (partial unique); activation requires a passing eval report; rollback restores the previous version.
- **Tests:** two ACTIVE versions for one task rejected by the database; activation without an eval report returns 422.

### AI-004 — `extract_property` + `extract_requirement`
- **Files:** `packages/ai/tasks/{extract-property.ts,extract-requirement.ts}`, routes in `api/ai/**`
- **Dependencies:** AI-002, AI-003
- **Acceptance:** output schema-validated with per-field confidence; deterministic regex fallback implemented; every field carries `source: 'AI'`; override endpoint flips it to `HUMAN` and records `human_decision`.
- **Tests:** golden set of 50 Thai descriptions with field-level F1 reported; with `AI_ENABLED=false` the fallback still fills bedrooms/size/price on ≥50% of the set.

### AI-005 — `normalize` with dictionary-first strategy
- **Files:** `packages/ai/tasks/normalize.ts`, `packages/db/migrations/0013_aliases.sql`
- **Dependencies:** AI-002
- **Acceptance:** the alias table is consulted before the model; accepted AI normalisations are written back with `source='AI'` and a review flag; repeated inputs never call the model twice.
- **Tests:** the second call for the same input performs zero provider calls (spy assertion).

### AI-006 — `explain_match` with numeric containment guard
- **Files:** `packages/ai/tasks/explain-match.ts`
- **Dependencies:** AI-002, MATCH-006
- **Acceptance:** output ≤60 words per language; a numeric token not present in the input rejects the output and falls back to the template.
- **Tests:** an injected hallucinated number is caught; fallback path renders valid text in both languages.

### AI-007 — `detect_duplicate` pipeline
- **Files:** `packages/ai/tasks/detect-duplicate.ts`, `packages/core/property/duplicate.ts`, `apps/worker/src/jobs/ai.duplicate.ts`
- **Dependencies:** AI-002, API-002
- **Acceptance:** deterministic pre-filter (same project + unit number, pHash, trigram) runs first; AI only adjudicates 0.75–0.92 similarity; `confidence ≥ 0.9` auto-flags into `moderation_queue`; **never auto-deletes or unpublishes**.
- **Tests:** exact-duplicate pair detected with zero AI calls; near-duplicate reaches the queue; a distinct property is not flagged.

### AI-008 — Embeddings pipeline
- **Files:** `apps/worker/src/jobs/ai.embed.ts`
- **Dependencies:** AI-001, DB-004, DB-005
- **Acceptance:** embeddings generated on publish/activate and on material edits; stored in pgvector; the `special_requirements` dimension returns `null` when either embedding is missing (never 0).
- **Tests:** missing-embedding case lowers confidence and redistributes weight (asserted through `scoreMatch`).

### AI-009 — Eval harness
- **Files:** `packages/ai/evals/{index.ts,golden/*.json}`, `pnpm ai:eval`
- **Dependencies:** AI-004
- **Acceptance:** reports per-field precision/recall/F1 per prompt version; blocks activation on a >2-point F1 regression.
- **Tests:** a deliberately degraded prompt version fails activation.

---

## PHASE 6 — Deal machine

### DEAL-001 — Transition table + `transition()`
- **Files:** `packages/core/deal/{state-machine.ts,transition.ts,repository.ts}`
- **Dependencies:** DB-007, AUTH-002
- **Acceptance:** all 17 transitions of §11.2 encoded with actor rules, payload schemas and guards; writes deal + transition + outbox + audit in one transaction with optimistic locking; idempotent on `Idempotency-Key`.
- **Tests:** invariants 7–11 of §22.2; a test asserts the transition table matches the FSM diagram (parsed from the doc fixture).

### DEAL-002 — Deal room opening & contact disclosure
- **Files:** `packages/core/deal/open-room.ts`
- **Dependencies:** DEAL-001, MATCH-009
- **Acceptance:** creates `deal_rooms` + `deal_participants` with correct roles and `can_negotiate`/`can_close` flags; contact fields appear in `DealDTO` only from this point and only for participants; emits `deal_room.opened` and `contact.disclosed`.
- **Tests:** non-participant read → 403 at the API **and** zero rows at the RLS level; contact absent before opening.

### DEAL-003 — Messaging + SSE
- **Files:** `packages/core/messaging/*`, `apps/web/src/app/api/deals/[id]/{messages,stream}/route.ts`, `apps/web/src/lib/sse.ts`
- **Dependencies:** DEAL-002
- **Acceptance:** participant-only; monotonic `seq`; `LISTEN/NOTIFY` → SSE with 25s heartbeat and reconnect; polling fallback with `?since=`; system messages written on every transition.
- **Tests:** two clients, one sends → other receives <800 ms; reconnect after a forced drop loses no message; non-participant SSE connection rejected.

### DEAL-004 — Contact masking policy
- **Files:** `packages/core/messaging/contact-guard.ts`
- **Dependencies:** DEAL-003
- **Acceptance:** phone/email/LINE patterns (incl. Thai numerals and spaced/obfuscated forms) masked before `VIEWING_CONFIRMED`; behaviour controlled by a DB feature flag; masked messages show an explanatory notice.
- **Tests:** 40 obfuscation variants; flag off → no masking; after viewing confirmed → no masking.

### DEAL-005 — Viewings
- **Files:** `packages/core/viewing/*`, routes under `api/deals/[id]/viewings/**`
- **Dependencies:** DEAL-001
- **Acceptance:** request with ≥1 slot; **only the counterparty may confirm**; reschedule >2h before start; complete only after `scheduled_at`; auto no-show at +24h; `.ics` attached to the confirmation email.
- **Tests:** requester confirming their own viewing → 403; confirming a past slot → 422; no-show job transitions correctly.

### DEAL-006 — Offers & negotiation
- **Files:** `packages/core/negotiation/*`, routes under `api/deals/[id]/offers/**`
- **Dependencies:** DEAL-001
- **Acceptance:** sequence numbers gapless per deal; only the opposite side may counter; `expires_at` enforced by a job; accept moves the deal to `AGREEMENT_PENDING`; round limit 20.
- **Tests:** same-side counter → 403; expired offer accept → 409; concurrent counters → one 409.

### DEAL-007 — Agreements & signing
- **Files:** `packages/core/negotiation/agreement.ts`
- **Dependencies:** DEAL-006, SEC-002
- **Acceptance:** agreement document upload; per-signer records; `AGREEMENT_SIGNED` only when all required signers have signed; documents visible to participants only.
- **Tests:** partial signing keeps `AGREEMENT_PENDING`; a non-signer's signature attempt → 403.

### DEAL-008 — Dual-confirm close
- **Files:** `packages/core/deal/close.ts`
- **Dependencies:** DEAL-007
- **Acceptance:** both sides submit `transaction_value_amount` independently; equal values → `DEAL_CLOSED` + `fee.generate` enqueued; mismatch → `CLOSE_VALUE_MISMATCH` and a `FEE_DISPUTE` moderation item; 30-day confirmation window.
- **Tests:** mismatch path creates the queue item and does not close; matching path emits exactly one `deal.closed` and one fee job.

### DEAL-009 — Deal timers job
- **Files:** `apps/worker/src/jobs/deal.timers.ts`
- **Dependencies:** DEAL-001
- **Acceptance:** all six timers of §11.3 implemented; every automatic transition is recorded with `actor='SYSTEM'` and a reason.
- **Tests:** clock-injected tests for each timer boundary (just before / just after).

---

## PHASE 7 — Money

### FEE-001 — Fee engine (pure)
- **Files:** `packages/core/billing/fee-engine.ts`
- **Dependencies:** ARCH-002, DB-008
- **Acceptance:** implements §13.1–13.3; basis resolution for all four types; half-up rounding applied once; min/max clamps; split resolution; **no I/O in the file**.
- **Tests:** money invariants 12–13 of §22.2; the worked example produces exactly ฿12,500 fee + ฿875 VAT; 10k-case property test on splits.

### FEE-002 — Fee generation job + rule selection
- **Files:** `apps/worker/src/jobs/fee.generate.ts`, `packages/core/billing/rule-select.ts`
- **Dependencies:** FEE-001, DEAL-008
- **Acceptance:** selects the applicable rule by scope + effective date; persists `fees` with the **full rule snapshot**; exactly one non-void fee per deal; emits `fee_generated`.
- **Tests:** invariants 14–15; changing the rule afterwards leaves the existing fee row byte-identical.

### FEE-003 — Invoicing + PDF
- **Files:** `packages/core/billing/invoice.ts`, `apps/worker/src/jobs/invoice.render.ts`
- **Dependencies:** FEE-002
- **Acceptance:** gapless `MP-INV-YYYY-NNNNNN`; tax details snapshotted; PDF rendered to the private bucket; Thai + English layout; delivered by email and notification.
- **Tests:** invariant 16 (100 concurrent issuances); PDF contains the correct amounts (text extraction assertion).

### FEE-004 — Payments & receipts (manual flow)
- **Files:** `packages/core/billing/payment.ts`, routes + `admin/api/payments/**`
- **Dependencies:** FEE-003
- **Acceptance:** payer uploads slip evidence; operator confirms (audited); partial payments supported; receipt issued on full settlement with gapless numbering.
- **Tests:** partial → `PARTIALLY_PAID`; over-payment rejected; confirmation without evidence blocked above the configured threshold.

### FEE-005 — Nightly reconciliation
- **Files:** `apps/worker/src/jobs/reconcile.daily.ts`, `admin/api/reconciliation/**`
- **Dependencies:** FEE-004
- **Acceptance:** asserts fees↔invoices↔payments consistency; any drift creates an alert and an admin queue item; report visible in the backoffice.
- **Tests:** an injected inconsistency is detected and reported with the offending ids.

---

## PHASE 8 — Screens

> UI tasks assume the API is merged. Each UI task must implement all five screen states (§5.3) and both languages.

### UI-001 — Design system & tokens
- **Files:** `packages/ui/{tokens.css,primitives/*}`, `apps/web/src/app/globals.css`, Tailwind preset
- **Dependencies:** ARCH-001
- **Acceptance:** palette and type of §5.4 implemented as tokens; primitives (Button, Field, Sheet, Chip, ScoreRing, Card, Dialog, Toast) built and documented; contrast audit passes AA; **no gradient/glow/neon anywhere**.
- **Tests:** contrast test over every token pair used for text; visual snapshot of the primitive gallery.

### UI-002 — App shell, tab navigation, role context, i18n
- **Files:** `apps/web/src/app/(app)/layout.tsx`, `src/lib/{session,i18n}`
- **Dependencies:** UI-001, AUTH-004
- **Acceptance:** 5-tab shell; role-aware `+` action sheet; Thai default with an English switch; no layout shift between languages; deep links restore after login.
- **Tests:** e2e language toggle on 5 screens; deep-link-after-login test.

### UI-003 — Screens 01–06 (entry & identity)
- **Dependencies:** UI-002, AUTH-001
- **Acceptance:** OTP screen with resend timer, paste support, error states; the server's `next_step` drives navigation; role selection is additive.
- **Tests:** e2e J1 signup segment; wrong code, expired code, rate-limited states all render.

### UI-004 — Screens 07, 14 (dashboards)
- **Dependencies:** UI-002, API-001, API-003
- **Acceptance:** owner sees listings + incoming interest + deals; agent sees requirements + pipeline + response stats; empty states guide the first action.
- **Tests:** empty, loading, error and populated snapshots for each role.

### UI-005 — Screens 08–12 (property wizard)
- **Dependencies:** UI-002, API-001, SEC-002
- **Acceptance:** 5 resumable steps with localStorage drafts; live `completion_score`; media upload with progress, reorder, cover selection; document upload separated and marked private.
- **Tests:** e2e resume after reload mid-wizard; upload failure retry.

### UI-006 — Screen 13 (Lilith property review)
- **Dependencies:** UI-005, AI-004, AI-007
- **Acceptance:** shows AI suggestions with confidence badges and per-field accept/edit; duplicate warnings; publish blocked with clear reasons when incomplete; **renders a working non-AI variant when `AI_ENABLED=false`**.
- **Tests:** e2e with AI on and off; override recorded in `ai_runs`.

### UI-007 — Screens 15–18 (requirement wizard + summary)
- **Dependencies:** UI-002, API-003, AI-004
- **Acceptance:** free-text entry offers AI extraction; extracted fields are editable and marked; ambiguity questions surfaced; activation shows the expected match count.
- **Tests:** e2e J2 segment; AI-off path completes manually.

### UI-008 — Screen 19–24 (discover deck + actions)
- **Dependencies:** UI-002, MATCH-008, MATCH-009
- **Acceptance:** editorial deck per §5.4 (explicit buttons + drag with reason preview); score ring and three reason chips; optimistic swipe with server reconciliation and offline buffering; super-match quota surfaced.
- **Tests:** e2e swipe sequence; offline buffer flush test; keyboard-only operation.

### UI-009 — Screen 20, 21 (property detail, why this match)
- **Dependencies:** UI-008, MATCH-006
- **Acceptance:** detail shows only public fields; "Why this match" shows matched/tradeoff/unmatched groups plus the AI paragraph clearly attributed with confidence; template fallback identical in structure.
- **Tests:** DTO leak test at the UI level (no contact/address rendered); AI-off variant renders.

### UI-010 — Screen 25, 26 (it's a match, match inbox)
- **Dependencies:** UI-008, DEAL-002
- **Acceptance:** match celebration is elegant, not confetti; leads directly into the deal room; inbox filters by status and side.
- **Tests:** e2e J3 segment.

### UI-011 — Screen 27, 28, 32 (deal room, assistant, timeline)
- **Dependencies:** DEAL-003, DEAL-001
- **Acceptance:** live messages via SSE; action buttons rendered **only** from `allowed_transitions`; timeline merges transitions, messages, viewings, offers; assistant panel with open items and suggested actions as real buttons.
- **Tests:** e2e two-browser messaging; a forbidden action never appears in the UI for the wrong actor.

### UI-012 — Screens 29, 30 (viewing scheduling)
- **Dependencies:** DEAL-005
- **Acceptance:** slot proposal UI, counterparty confirmation, calendar file download, reminders visible; timezone always Asia/Bangkok.
- **Tests:** e2e J4.

### UI-013 — Screen 31 (offer / negotiation)
- **Dependencies:** DEAL-006
- **Acceptance:** structured offer form with terms; offer history thread; expiry countdown; counter/accept/reject flows; amounts formatted in baht from satang.
- **Tests:** e2e J5; formatting test across amounts from ฿1 to ฿999,999,999.

### UI-014 — Screens 33, 34, 35 (close, fee, receipt)
- **Dependencies:** DEAL-008, FEE-003, FEE-004
- **Acceptance:** dual-confirm close with an explicit value entry and a warning that the value drives the fee; fee breakdown showing basis, rate, VAT, total; invoice/receipt download; payment slip upload.
- **Tests:** e2e J6 end-to-end; mismatch path shows the support message.

### UI-015 — Screens 36, 37, 38 (insights, notifications, trust center)
- **Dependencies:** API-004, AUTH-004
- **Acceptance:** insights panels with suppression notice when the sample is small; notification list with filters and preferences; trust center showing tier, verifications, sessions, consents, data export and deletion.
- **Tests:** suppression renders when sample <10; export request creates the job.

### UI-016 — Error, offline and unauthorized surfaces
- **Dependencies:** UI-002
- **Acceptance:** every error screen shows the `request_id`; offline banner; 403 screen explains the missing tier and links to verification.
- **Tests:** simulated offline and 403 on 5 routes.

---

## PHASE 9 — Admin & operations

### ADMIN-001 — Admin shell + role separation + MFA
- **Files:** `apps/web/src/app/admin/**`, `packages/core/admin/*`
- **Dependencies:** AUTH-002
- **Acceptance:** four admin roles (SUPPORT/OPERATOR/FINANCE/SUPER_ADMIN); TOTP required; middleware blocks non-admins; every admin action requires reason text where destructive.
- **Tests:** role matrix test; admin without MFA blocked.

### ADMIN-002 — Verification, listing, duplicate, fraud queues
- **Dependencies:** ADMIN-001, DB-002, AI-007
- **Acceptance:** queues with SLA timers, assignment, decisions with reasons; decisions recompute tier / property status and emit events.
- **Tests:** approve → tier changes and notification sent; reject → reason stored and surfaced to the user.

### ADMIN-003 — Deal support, disputes, force transition
- **Dependencies:** ADMIN-001, DEAL-001
- **Acceptance:** read-only deal view; joining a room as `ADMIN_SUPPORT` posts a visible system message; force transition requires a reason and is audited; impersonation is read-only and time-boxed.
- **Tests:** force transition audited with before/after; impersonation cannot perform writes.

### ADMIN-004 — Weight profile editor + shadow scoring
- **Dependencies:** MATCH-004, ADMIN-001
- **Acceptance:** draft editing, shadow score over N historical matches, diff report (delta histogram, top-10 churn), publish with reason, one-click rollback; publishing enqueues rescoring.
- **Tests:** shadow scoring does not mutate live matches; rollback restores the previous active profile.

### ADMIN-005 — Fee rules, invoices, waivers with dual control
- **Dependencies:** FEE-004, ADMIN-001
- **Acceptance:** rule versioning with effective dates and a preview against historical deals; waiver/void require a second admin approval; all audited.
- **Tests:** single-admin waiver blocked; second approval completes it.

### ADMIN-006 — Audit search + user timeline
- **Dependencies:** DB-009
- **Acceptance:** search by actor/subject/action/date; CSV export; `/admin/api/users/:id/timeline` merges audit, domain events and deals chronologically.
- **Tests:** timeline ordering with interleaved sources; export respects filters.

### OPS-001 — Structured logging, request ids, tracing
- **Dependencies:** ARCH-001
- **Acceptance:** §23.1 log line on every request; `trace_id` propagated into `audit_logs`, `ai_runs` and outbox payloads; the redaction list is enforced by a test.
- **Tests:** a log-scan test asserts no OTP, token or full phone number ever appears.

### OPS-002 — Metrics, dashboards, alerts
- **Dependencies:** OPS-001
- **Acceptance:** all §23.2 metrics emitted; dashboards for request/DB/jobs/AI/business; alert rules of §23.4 configured with paging vs ticket routing.
- **Tests:** a synthetic error burst triggers the alert rule in staging.

### OPS-003 — Health endpoint + post-deploy smoke
- **Dependencies:** ARCH-005
- **Acceptance:** `/api/health` checks DB, queue, storage, AI; post-deploy smoke runs health + login + feed + deal read and auto-rolls back on failure.
- **Tests:** a deliberately broken deploy in staging rolls back automatically.

### OPS-004 — Backups, PITR and a restore drill
- **Dependencies:** ARCH-004
- **Acceptance:** WAL/PITR enabled, daily logical dump to R2 encrypted, documented restore runbook with a measured RTO under 1 hour.
- **Tests:** a full restore into a scratch database is performed and timed; the result is recorded in the runbook.

### OPS-005 — Staging anonymised refresh
- **Dependencies:** OPS-004
- **Acceptance:** nightly job copies production to staging with names, phones, emails, addresses and documents pseudonymised; a verification query proves zero real PII in staging.
- **Tests:** PII scan over staging returns zero matches.

---

## PHASE 10 — Hardening

### QA-001 — Authorization & IDOR suite
- **Dependencies:** all API tasks
- **Acceptance:** automated enumeration of every `/api/*/:id` route attempting cross-user access; the full permission matrix asserted; zero passes.
- **Tests:** the suite itself; CI-blocking.

### QA-002 — E2E journeys J1–J7
- **Dependencies:** UI-014, ADMIN-003
- **Acceptance:** all seven journeys green on mobile viewport in Thai and English; J6 (revenue path) runs on every deploy to staging.
- **Tests:** Playwright suite with trace artifacts on failure.

### QA-003 — AI-off release gate
- **Dependencies:** UI-015, AI-004
- **Acceptance:** with `AI_ENABLED=false`, all 38 screens render and J1–J6 complete.
- **Tests:** a dedicated CI job running the E2E suite with AI disabled.

### QA-004 — Load & performance verification
- **Dependencies:** MATCH-008, DEAL-003
- **Acceptance:** every SLO in §23.3 met at 50 rps sustained with the 100k-property dataset; SSE stable at 1,000 concurrent connections.
- **Tests:** k6 scripts committed under `qa/load/`, with results recorded in the PR.

### QA-005 — Security review & pen test pass
- **Dependencies:** SEC-002, QA-001
- **Acceptance:** ZAP baseline with zero highs; dependency audit clean; CSP/headers verified; upload abuse cases covered; PDPA checklist signed off.
- **Tests:** automated scans in CI plus a documented manual review checklist.

### QA-006 — Launch readiness
- **Dependencies:** everything
- **Acceptance:** the MVP definition of done in §25.4 fully satisfied, evidence linked per item; runbooks written; legal documents published; the Owner has signed off on the fee agreement.
- **Tests:** the checklist itself, reviewed by Manus, approved by the Owner.

---

## 30.1 Task summary

| Phase | Tasks | Focus |
|---|---|---|
| 0 Foundation | ARCH-001…005 | monorepo, contracts, DB, CI |
| 1 Data model | DB-001…011 | schema, constraints, RLS, seed |
| 2 Identity | AUTH-001…004, SEC-001…002 | OTP, authz, encryption, uploads |
| 3 Supply/Demand | API-001…004 | properties, requirements, geo |
| 4 Matching | MATCH-001…009 | the core engine |
| 5 AI | AI-001…009 | Lilith with guardrails |
| 6 Deal | DEAL-001…009 | state machine, room, viewings, offers |
| 7 Money | FEE-001…005 | fee engine, invoicing, reconciliation |
| 8 Screens | UI-001…016 | the 38 screens |
| 9 Admin/Ops | ADMIN-001…006, OPS-001…005 | backoffice, observability, deploy |
| 10 Hardening | QA-001…006 | authz, e2e, load, security, launch |

**91 tasks** (ARCH 5 · DB 11 · AUTH 4 · SEC 2 · API 4 · MATCH 9 · AI 9 · DEAL 9 · FEE 5 · UI 16 · ADMIN 6 · OPS 5 · QA 6). Estimated 14–18 weeks for one strong engineer plus Codex, or 9–12 weeks with two engineers running the parallel tracks marked in `IMPLEMENTATION_ORDER.md`.

## Isolated prototype track

### UI-017 — LILITH Connect 38-route / 8-template concierge prototype
- **Dependencies:** merged ARCH-001 only; explicit scoped exception in ADR-0014.
- **Files:** apps/concierge-prototype; governance/ADR/contract documentation; shared boundary registration/tests; separate prototype CI; exact development lockfile.
- **Acceptance:** docs/concierge-prototype-contract.md full amended spec: exact38/8, six categories, minimal synthetic fixtures, guarded truthful states, consent, th/en fallback, durable idempotency, owner/session isolation, four-image reliability, null handoff destination, no external side effects.
- **Tests:** root frozen install/build/typecheck/lint/test; test:boundaries; app test:contract and test:e2e. Actual passing CI required before Done; no fabricated claims.
- **Handoff:** Lovable UI contract → Manus exact-HEAD QA → Claude final review → Director. No merge or deployment.
