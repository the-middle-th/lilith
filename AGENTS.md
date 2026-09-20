# LILITH implementation rules

The supplied Blueprint v1.0 is the architecture specification. Read `BLUEPRINT_README.md`, `IMPLEMENTATION_ORDER.md`, and the assigned task in `docs/07-codex-handoff.md` before changes. Consult the relevant numbered architecture document.

- One task, one branch (`feat/<TASK-ID>-slug`), one PR (`<TASK-ID>: <goal>`). Do not begin a task until its dependencies are merged.
- Mark Done only after every acceptance criterion and the listed CI tests pass. Report local verification separately from CI.
- Keep core framework-free, Prisma inside the DB package, routes behind core, AI outside business rules, and matching deterministic. Never weaken constraints, authorization or tests to obtain a pass.
- Preserve the root static prototype and unrelated local work. No production deployment or prototype disposition is part of ARCH-001.
- Record architecture interpretations in an ADR. Do not invent fee basis/payer or legal approvals.
- Update `docs/IMPLEMENTATION_STATUS.md` after meaningful phases. End a PR with `STATUS / EVIDENCE / RISKS / BLOCKERS / NEXT / OWNER APPROVAL`.

Foundation validation: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test:boundaries`.

## UI-017 approved isolated prototype exception

Claude APPROVE_FOR_CODEX and Owner path approval are recorded in docs/governance/evidence; ADR-0014 and docs/concierge-prototype-contract.md govern this task. UI-017 depends only on merged ARCH-001. Its app-private mock runtime at apps/concierge-prototype may implement its own request contracts without production core/DB/AI imports. This does not complete or replace ARCH-002+ tasks. Only the approved shared boundary tooling and CI scopes change outside the app. Preserve the original application and static prototype. Run root build/typecheck/lint/test, boundary tests and prototype contract/E2E checks; no deployment or merge.
