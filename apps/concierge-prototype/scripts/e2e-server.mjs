import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
const store = await mkdtemp(path.join(tmpdir(), "lilith-ui017-e2e-"));
const child = spawn(process.execPath, ["dist/server/main.js"], {
  stdio: "inherit",
  env: { ...process.env, PROTOTYPE_PORT: "3217", PROTOTYPE_STORE_DIR: store },
});
let stopping = false;
function stop() {
  if (!stopping) {
    stopping = true;
    child.kill("SIGTERM");
  }
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", async (code) => {
  await rm(store, { recursive: true, force: true });
  process.exit(code ?? 0);
});
