import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPrototypeServer } from "./http.js";
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const port = Number(process.env["PROTOTYPE_PORT"] ?? 3217);
const runtime = await createPrototypeServer({
  storeDir:
    process.env["PROTOTYPE_STORE_DIR"] ??
    path.join(appRoot, ".local/concierge-prototype"),
  publicDir: fileURLToPath(new URL("../public/", import.meta.url)),
  port,
});
console.log(`LILITH synthetic prototype: ${runtime.origin}`);
let stopping = false;
async function close(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await runtime.close();
}
process.once("SIGINT", () => {
  void close();
});
process.once("SIGTERM", () => {
  void close();
});
