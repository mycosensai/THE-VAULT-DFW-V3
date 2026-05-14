import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
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
  const ctx: TrpcContext = {
    req: opts.req,
    resHeaders: opts.resHeaders,
  };

  // OAuth session auth
  try {
    const oauthUser = await verifyOAuthSession(opts.req.headers);

    if (oauthUser) {
      ctx.user = oauthUser as User;
      return ctx;
    }
  } catch {
    // OAuth session invalid
  }

  // Local auth fallback
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
    // Local auth invalid
  }

  return ctx;
}
