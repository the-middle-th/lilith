import { randomBytes, randomUUID } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import type { Locale, RequestRecord } from "../shared/contracts.js";
import { ApiError } from "./errors.js";
import { validSnapshot } from "./snapshot.js";

export interface SessionRecord {
  id: string;
  expires: number;
  csrf: string;
  locale: Locale;
  role: "guest" | "operations";
  scopes: string[];
}
export interface StoredRequest {
  owner: string;
  record: RequestRecord;
}
export interface StoredReply {
  status: number;
  data: unknown;
}
export interface LedgerEntry {
  fingerprint: string;
  response: StoredReply;
}
export interface Snapshot {
  version: 1;
  sessions: Record<string, SessionRecord>;
  requests: Record<string, StoredRequest>;
  ledger: Record<string, LedgerEntry>;
}
export interface StoreHooks {
  beforeCommit?: () => void | Promise<void>;
}
async function regularFile(file: string): Promise<void> {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error("UNSAFE_STORE_PATH");
  await chmod(file, 0o600);
}

export class PrototypeStore {
  private snapshot: Snapshot = {
    version: 1,
    sessions: {},
    requests: {},
    ledger: {},
  };
  private queue: Promise<unknown> = Promise.resolve();
  private lock: FileHandle | undefined;
  private poisoned = false;
  readonly signingKey: Buffer;
  private constructor(
    readonly directory: string,
    key: Buffer,
    private readonly hooks: StoreHooks,
  ) {
    this.signingKey = key;
  }
  static async open(
    directory: string,
    hooks: StoreHooks = {},
  ): Promise<PrototypeStore> {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const directoryStat = await lstat(directory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink())
      throw new Error("UNSAFE_STORE_PATH");
    await chmod(directory, 0o700);
    const lockPath = path.join(directory, "writer.lock");
    // Serialize stale-lock recovery itself. A crash during startup leaves this
    // guard and fails closed; it must never be removed by a racing starter.
    const guardPath = path.join(directory, "startup.lock");
    let guard: FileHandle;
    try {
      guard = await open(guardPath, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new Error("STORE_STARTUP_LOCKED");
      throw error;
    }
    let lock: FileHandle;
    try {
      await guard.writeFile(String(process.pid));
      await guard.sync();
      try {
        lock = await open(lockPath, "wx", 0o600);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        await regularFile(lockPath);
        const pid = Number((await readFile(lockPath, "utf8")).trim());
        if (!Number.isSafeInteger(pid) || pid < 1)
          throw new Error("STORE_LOCKED");
        try {
          process.kill(pid, 0);
          throw new Error("STORE_LOCKED");
        } catch (probeError) {
          if ((probeError as NodeJS.ErrnoException).code !== "ESRCH")
            throw probeError;
        }
        await unlink(lockPath);
        lock = await open(lockPath, "wx", 0o600);
      }
    } finally {
      await guard.close();
      await unlink(guardPath);
    }
    try {
      await lock.writeFile(String(process.pid));
      await lock.sync();
      const keyPath = path.join(directory, "session-key");
      let key: Buffer;
      try {
        await regularFile(keyPath);
        key = await readFile(keyPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        key = randomBytes(32);
        const keyFile = await open(keyPath, "wx", 0o600);
        try {
          await keyFile.writeFile(key);
          await keyFile.sync();
        } finally {
          await keyFile.close();
        }
      }
      if (key.length !== 32) throw new Error("CORRUPT_SIGNING_KEY");
      const store = new PrototypeStore(directory, key, hooks);
      store.lock = lock;
      try {
        const snapshotPath = path.join(directory, "snapshot.json");
        await regularFile(snapshotPath);
        const parsed: unknown = JSON.parse(
          await readFile(snapshotPath, "utf8"),
        );
        if (!validSnapshot(parsed)) throw new Error("CORRUPT_SNAPSHOT");
        store.snapshot = parsed;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      return store;
    } catch (error) {
      await lock.close();
      await unlink(lockPath);
      throw error;
    }
  }
  read(): Snapshot {
    if (this.poisoned) throw new ApiError(503, "STORAGE_UNAVAILABLE");
    return structuredClone(this.snapshot);
  }
  transact<T>(mutation: (draft: Snapshot) => T): Promise<T> {
    const work = this.queue.then(async () => {
      if (this.poisoned || !this.lock)
        throw new ApiError(503, "STORAGE_UNAVAILABLE");
      const draft = structuredClone(this.snapshot);
      const result = mutation(draft);
      if (!validSnapshot(draft)) throw new ApiError(503, "STORAGE_UNAVAILABLE");
      try {
        await this.hooks.beforeCommit?.();
      } catch {
        throw new ApiError(503, "STORAGE_UNAVAILABLE");
      }
      const temp = path.join(this.directory, `.snapshot-${randomUUID()}.tmp`);
      let replaced = false;
      try {
        const file = await open(temp, "wx", 0o600);
        try {
          await file.writeFile(JSON.stringify(draft));
          await file.sync();
        } finally {
          await file.close();
        }
        await rename(temp, path.join(this.directory, "snapshot.json"));
        replaced = true;
        const dir = await open(this.directory, "r");
        try {
          await dir.sync();
        } finally {
          await dir.close();
        }
        this.snapshot = draft;
        return structuredClone(result);
      } catch {
        if (replaced) this.poisoned = true;
        await unlink(temp).catch(() => undefined);
        throw new ApiError(503, "STORAGE_UNAVAILABLE");
      }
    });
    this.queue = work.catch(() => undefined);
    return work;
  }
  async close(): Promise<void> {
    await this.queue;
    if (this.lock) {
      await this.lock.close();
      this.lock = undefined;
      await unlink(path.join(this.directory, "writer.lock"));
    }
  }
}
