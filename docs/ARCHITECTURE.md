# Architecture entrypoint

The authoritative specification is [Blueprint v1.0](../BLUEPRINT_README.md), with source hashes in `blueprint-source-manifest.json`. Work order and acceptance criteria are in [IMPLEMENTATION_ORDER](../IMPLEMENTATION_ORDER.md) and [Codex handoff](07-codex-handoff.md).

The target is Next.js App Router → core services/repositories → PostgreSQL 16 through the DB package, with a separate pg-boss worker. Shared contracts precede domain implementation. AI cannot own numerical matching or business rules. Fee rates come from versioned database rules; money is BIGINT satang. Status transitions, audit integrity and sensitive access have database enforcement as well as application checks.

ARCH-001 creates the buildable workspace and enforces imports. It does not implement those domain or database guarantees yet. See [implementation status](IMPLEMENTATION_STATUS.md).

| Workspace | Responsibility | Permitted internal runtime dependencies |
| --- | --- | --- |
| apps/web | Next app and route adapters | contracts, core, ui, i18n; ai only in API/server composition |
| apps/worker | Job process | contracts, core, db, ai |
| packages/contracts | Validated transport shapes | none |
| packages/core | Framework-free business domains | contracts; db only from repository adapters |
| packages/db | Prisma, SQL, actor-aware database access | contracts |
| packages/ai | Provider adapters and guarded AI tasks | contracts, core/shared, db wrapper for AI persistence |
| packages/ui | Reusable product components | contracts, i18n |
| packages/i18n | Thai/English messages | none |
| packages/config | Shared engineering tooling | tooling dependencies |

Imports cannot reach the legacy root prototype. `no-restricted-imports` plus the local architecture rule check static imports, re-exports, type imports, literal dynamic imports, require and relative paths. Computed module paths fail lint. Pure matching/helper modules have a closed dependency set; deterministic runtime tests are still required in MATCH tasks.

See [ADR-0013](adr/ADR-0013-blueprint-foundation-adoption.md) for reconciliation decisions. Other numbered Blueprint documents remain unchanged.

## Approved UI-017 concierge boundary

The separate @lilith/concierge-prototype workspace serves 38 local logical routes using eight templates, an app-private Node HTTP runtime and durable synthetic JSON store. No runtime dependencies on production workspaces or legacy static files; no shared router/store with apps/web or Property Pulse. Shared packages/config adds only scoped isolation enforcement and tests. Separate CI plus root aggregate verification. See ADR-0014 and concierge-prototype-contract.md; production route/domain relationships remain undecided.
