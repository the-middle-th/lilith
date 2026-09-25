import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { PrototypeStore, SessionRecord } from "./store.js";
import { ApiError } from "./errors.js";
export const COOKIE_NAME = "lilith_prototype_session";
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export class SessionAuth {
  constructor(
    private readonly store: PrototypeStore,
    private readonly now: () => number,
  ) {}
  sign(session: SessionRecord): string {
    const payload = Buffer.from(`${session.id}.${session.expires}`).toString(
      "base64url",
    );
    const signature = createHmac("sha256", this.store.signingKey)
      .update(payload)
      .digest("base64url");
    return `${payload}.${signature}`;
  }
  cookie(session: SessionRecord): string {
    return `${COOKIE_NAME}=${this.sign(session)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`;
  }
  read(request: IncomingMessage): SessionRecord | null {
    const cookies = (request.headers.cookie ?? "")
      .split(";")
      .map((entry) => entry.trim())
      .filter((entry) => entry.startsWith(`${COOKIE_NAME}=`));
    if (cookies.length !== 1) return null;
    const token = cookies[0]?.slice(COOKIE_NAME.length + 1) ?? "";
    const [payload, signature, extra] = token.split(".");
    if (
      !payload ||
      !signature ||
      extra ||
      payload.length > 250 ||
      signature.length > 80
    )
      return null;
    const expected = createHmac("sha256", this.store.signingKey)
      .update(payload)
      .digest();
    const supplied = Buffer.from(signature, "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      return null;
    const [id, expiresText, extraPayload] = Buffer.from(payload, "base64url")
      .toString("utf8")
      .split(".");
    if (!id || !expiresText || extraPayload) return null;
    const expires = Number(expiresText);
    const session = this.store.read().sessions[id];
    if (!session || session.expires !== expires || expires <= this.now())
      return null;
    return session;
  }
  authenticate(request: IncomingMessage): SessionRecord {
    const session = this.read(request);
    if (!session) throw new ApiError(401, "UNAUTHORIZED");
    return session;
  }
  async create(
    role: "guest" | "operations" = "guest",
    scopes: string[] = [],
  ): Promise<SessionRecord> {
    const session: SessionRecord = {
      id: `mock-session-${randomUUID()}`,
      expires: this.now() + SESSION_TTL_MS,
      csrf: randomBytes(32).toString("base64url"),
      locale: "th",
      role,
      scopes,
    };
    return this.store.transact((draft) => {
      draft.sessions[session.id] = session;
      return session;
    });
  }
}
