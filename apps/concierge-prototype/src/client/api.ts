import type { Failure, Success } from "../shared/contracts.js";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

type PendingOperation = {
  key: string;
  body: string;
  acknowledged?: boolean;
  result?: unknown;
};
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The same logical write retains its key and exact body after a lost response. */
export class PrototypeClient {
  csrf = "";
  private readonly pending = new Map<string, PendingOperation>();
  private readonly active = new Map<string, Promise<unknown>>();
  private readonly transport: typeof fetch;
  constructor(
    transport: typeof fetch = fetch,
    private readonly storage?: StorageLike,
  ) {
    // Native browser fetch requires the Window receiver, not this client instance.
    this.transport = transport.bind(globalThis);
  }

  async get<T>(path: string): Promise<T> {
    return this.read<T>(
      await this.transport(`/api/prototype${path}`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
  }

  async confirm<T>(operation: string, path: string): Promise<T> {
    try {
      const result = await this.get<T>(path);
      this.resolve(operation);
      return result;
    } catch (error) {
      // An expired/replaced cookie cannot leave a create acknowledgement pointing
      // forever at a request unavailable to the new session.
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 404)
      )
        this.resolve(operation);
      throw error;
    }
  }

  write<T>(
    operation: string,
    method: string,
    path: string,
    values: Record<string, unknown>,
  ): Promise<T> {
    const running = this.active.get(operation);
    if (running) return running as Promise<T>;
    const body = JSON.stringify({ ...values, mock_data: true });
    let saved = this.pending.get(operation);
    if (!saved) {
      try {
        const raw = this.storage?.getItem(`lilith.operation.${operation}`);
        const value: unknown = raw ? JSON.parse(raw) : null;
        if (
          value &&
          typeof value === "object" &&
          "key" in value &&
          "body" in value &&
          typeof value.key === "string" &&
          typeof value.body === "string"
        )
          saved = {
            key: value.key,
            body: value.body,
            ...("acknowledged" in value &&
            value.acknowledged === true &&
            "result" in value
              ? { acknowledged: true, result: value.result }
              : {}),
          };
      } catch {
        /* Storage is optional; an in-memory key is still retained. */
      }
    }
    // Never silently send an uncertain old write under changed user details.
    if (saved && saved.body !== body)
      return Promise.reject(new ApiError("IDEMPOTENCY_CONFLICT", 409));
    if (saved?.acknowledged) return Promise.resolve(saved.result as T);
    const pending = saved ?? { key: crypto.randomUUID(), body };
    this.pending.set(operation, pending);
    try {
      this.storage?.setItem(
        `lilith.operation.${operation}`,
        JSON.stringify(pending),
      );
    } catch {
      /* private browsing */
    }
    const task = (async () => {
      const response = await this.transport(`/api/prototype${path}`, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrf,
          "Idempotency-Key": pending.key,
        },
        body: pending.body,
      });
      try {
        const result = await this.read<T>(response);
        pending.acknowledged = true;
        pending.result = result;
        try {
          this.storage?.setItem(
            `lilith.operation.${operation}`,
            JSON.stringify(pending),
          );
        } catch {
          /* optional durable retry state */
        }
        return result;
      } catch (error) {
        if (error instanceof ApiError && error.status < 500)
          this.resolve(operation);
        throw error;
      }
    })();
    this.active.set(operation, task);
    void task
      .finally(() => this.active.delete(operation))
      .catch(() => undefined);
    return task;
  }

  /** Clear only after the caller also confirms its authoritative follow-up read. */
  resolve(operation: string): void {
    this.pending.delete(operation);
    try {
      this.storage?.removeItem(`lilith.operation.${operation}`);
    } catch {
      /* private browsing */
    }
  }

  private async read<T>(response: Response): Promise<T> {
    const envelope = (await response.json()) as Success<T> | Failure;
    if (!response.ok || "error" in envelope)
      throw new ApiError(
        "error" in envelope ? envelope.error.code : "INTERNAL_ERROR",
        response.status,
      );
    if (envelope.mock_data !== true || envelope.prototype_only !== true)
      throw new ApiError("INTERNAL_ERROR", 500);
    return envelope.data;
  }
}
