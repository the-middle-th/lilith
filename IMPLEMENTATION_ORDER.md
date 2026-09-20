# IMPLEMENTATION_ORDER.md
## LILITH by THE MIDDLE — recommended build sequence

> Read with `docs/07-codex-handoff.md`. That file defines each task; this file defines **when** to do it and **why in this order**.
>
> Governing principle: **contracts before implementation, constraints before features, revenue path before polish.**

---

## The five ordering rules

1. **Nothing is built before the shape it produces exists.** Contracts (`packages/contracts`) and the database schema precede every feature that uses them.
2. **Business integrity lives in the database first.** A constraint added after the data exists is a migration plus a cleanup; added first, it is free.
3. **The revenue path is built end-to-end before anything is made beautiful.** A working ugly path from signup to a paid invoice tells the truth; a beautiful swipe deck with no deal machine does not.
4. **Every phase ends in something demonstrable.** If a phase cannot be shown working, it was sequenced wrong.
5. **AI is added on top of a product that already works without it.** Every AI task follows the deterministic version of the same capability.

---

## Sequence

### Week 0–1 · Foundation — *"the repo compiles and the database refuses bad data"*

```
ARCH-001 → ARCH-002 → ARCH-003 → ARCH-004 → ARCH-005
```

Exit demo: CI green; a deliberately illegal import fails lint; `docker compose up && pnpm db:migrate` works on a clean machine.

---

### Week 1–3 · Data model — *"the schema enforces the business"*

```
DB-001 → DB-002 ─┐
DB-003 ──────────┼→ DB-004 → DB-005 → DB-006 → DB-007 → DB-008 → DB-009 → DB-010 → DB-011
                 │
       (DB-003 can run in parallel with DB-001/002)
```

Exit demo: a `psql` session where every attempt to create invalid business state — publishing an incomplete property, two active exclusive mandates, changing `deals.status` directly, updating an audit row — is rejected by the database. **This demo is the single highest-leverage moment in the whole build.** If it does not fail correctly here, every later layer inherits the weakness.

---

### Week 3–4 · Identity & access — *"the wrong person can't reach anything"*

```
AUTH-001 → AUTH-002 → AUTH-003 → AUTH-004
SEC-001 (parallel with AUTH-002)
SEC-002 (after AUTH-002)
```

Exit demo: OTP login on a phone; the permission matrix test running green; a raw SQL read of another user's deal returning zero rows under RLS; an uploaded photo with GPS EXIF stored without it.

---

### Week 4–6 · Supply & demand — *"real listings and real requirements exist"*

```
API-004 (geo, first — everything else needs locations)
API-001 → API-002
API-003
```

Parallel track available: **UI-001 (design system)** can start now, since it depends only on ARCH-001. If two people are working, this is the split.

Exit demo: create a property through the API, publish it, get rejected for being incomplete, complete it, publish; create and activate a requirement.

---

### Week 6–8 · Matching engine — *"the score means something and can explain itself"*

```
MATCH-001 → MATCH-002 → MATCH-003 → MATCH-004 → MATCH-006
                                        ↓
                       MATCH-005 → MATCH-007 → MATCH-008 → MATCH-009
```

`MATCH-004` (`score.ts`) is the most important file in the codebase. Do not let it be started before `MATCH-002` and `MATCH-003` are merged and tested, and do not let it acquire a single I/O call.

Exit demo: seed the world, run generation, and print a table of matches with scores, confidences and reason lists — then change one weight in the database, republish the profile, and show the ranking change with a shadow-score diff. **No UI needed for this demo, and none should be built to get it.**

---

### Week 8–10 · Deal machine — *"a deal cannot lie about its own history"*

```
DEAL-001 → DEAL-002 → DEAL-003 → DEAL-004
                 ↓
           DEAL-005 · DEAL-006 (parallel) → DEAL-007 → DEAL-008 → DEAL-009
```

Exit demo: drive a deal from mutual match to `AGREEMENT_SIGNED` entirely through `POST /api/deals/:id/transitions`, then print `deal_transitions` and `audit_logs` and show that every step has an actor, a reason and an event — and that no forbidden transition was accepted.

---

### Week 10–11 · Money — *"the business gets paid, provably"*

```
FEE-001 → FEE-002 → FEE-003 → FEE-004 → FEE-005
```

Exit demo: close a seeded deal at ฿12,500,000 and produce an invoice PDF for ฿13,375 (fee ฿12,500 + VAT ฿875); then insert `middle_success_fee@2` at a different rate and show the existing fee row unchanged and a new deal billed at the new rate.

**Milestone M1 — the revenue path exists end-to-end, headless.** Everything to this point is provable by API calls and SQL. If M1 slips, cut screens, never cut this.

---

### Week 11–15 · Screens — *"a human can do all of it"*

```
UI-001 (if not already done in the parallel track) → UI-002
  → UI-003 (entry)
  → UI-004 (dashboards)
  → UI-005 (property wizard)          ─┐
  → UI-007 (requirement wizard)        │  these two feed the deck
  → UI-008 (discover deck) → UI-009 → UI-010
  → UI-011 (deal room) → UI-012 → UI-013
  → UI-014 (close · fee · receipt)     ← finish the revenue path in UI before anything else
  → UI-015 (insights · notifications · trust)
  → UI-016 (error/offline/403 surfaces)
```

