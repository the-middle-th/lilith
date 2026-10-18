# Lovable Backend Reconciliation — 2026-10-18

## Scope

This document reconciles the **backend/security delta** introduced in Lovable Lilith Connect revision
`7b62ed0de7038d0c5faa7b85326d2c78702453e9`
against the canonical GitHub prototype contract at
`9395e0a7a04dab07d54705bfab2e9b96a1345176`.

GitHub and Lovable are **separate implementations**. This file does not establish SHA lineage and does not authorize deployment, publication, migration, database writes, email delivery, DNS changes, traffic, or production use.

## Standing role boundary

Lovable is UX/UI prototype only.

Lovable MUST NOT independently own or approve:
- backend schema;
- database migrations;
- RLS / RBAC policy;
- authentication;
- privileged database writes;
- production notification delivery.

Codex owns backend reconciliation and implementation proposals.
Grok owns independent exact-version QA.
Claude performs final architecture / risk / compliance review.
ChatGPT / เจริญ is the final evidence gate.

## Exact Lovable delta reviewed

Revision: `7b62ed0de7038d0c5faa7b85326d2c78702453e9`

Compared with: `f210ba9a329d3c85369756156282812545c5b028`

Current Lovable working revision is `50c9e69a6c6db133caf6812e9dcd7cb182940f8b`. The later move from `7b62ed0d…` to `50c9e69a…` is documentation/comment-only and does not change the backend/security delta classified below. Any UI/documentation QA must bind to `50c9e69a…`; backend classification below remains tied to the exact backend-changing revision `7b62ed0d…` and its diff from `f210ba9a…`.

Observed backend/security changed files:
- `drizzle/migrations/0009_migration.sql`
- `drizzle/migrations/meta/0009_snapshot.json`
- `drizzle/migrations/meta/_journal.json`
- `src/lib/panel.functions.ts`
- `src/lib/properties.functions.ts`
- `src/lib/workspace.functions.ts`

## Reconciliation decisions

| Lovable change | Classification | Required Codex action | Acceptance criteria |
|---|---|---|---|
| Revoke direct INSERT on `public.matches` | **RETAIN CONCEPT / REIMPLEMENT** | Move the rule into Codex-owned migration/security contract | Client cannot insert trusted match scores directly; privileged write path is explicit and tested |
| Offer update guard trigger/function | **RETAIN CONCEPT / REIMPLEMENT** | Recreate under Codex-owned migration with tests | Counterparty-only response enforced; immutable offer fields cannot be rewritten by ordinary users |
| Deal `agreed` guard trigger/function | **RETAIN CONCEPT / REIMPLEMENT** | Recreate under Codex-owned migration with tests | Deal cannot become agreed without valid accepted counterparty offer at the same price |
| Panel `admin/owner` server-role checks | **RETAIN CONCEPT / REIMPLEMENT** | Formalize API/RBAC contract and test least privilege | Unauthorized users receive deny-by-default behavior |
| Trusted/admin client writes for matches | **REVISE** | Replace implicit service-role behavior with explicit narrow backend operation | Only minimum necessary fields are written; operation is auditable; no client-side bypass |
| Property visibility filter before lead submission | **RETAIN CONCEPT / REIMPLEMENT** | Move into Codex-owned application/service contract | Interest can only target visible/available inventory; no stale property can receive a new request |
| Offer/deal authorization in server functions | **RETAIN CONCEPT / REIMPLEMENT** | Consolidate with database guards; avoid policy duplication/drift | App layer and DB layer agree; negative tests cover both paths |
| Lovable-owned migration metadata | **REVERT AS SOURCE OF AUTHORITY** | Do not accept Lovable migration journal as canonical | GitHub/Codex migration history becomes the only accepted backend migration source |
| Existing published project flag | **OUT OF SCOPE FOR ACCEPTANCE** | Do not infer deployed revision from `is_published:true` | Deployment revision must be independently evidenced |
| Existing email infrastructure from prior Lovable revision | **BLOCKED PENDING PRIVACY/OWNER** | Keep disabled from approval path until legal/PDPA + owner gate | No real email send, no customer data use, no DNS/billing change |

## Required data / API contracts before backend acceptance

### Match write

Input:
- `lead_id`
- `property_id`
- `match_score`
- `reasons[]`
- `conflicts[]`
- `match_version`
- synthetic / mock marker

Rules:
- scores are computed server-side;
- client cannot author trusted scores;
- writes are idempotent where applicable;
- no PII is required to store a match;
- all mock fixtures carry `mock_data:true`.

### Offer response

Input:
- `offer_id`
- requested transition: `accepted | rejected | countered`
- authenticated actor identity

Rules:
- offer creator cannot accept/reject their own offer;
- amount / deal_id / offered_by remain immutable for non-staff;
- authorization fails closed.

### Deal agreement

Input:
- `deal_id`
- `agreed_price`

Rules:
- requires a corresponding accepted counterparty offer;
- price must match;
- unauthorized transitions fail closed.

## Test plan

Codex-owned tests must include:
1. unauthorized panel access → denied;
2. ordinary user direct match insert → denied;
3. backend trusted match write → allowed only through intended operation;
4. offer creator tries to accept own offer → denied;
5. counterparty response → allowed;
6. immutable offer fields tampering → denied;
7. deal agreement without accepted offer → denied;
8. mismatched agreed price → denied;
9. valid accepted-offer deal agreement → allowed;
10. unavailable/unpublished property interest → denied;
11. all fixtures synthetic with `mock_data:true`;
12. no email send / external notification during tests.

## Lili / Concierge boundary

This backend reconciliation must not broaden the Lili contract.

Lili remains a Digital Welcome / Greeting / Reception Helper for:
- Condo
- Hotel
- Car with Driver
- Airport Transfer
- Private Driver
- Bespoke Request

Required behavior:
- short welcome;
- ask only minimum necessary information;
- clearly state that fulfillment is not guaranteed;
- multilingual support;
- Human / Operations escalation when needed;
- no direct copying of Roamly wording, imagery, brand, or layout.

## Gate status

- GitHub prototype 38 Routes / 8 Templates: **PASS — isolated prototype evidence**
- Lovable documentation contradiction: **FIXED at working revision `50c9e69a6c6db133caf6812e9dcd7cb182940f8b`**
- Lovable UX/runtime acceptance: **REVISE**
- Lovable backend ownership: **BLOCKED until Codex-owned implementation exists**
- Grok exact-revision QA: **BLOCKED_NATIVE_AGENT / NOT_RECEIVED**
- Claude final: **PENDING**
- Production / publish / migration / live email / real customer use: **NO-GO**

## Next handoff

`Codex-owned backend PR + exact-SHA CI → Grok independent QA → Claude final → เจริญ Director Gate`
