# ADR-0014 — LILITH Connect isolated concierge prototype

Status: Approved for implementation, 2026-09-20. Task UI-017.

Owner approved the exact repository/base/branch/app proposal with “อนุมัติข้อเสนอ repository / branch / แอปแยกนี้”. Claude round 3 returned APPROVE_FOR_CODEX in [the actual review](https://claude.ai/chat/a665ed8d-149f-4025-97cc-44885177bf5c). This is pre-code approval; no implementation or test pass is implied.

Repository the-middle-th/lilith; base codex/lilith-prototype at 762affefba84209a9a96263ef7f834ddc8e7fd7c; branch feat/UI-017-lilith-connect-prototype; workspace apps/concierge-prototype named exactly @lilith/concierge-prototype. Fresh remote branch, tree, task and ADR collision checks passed 2026-09-20 07:44 UTC immediately before creation. No other repository source is imported.

## Decision and scoped exceptions

UI-017 depends only on merged ARCH-001. It is an isolated synthetic concierge runtime, not completion or replacement of ARCH-002+, AUTH, DB, matching or marketplace UI tasks. Internal request contracts, signed synthetic sessions, JSON persistence and eight template families remain app-private. There are exactly 38 logical application routes. No shared HTTP router, production package runtime import, shared mutable state, domain mapping or Property Pulse Content OS integration exists.

This local runtime separation does not settle eventual production host/domain or path relationships with apps/web. That remains a future Owner/architecture decision.

Shared tooling is an explicit limited exception to the app-private scope: packages/config/rules/boundaries.js and its regression tests register the new workspace with self-only runtime dependencies, deny imports in both directions, and enforce client/shared-to-server separation. Related ESLint configuration may recognize test/build configuration while preserving every original runtime allowance and prohibition. This adds no production domain exports. Existing ARCH-001 CI excludes only the new workspace and retains all original nine workspaces and boundary tests; a dedicated UI-017 workflow checks the prototype. Root aggregate commands still check everything. Lockfile/workspace engineering metadata may change for exact development dependencies.

## Execution order and safeguards

This ADR, route manifest, reliability gate, portfolio registry, full amended contract, then task/architecture/status amendments precede application source. Demo legal copy is REVIEW_REQUIRED. Synthetic fixture IDs only, no real free-text data, all mutations literal mock_data:true, idempotent durable writes, consent guards, 4-image maximum, null Operations destination and no external side effects. Loopback only. No production, publishing, deployment, notifications, customers, DNS, billing, traffic or merge.

Evidence of passing build/typecheck/lint/unit/contract/browser/boundary checks is required before commit/push/PR completion. Independent Lovable/Manus/Claude review is a later handoff.
