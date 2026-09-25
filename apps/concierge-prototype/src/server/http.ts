import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PROTOTYPE_FLAGS } from "../shared/contracts.js";
import type { ApiErrorCode } from "../shared/contracts.js";
import { IMAGE_FIXTURES } from "../shared/catalog.js";
import { ROUTES, TEMPLATE_IDS, resolveRoute } from "../shared/routes.js";
import { PrototypeStore } from "./store.js";
import type { StoreHooks } from "./store.js";
import { SessionAuth } from "./auth.js";
import { RequestService } from "./service.js";
import { ApiError, invariant } from "./errors.js";
import type { Action } from "./validation.js";

export interface ServerOptions {
  storeDir: string;
  publicDir: string;
  port?: number;
  now?: () => number;
  testHooks?: StoreHooks;
  enableTestHarness?: boolean;
  logger?: (entry: { event: "request"; code: ApiErrorCode | "OK" }) => void;
}
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};
async function assetInventory(
  directory: string,
  prefix = "",
): Promise<Set<string>> {
  const paths = new Set<string>();
  for (const entry of await readdir(path.join(directory, prefix), {
    withFileTypes: true,
  })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      for (const nested of await assetInventory(directory, relative))
        paths.add(nested);
    } else if (
      entry.isFile() &&
      [".css", ".js", ".svg"].includes(path.extname(entry.name)) &&
      !relative
        .split("/")
        .some((segment) => segment === "server" || segment.startsWith("."))
    )
      paths.add(relative);
  }
  return paths;
}
async function body(request: IncomingMessage): Promise<unknown> {
  invariant(
    request.headers["content-type"]?.split(";")[0]?.trim() ===
      "application/json",
    "UNSUPPORTED_MEDIA_TYPE",
    415,
  );
  const contentLength = Number(request.headers["content-length"] ?? 0);
  invariant(
    Number.isFinite(contentLength) && contentLength <= 16384,
    "BODY_TOO_LARGE",
    413,
  );
  const buffers: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string);
    length += buffer.length;
    invariant(length <= 16384, "BODY_TOO_LARGE", 413);
    buffers.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(buffers).toString("utf8")) as unknown;
  } catch {
    throw new ApiError(422, "INVALID_PAYLOAD");
  }
}
function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}
export async function createPrototypeServer(options: ServerOptions) {
  invariant(
    options.port === undefined ||
      (Number.isInteger(options.port) &&
        options.port >= 0 &&
        options.port <= 65535),
    "INVALID_PAYLOAD",
    422,
  );
  const publicDir = path.resolve(options.publicDir);
  const assets = await assetInventory(publicDir);
  const store = await PrototypeStore.open(
    path.resolve(options.storeDir),
    options.testHooks,
  );
  const now = options.now ?? Date.now;
  const auth = new SessionAuth(store, now);
  const service = new RequestService(store, now);
  let origin = "";
  async function handle(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    );
    response.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    try {
      invariant(
        request.headers.host === new URL(origin).host,
        "ORIGIN_DENIED",
        403,
      );
      invariant(
        !request.headers.origin || request.headers.origin === origin,
        "ORIGIN_DENIED",
        403,
      );
      invariant(
        !["cross-site", "same-site"].includes(
          String(request.headers["sec-fetch-site"]),
        ),
        "ORIGIN_DENIED",
        403,
      );
      const method = request.method ?? "GET";
      const url = new URL(request.url ?? "/", origin);
      invariant(
        url.origin === origin && !url.search && !url.hash,
        "NOT_FOUND",
        404,
      );
      const pathname = url.pathname;
      invariant(!/%|\\|\/\//.test(pathname), "NOT_FOUND", 404);
      if (!pathname.startsWith("/api/")) {
        invariant(
          method === "GET" || method === "HEAD",
          "METHOD_NOT_ALLOWED",
          405,
        );
        const asset = pathname.slice(1);
        if (assets.has(asset)) {
          response.writeHead(200, {
            "Content-Type":
              MIME[path.extname(asset)] ?? "application/octet-stream",
          });
          response.end(
            method === "HEAD"
              ? undefined
              : await readFile(path.join(publicDir, asset)),
          );
        } else if (pathname === "/" || resolveRoute(pathname)) {
          response.writeHead(200, { "Content-Type": MIME[".html"] });
          response.end(
            method === "HEAD"
              ? undefined
              : await readFile(path.join(publicDir, "index.html")),
          );
        } else {
          response.writeHead(404, { "Content-Type": MIME[".html"] });
          response.end(
            method === "HEAD"
              ? undefined
              : await readFile(path.join(publicDir, "index.html")),
          );
        }
        options.logger?.({ event: "request", code: "OK" });
        return;
      }
      invariant(pathname.startsWith("/api/prototype/"), "NOT_FOUND", 404);
      if (pathname === "/api/prototype/bootstrap") {
        invariant(method === "GET", "METHOD_NOT_ALLOWED", 405);
        const existing = auth.read(request);
        const session = existing ?? (await auth.create());
        if (!existing) response.setHeader("Set-Cookie", auth.cookie(session));
        const requestIds = Object.values(store.read().requests)
          .filter((entry) => entry.owner === session.id)
          .map((entry) => entry.record.id);
        json(response, 200, {
          data: {
            csrf_token: session.csrf,
            locale: session.locale,
            request_ids: requestIds,
          },
          ...PROTOTYPE_FLAGS,
        });
        return;
      }
      const session = auth.authenticate(request);
      if (pathname === "/api/prototype/routes" && method === "GET") {
        json(response, 200, {
          data: {
            routes: ROUTES,
            templates: TEMPLATE_IDS,
            version: "prototype-v1",
          },
          ...PROTOTYPE_FLAGS,
        });
        return;
      }
      if (pathname === "/api/prototype/locale" && method === "GET") {
        json(response, 200, {
          data: { locale: session.locale },
          ...PROTOTYPE_FLAGS,
        });
        return;
      }
      const operationMatch = pathname.match(
        /^\/api\/prototype\/operations\/requests\/([a-zA-Z0-9-]+)$/,
      );
      if (operationMatch && method === "GET") {
        json(response, 200, {
          data: service.get(session, operationMatch[1] ?? "", true),
          ...PROTOTYPE_FLAGS,
        });
        return;
      }
      const requestMatch = pathname.match(
        /^\/api\/prototype\/requests\/([a-zA-Z0-9-]+)(?:\/(status|notice|consent|review|handoff|images)(?:\/([a-zA-Z0-9-]+))?)?$/,
      );
      if (
        requestMatch &&
        method === "GET" &&
        !requestMatch[3] &&
        (!requestMatch[2] || requestMatch[2] === "status")
      ) {
        json(response, 200, {
          data: service.get(session, requestMatch[1] ?? ""),
          ...PROTOTYPE_FLAGS,
        });
        return;
      }
      if (
        requestMatch &&
        method === "GET" &&
        requestMatch[2] === "images" &&
        requestMatch[3]
      ) {
        const record = service.get(session, requestMatch[1] ?? "");
        const image = record.images.find(
          (entry) => entry.id === requestMatch[3],
        );
        invariant(image, "NOT_FOUND", 404);
        const fixture = IMAGE_FIXTURES.find(
          (entry) => entry.id === image.image_fixture_id,
        );
        invariant(fixture, "NOT_FOUND", 404);
        response.writeHead(200, { "Content-Type": "image/svg+xml" });
        response.end(await readFile(path.join(publicDir, fixture.src)));
        return;
      }
      let action: Action | undefined;
      let id: string | undefined;
      let imageId: string | undefined;
      if (pathname === "/api/prototype/drafts" && method === "POST")
        action = "create";
      if (pathname === "/api/prototype/locale" && method === "PUT")
        action = "locale";
      const editMatch = pathname.match(
        /^\/api\/prototype\/drafts\/([a-zA-Z0-9-]+)$/,
      );
      if (editMatch && method === "PUT") {
        action = "edit";
        id = editMatch[1];
      }
      if (requestMatch) {
        id = requestMatch[1];
        const operation = requestMatch[2];
        if (
          method === "POST" &&
          ["notice", "consent", "review", "handoff"].includes(
            operation ?? "",
          ) &&
          !requestMatch[3]
        )
          action = operation as Action;
        if (operation === "images" && method === "POST" && !requestMatch[3])
          action = "image-add";
        if (operation === "images" && method === "DELETE" && requestMatch[3]) {
          action = "image-remove";
          imageId = requestMatch[3];
        }
      }
      invariant(action, "NOT_FOUND", 404);
      invariant(request.headers.origin === origin, "ORIGIN_DENIED", 403);
      invariant(
        request.headers["x-csrf-token"] === session.csrf,
        "CSRF_INVALID",
        403,
      );
      const key = request.headers["idempotency-key"];
      invariant(
        typeof key === "string" && /^[a-zA-Z0-9_-]{8,128}$/.test(key),
        "IDEMPOTENCY_REQUIRED",
        422,
      );
      const input = await body(request);
      const reply = await service.mutate(
        session,
        action,
        method,
        pathname,
        key,
        input,
        id,
        imageId,
      );
      json(response, reply.status, { data: reply.data, ...PROTOTYPE_FLAGS });
      options.logger?.({ event: "request", code: "OK" });
    } catch (error) {
      const failure =
        error instanceof ApiError ? error : new ApiError(500, "INTERNAL_ERROR");
      options.logger?.({ event: "request", code: failure.code });
      if (!response.headersSent)
        json(response, failure.status, {
          error: { code: failure.code, message_key: `error.${failure.code}` },
          ...PROTOTYPE_FLAGS,
        });
      else response.end();
    }
  }
  const server = http.createServer((request, response) => {
    void handle(request, response);
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 40;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(options.port ?? 0, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    await store.close();
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === "string") {
    await store.close();
    throw new Error("INVALID_LOOPBACK_ADDRESS");
  }
  origin = `http://127.0.0.1:${address.port}`;
  return {
    server,
    origin,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      });
      await store.close();
    },
    ...(options.enableTestHarness
      ? {
          testHarness: {
            issueOperationsSession: async (scopes: string[]) => {
              const session = await auth.create("operations", scopes);
              return {
                cookie: auth.cookie(session).split(";")[0] ?? "",
                csrf_token: session.csrf,
              };
            },
          },
        }
      : {}),
  };
}
export type PrototypeRuntime = Awaited<
  ReturnType<typeof createPrototypeServer>
>;
