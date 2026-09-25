import { spawnSync } from "node:child_process";
import { cp, readdir, readFile, rm, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
await rm(path.join(root, "dist"), { recursive: true, force: true });
for (const config of ["tsconfig.server.json", "tsconfig.client.json"]) {
  const result = spawnSync("pnpm", ["exec", "tsc", "-p", config], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
await mkdir(path.join(root, "dist/public"), { recursive: true });
await cp(path.join(root, "public"), path.join(root, "dist/public"), {
  recursive: true,
});
const { validateLocaleResources } =
  await import("../dist/public/shared/locales.js");
validateLocaleResources();
// Check the actual served output; server modules and Node secrets cannot be shipped.
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await check(target);
    else if (entry.name.endsWith(".js")) {
      const content = await readFile(target, "utf8");
      if (
        /(?:from\s*|import\s*\()\s*["'](?:node:|[^"']*\/server\/)|createHmac|signingKey|readFileSync|process\.env/.test(
          content,
        )
      )
        throw Error("SERVER_CODE_IN_PUBLIC_OUTPUT");
    }
  }
}
await check(path.join(root, "dist/public"));
console.log(
  "Prototype build: locale completeness and public-output isolation passed",
);
