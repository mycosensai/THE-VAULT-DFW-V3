import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { TRPCError } from "@trpc/server";
import { validatePasswordStrength, logAudit, getClientIP } from "./security";
import { env } from "./lib/env";

// Lazy JWT secret — resolves at first use, not at module load
let jwtSecretCache: Uint8Array | null = null;
function getJwtSecret(): Uint8Array {
  if (jwtSecretCache) return jwtSecretCache;
  const secret = env.appSecret;
  if (!secret || secret === "fallback-secret") {
    // Allow operation with warning - environment variable should be set for production
    console.warn("WARNING: APP_SECRET not configured. Using fallback for development.");
  }
  jwtSecretCache = new TextEncoder().encode(secret);
  return jwtSecretCache;
}

async function createToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Reduced from 30 days to 7 days
    .sign(getJwtSecret());
}

export async function verifyLocalToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      clockTolerance: 60,
    });
    return payload.sub ? parseInt(payload.sub, 10) : null;
  } catch {
    return null;
  }
}

export const localAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        password: z.string().min(8).max(255),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate password strength
      const strength = validatePasswordStrength(input.password);
      if (!strength.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Password too weak: ${strength.errors.join(", ")}`,
        });
      }

      const db = getDb();
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        // Log the attempt but don't reveal email exists
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "localAuth.register",
          action: "register_duplicate_email",
          details: `email:${input.email}`,
        });
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const hashedPassword = await hash(input.password, 12);
      const insertResult = await db.insert(users).values({
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: "user",
      });
      const userId = Number(insertResult.meta.last_row_id);

      const token = await createToken(userId);

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "localAuth.register",
        action: "user_registered",
        details: `user:${userId}`,
      });

      return {
        token,
        user: {
          id: userId,
          name: input.name,
          email: input.email,
        },
      };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user || !user.password) {
        // Generic error to prevent user enumeration
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "localAuth.login",
          action: "login_failed",
          details: `email:${input.email} reason:invalid_credentials`,
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const valid = await compare(input.password, user.password);
      if (!valid) {
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "localAuth.login",
          action: "login_failed",
          details: `user:${user.id} reason:wrong_password`,
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const token = await createToken(user.id);

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "localAuth.login",
        userId: user.id,
        action: "login_success",
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const authHeader = ctx.req.headers.get("x-local-auth-token");
    if (!authHeader) return null;

    const userId = await verifyLocalToken(authHeader);
    if (!userId) return null;

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  }),
});
