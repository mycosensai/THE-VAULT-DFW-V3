import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { verifyOAuthSession } from "./oauth-handlers";
import { verifyLocalToken } from "./local-auth-router";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try Kimi OAuth first (existing)
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
    if (ctx.user) return ctx;
  } catch {
    // Kimi auth not present or invalid
  }

  // Try Google/X/GitHub OAuth session
  try {
    const oauthUser = await verifyOAuthSession(opts.req.headers);
    if (oauthUser) {
      ctx.user = oauthUser as User;
      return ctx;
    }
  } catch {
    // OAuth session not present or invalid
  }

  // Try local auth (x-local-auth-token header)
  try {
    const localToken = opts.req.headers.get("x-local-auth-token");
    if (localToken) {
      const userId = await verifyLocalToken(localToken);
      if (userId) {
        const db = getDb();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (user) {
          ctx.user = user;
        }
      }
    }
  } catch {
    // Local auth not present or invalid
  }

  return ctx;
}
