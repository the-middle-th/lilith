# UI-017 current status — 2026-09-20

Pre-code gate: APPROVE_FOR_CODEX, Claude round 3 with explicit Owner path approval. Governance artifacts were created before implementation. UI-017 implementation is delivered for independent review; local build/typecheck/lint, 20 prototype unit tests, 159 import-boundary tests, 28 HTTP/entrypoint contract tests and 14 browser tests pass. Hosted CI is recorded on the exact PR HEAD; this local evidence is not a substitute for its result. Repository the-middle-th/lilith; base 762affefba84209a9a96263ef7f834ddc8e7fd7c; branch feat/UI-017-lilith-connect-prototype. No deployment or merge is authorized. Lovable/Manus/final Claude verification remains the next handoff.

Correction to historical ARCH-001 status below: upstream PR #2 merged 2026-09-07 at this exact base SHA. Its old “awaiting merge” text is historical, not current authority. ARCH-002 remains unmerged and is not imported. Prototype uses the approved ARCH-001-only exception.

---

# Implementation status

Updated: 2026-09-08. Current task: **ARCH-001 — Monorepo scaffold**.

## Done

- Repository audit and supplied Blueprint reconciliation completed; all nine source files retain their original hashes.
- Isolated task branch/worktree based on published default branch `54b7ca1`; original local work and static prototype preserved.
- ARCH-001 implementation: two apps, seven packages, pnpm/Turborepo, strict TypeScript and enforced imports.
- Local build, typecheck and lint passed across all 9 workspaces; **84 boundary tests passed**. Forbidden Prisma/Next CLI probes correctly failed lint.
- Packaged standalone web/6 static assets returned HTTP 200; unconfigured compiled worker exited 78 with an explicit diagnostic.
- Hosted [foundation CI passed](https://github.com/arithachboss-cmyk/lilith/actions/runs/34160514958) on implementation commit `0957eb1`. Full evidence: [execution report](ARCH-001_REPORT.md).

## In Progress

- [Draft PR #2](https://github.com/arithachboss-cmyk/lilith/pull/2) awaits review/merge. Documentation-only updates receive the same CI checks; current checks appear on the PR.
- This foundation CI is specific to ARCH-001; the complete ARCH-005 pipeline remains unimplemented.

## Blocked

- ARCH-002 and later dependent tasks wait for ARCH-001 merge, per handoff §30.0. They have not been started.
- CLI/connector PR mutation permissions are limited. Branch push via SSH and PR creation through the existing owner browser session succeeded without changing permissions.

## Next

1. Review and merge ARCH-001 PR #2 after its latest checks pass.
2. Begin ARCH-002, then ARCH-003 → ARCH-004 → ARCH-005 in the specified order.
3. Implement data constraints before feature endpoints; demonstrate invalid writes failing directly in PostgreSQL.

## Deferred owner decisions

- Before DB-008: fee basis and payer.
- Before first live invoice: legal review of fee agreement and platform positioning.
- Before launch: retain, label as demo, or retire the public Lovable prototype.

**READY_FOR_REVIEW: true** (ARCH-001). **Platform production-ready: false.** No migrations, product authentication, matching, deal workflows, invoices or 38-screen E2E release gate are delivered by this task. The foundation page is only a build check.
