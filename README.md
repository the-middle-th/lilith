# LILITH by THE MIDDLE

Property matching infrastructure. The production implementation follows [Architecture Blueprint v1.0](BLUEPRINT_README.md) and [IMPLEMENTATION_ORDER.md](IMPLEMENTATION_ORDER.md).

Foundation: **ARCH-001 — Monorepo scaffold**. **UI-017** adds the isolated LILITH Connect synthetic prototype described below. This is not an operational marketplace. Production listings, customer accounts, database, matching, viewing and billing services remain unimplemented. See [implementation status](docs/IMPLEMENTATION_STATUS.md).

## Foundation development

Requires Node.js 24 and pnpm 11.19.0 (pinned in `packageManager`).

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm test:boundaries
pnpm dev
```

Open http://127.0.0.1:3100 for the clearly labelled foundation page. `pnpm --filter @lilith/web start` serves the production build locally. No credentials or environment file are needed by this scaffold; the full validated environment contract is a later task.

`apps/web` is the Next.js app. `apps/worker` builds independently, but starting it exits with code 78 because its PostgreSQL/pg-boss setup has not been implemented. It never pretends to process jobs. Shared packages: contracts, core, db, ai, ui, i18n and config. [Architecture and import rules](docs/ARCHITECTURE.md).

`pnpm test` runs the current workspace tests. The ARCH-001 CI workflow checks the scaffold and boundary suite; database integration, E2E, migration and other release gates belong to later tasks. No deployment is configured by this task.

## LILITH Connect concierge prototype — UI-017

The approved isolated workspace `apps/concierge-prototype` provides a loopback-only synthetic reception flow, 38 logical routes and eight reusable templates. It has no production service integration. [Contract](docs/concierge-prototype-contract.md), [architecture decision](docs/adr/ADR-0014-lilith-connect-prototype-boundary.md), [route manifest](docs/governance/LILITH_38_ROUTE_MANIFEST.md).

```sh
pnpm --filter @lilith/concierge-prototype build
pnpm --filter @lilith/concierge-prototype start
```

Open `http://127.0.0.1:3217/welcome`. Thai is the default; English shares the same routes. Select only provided synthetic scenarios/contact/images. Consent copy is a labeled demonstration (`REVIEW_REQUIRED`). Handoff saves a pending state locally; nobody is notified. The local JSON store and signing material are ignored by Git. Normal sessions have no Operations access.

Verification:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:boundaries
pnpm --filter @lilith/concierge-prototype test:contract
pnpm --filter @lilith/concierge-prototype exec playwright install chromium
pnpm --filter @lilith/concierge-prototype test:e2e
```

Local macOS 13 verification uses `PLAYWRIGHT_CHANNEL=chrome pnpm --filter @lilith/concierge-prototype test:e2e` with installed Chrome 153; bundled Playwright Chromium installation is unsupported on this host. Linux CI installs the pinned test browser.

The original nine workspace foundation job and the separate UI-017 prototype job both retain boundary regression checks. Root commands include every workspace. Browser tests use a temporary isolated store and reject non-loopback application requests. Browser installation follows [Playwright's official instructions](https://playwright.dev/docs/browsers).

## Preserved operating prototype

The existing root static files are retained as historical prototype material, separate from `apps/web`. They are not the production product. The earlier prototype instructions follow unchanged.

---

# Lilith Operating Prototype

Static prototype for Project Lilith's control room.

## Open Locally

```sh
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Current Scope

- Lilith operating dashboard
- Google Drive spec reference slot
- Extracted goals, workflow, and open items
- Marketing and service plan section
- Responsive desktop and mobile layout