Ordering note: **UI-014 comes before UI-015.** Insights are the most fun screen to build and the least important to launch.

Exit demo: journeys J1–J6 clicked through on a real phone, in Thai.

---

### Week 13–16 · Lilith AI — *"the assistant improves the product it cannot break"*

```
AI-001 → AI-002 → AI-003
   ├→ AI-004 → UI-006 (Lilith property review screen)
   ├→ AI-005
   ├→ AI-006 (needs MATCH-006)
   ├→ AI-007 (needs API-002)
   ├→ AI-008
   └→ AI-009
```

This phase deliberately overlaps the screens phase and deliberately comes **after** the product works. Every AI task ships with its fallback in the same PR.

Exit demo: run the full E2E suite twice — once with `AI_ENABLED=true`, once with `false`. Both must pass. Then show an `ai_runs` row for a single extraction with model, prompt version, confidence, cost and the human's accept/edit decision.

---

### Week 15–17 · Admin & operations — *"the business can be run and watched"*

```
ADMIN-001 → ADMIN-002 → ADMIN-003
         → ADMIN-004 (needs MATCH-004)
         → ADMIN-005 (needs FEE-004)
         → ADMIN-006
OPS-001 → OPS-002 → OPS-003 → OPS-004 → OPS-005
```

`OPS-001` (structured logging + request ids) is the one item here worth pulling much earlier — do it during Phase 2 if there is any spare capacity, because every subsequent debugging session pays for it.

Exit demo: approve a verification, flag a duplicate, force-close a deal with a reason, and then find all four actions in audit search by `request_id`.

---

### Week 17–18 · Hardening & launch

```
QA-001 → QA-002 → QA-003 → QA-004 → QA-005 → QA-006
```

Exit: the MVP definition of done (§25.4) fully evidenced, Owner sign-off recorded.

---

## Parallelisation map (two engineers)

| Track A — platform & domain | Track B — interface & operations |
|---|---|
| ARCH-001…005 | *(waits)* |
| DB-001…011 | UI-001 design system |
| AUTH-001…004, SEC-001…002 | UI-002 shell, i18n |
| API-001…004 | UI-003, UI-004 |
| MATCH-001…009 | UI-005, UI-007 (wizards against mocked API) |
| DEAL-001…009 | UI-008…UI-010 (deck) |
| FEE-001…005 | UI-011…UI-013 (deal room) |
| AI-001…009 | UI-014, UI-006, UI-015, UI-016 |
| ADMIN-004, ADMIN-005 | ADMIN-001…003, ADMIN-006, OPS-001…005 |
| QA-001, QA-004 | QA-002, QA-003, QA-005 |

Track B builds against the zod contracts and MSW mocks, so it never blocks on Track A. This works **only** because `packages/contracts` is written first — which is the reason ARCH-003 sits in week 0.

---

## Critical path

```
ARCH-003 → DB-004 → DB-006 → MATCH-004 → MATCH-007 → MATCH-009
       → DEAL-001 → DEAL-002 → DEAL-008 → FEE-001 → FEE-002 → FEE-003 → UI-014 → QA-002
```

Anything not on this path can slip a week without moving the launch date. Anything on it cannot. Protect `MATCH-004`, `DEAL-001` and `FEE-001` — the three pure, heavily-tested files the whole business rests on — from being rushed.

---

## Definition of done, applied to every task

A task is complete when **all** of these are true:

- [ ] Every acceptance criterion in the task is demonstrably met (evidence in the PR, not a claim)
- [ ] Every listed test exists and passes in CI
- [ ] No database constraint, authz check or existing test was weakened to make it pass
- [ ] Migrations are expand/contract-safe and reversible
- [ ] Both `th` and `en` strings exist for any user-facing text
- [ ] Structured logs and, where relevant, events/audit rows are emitted
- [ ] The blueprint was updated in the same PR if the implementation deviated from it
- [ ] Completion report attached: `STATUS / EVIDENCE / RISKS / BLOCKERS / NEXT / OWNER APPROVAL`

---

## Three checkpoints where the Owner must decide

| When | Decision | Why it blocks |
|---|---|---|
| Before DB-008 | Confirm the fee model: 0.1% of what exactly, and who pays (owner, agent, client, split) | It seeds `fee_rules` and shapes the close flow. The engine is configurable, but the launch value must be a real business decision, not a placeholder. |
| Before FEE-003 | Thai counsel review of the fee agreement, ToS and the platform-vs-brokerage positioning | The first invoice should not be the first time this is examined (risk L2/L3). |
| Before QA-006 | Whether the existing public Lovable prototype stays live, is relabelled a demo, or is retired | Two live products under one brand confuses users and splits the supply pool (ADR-0012). |

## UI-017 — approved isolated prototype track

ARCH-001 → UI-017 (governance → app-private contracts → runtime/eight templates → tests → PR). This scoped exception is approved by Claude round 3 with Owner path approval; see ADR-0014. It does not alter the production critical path or claim ARCH-002+/AUTH/DB/MATCH completion. All source changes follow the approved amended concierge contract.
