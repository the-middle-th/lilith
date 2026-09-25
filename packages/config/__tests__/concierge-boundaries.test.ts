import { fileURLToPath } from "node:url";
import path from "node:path";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, "eslint.config.mjs"),
});
const app = "apps/concierge-prototype";

async function lint(file: string, source: string) {
  const [result] = await eslint.lintText(source, {
    filePath: path.join(root, file),
  });
  expect(result).toBeDefined();
  expect(result?.fatalErrorCount).toBe(0);
  return result?.messages ?? [];
}

const forbidden: Array<readonly [string, string]> = [
  ...["core", "db", "ai", "contracts", "ui", "i18n", "config"].map(
    (workspace) =>
      [`${app}/src/server/api.ts`, `import "@lilith/${workspace}";`] as const,
  ),
  ...[
    "apps/web/src/app/page.tsx",
    "apps/worker/src/index.ts",
    "packages/core/index.ts",
    "packages/db/src/index.ts",
    "packages/ai/src/index.ts",
    "packages/contracts/src/index.ts",
    "packages/ui/src/index.ts",
    "packages/i18n/src/index.ts",
    "packages/config/probe.ts",
  ].map((file) => [file, 'import "@lilith/concierge-prototype";'] as const),
  ...["client", "shared"].flatMap((layer) =>
    ["node:fs", "fs/promises", "node:crypto", "crypto", "node:buffer"].map(
      (specifier) =>
        [`${app}/src/${layer}/probe.ts`, `import "${specifier}";`] as const,
    ),
  ),
  [`${app}/src/server/api.ts`, 'import "../../../../packages/core/index.js";'],
  [`${app}/src/server/api.ts`, 'import "../../../../script.js";'],
  [
    `${app}/src/server/api.ts`,
    'import "@lilith/concierge-prototype/../../packages/core/index.js";',
  ],
  [`${app}/src/server/api.ts`, 'import "../../scripts/build.mjs";'],
  [`${app}/src/server/api.ts`, 'import "../client/main.js";'],
  [`${app}/src/server/api.ts`, 'import "react";'],
  [`${app}/src/server/api.ts`, 'import "vitest";'],
  [`${app}/src/server/api.ts`, 'import "node:module";'],
  [`${app}/src/client/main.ts`, 'import "../server/session.js";'],
  [`${app}/src/shared/routes.ts`, 'import "../server/session.js";'],
  [`${app}/src/shared/routes.ts`, 'import "../client/main.js";'],
  [
    `${app}/src/client/main.ts`,
    'import "@lilith/concierge-prototype/src/server/session.js";',
  ],
  [`${app}/src/client/main.ts`, 'import "../shared/../server/session.js?raw";'],
  [
    `${app}/src/client/main.ts`,
    'import type { Session } from "../server/session.js"; export type Value = Session;',
  ],
  [`${app}/src/client/main.ts`, 'export * from "../server/session.js";'],
  [
    `${app}/src/shared/routes.ts`,
    'export { secret } from "../server/session.js";',
  ],
  [`${app}/src/client/main.ts`, 'await import("../server/session.js");'],
  [`${app}/src/client/main.ts`, "await import(`../server/session.js`);"],
  [`${app}/src/client/main.ts`, 'require("../server/session.js");'],
  [`${app}/src/client/main.ts`, 'require.resolve("../server/session.js");'],
  [
    `${app}/src/client/main.ts`,
    'export type Value = import("../server/session.js").Session;',
  ],
  [
    `${app}/src/client/main.ts`,
    'import session = require("../server/session.js"); export { session };',
  ],
  [
    `${app}/src/client/main.ts`,
    'const name = "../server/session.js"; await import(name);',
  ],
  [
    `${app}/src/client/main.ts`,
    'const loader = require; loader("../server/session.js");',
  ],
  [`${app}/src/client/main.ts`, 'import "../../scripts/build.mjs";'],
  [`${app}/src/client/main.ts`, 'import "https://example.invalid/code.js";'],
  [`${app}/src/server/api.ts`, 'import "file:///tmp/untrusted.mjs";'],
  [`${app}/src/server/api.ts`, 'import "file:invalid%path";'],
  [
    "apps/web/src/app/page.tsx",
    'import "../../../concierge-prototype/src/shared/routes.js";',
  ],
  [
    "apps/web/src/app/page.tsx",
    'export * from "@lilith/concierge-prototype/src/shared/routes.js";',
  ],
  [
    "apps/worker/src/index.ts",
    'await import("@lilith/concierge-prototype/src/server/session.js");',
  ],
  [
    "apps/web/src/app/page.tsx",
    `import ${JSON.stringify(new URL("apps/concierge-prototype/src/server/session.js", new URL("../../../", import.meta.url)).href)};`,
  ],
  [`${app}/scripts/build.mjs`, 'import "@lilith/core";'],
];

const allowed = [
  [`${app}/src/server/api.ts`, 'import "node:http";'],
  [`${app}/src/server/store.ts`, 'import "node:fs/promises";'],
  [`${app}/src/server/session.ts`, 'import "node:crypto";'],
  [`${app}/src/server/api.ts`, 'import "../shared/routes.js";'],
  [`${app}/src/server/api.ts`, 'import "./store.js";'],
  [`${app}/src/client/main.ts`, 'import "../shared/routes.js";'],
  [`${app}/src/client/main.ts`, 'import "./templates.js";'],
  [
    `${app}/src/client/main.ts`,
    'import "@lilith/concierge-prototype/src/shared/routes.js";',
  ],
  [`${app}/src/shared/routes.ts`, 'import "./contracts.js";'],
  [
    `${app}/src/shared/routes.ts`,
    'import type { Route } from "./contracts.js"; export type Value = Route;',
  ],
  [`${app}/scripts/build.mjs`, 'import "node:fs/promises";'],
  [`${app}/scripts/build.mjs`, 'import "@lilith/config/eslint";'],
  [`${app}/eslint.config.mjs`, 'import "@lilith/config/eslint";'],
  [`${app}/vitest.config.ts`, 'import "@lilith/config/eslint";'],
  [`${app}/playwright.config.ts`, 'import "@playwright/test";'],
  [
    `${app}/tests/contract/api.test.ts`,
    'import "vitest"; import "../../src/server/api.js";',
  ],
] as const;

describe("UI-017 prototype isolation using the root ESLint configuration", () => {
  // Load the shared TypeScript/Next lint configuration once, outside individual
  // import assertions. Cold initialization can exceed a single case's timeout.
  beforeAll(async () => {
    expect(await lint(`${app}/src/server/preflight.ts`, "export {};")).toEqual(
      [],
    );
  }, 30_000);

  it.each(forbidden)("rejects %s: %s", async (file, source) => {
    expect(
      (await lint(file, source)).some(
        (message) =>
          message.ruleId === "architecture/boundaries" &&
          message.severity === 2,
      ),
    ).toBe(true);
  });

  it.each(allowed)("permits %s: %s", async (file, source) => {
    expect(await lint(file, source)).toEqual([]);
  });
});
