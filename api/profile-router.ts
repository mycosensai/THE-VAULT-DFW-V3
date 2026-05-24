import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { listings, sellerProfiles } from "@db/schema";
import { authedQuery, createRouter, publicQuery } from "./middleware";
import {
  ensureSellerProfile,
  generateUniqueHandle,
  getPublicSellerProfileByHandle,
  getSellerProfileForUser,
} from "./profile-service";
import { getDb } from "./queries/connection";
import { sanitizeInput } from "./security";

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // Fall through to comma-separated parsing
  }
  return trimmed
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeHandle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function normalizeUrl(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    return null;
  }
}

export const profileRouter = createRouter({
  me: authedQuery.query(async ({ ctx }) => {
    await ensureSellerProfile(ctx.user.id);
    const profile = await getSellerProfileForUser(ctx.user.id);
    const db = getDb();
    const userListings = await db
      .select()
      .from(listings)
      .where(and(eq(listings.sellerId, ctx.user.id), eq(listings.status, "active")))
      .orderBy(desc(listings.createdAt))
      .limit(50);

    return {
      profile,
      listings: userListings.map((item) => {
        const images = parseStringArray(item.images);
        const features = parseStringArray(item.features);
        return {
          ...item,
          images,
          features,
          image: images[0] || null,
        };
      }),
    };
  }),

  byHandle: publicQuery
    .input(
      z.object({
        handle: z.string().min(3).max(32),
      }),
    )
    .query(async ({ input }) => {
      const normalizedHandle = normalizeHandle(input.handle);
      if (!normalizedHandle) return null;

      const profile = await getPublicSellerProfileByHandle(normalizedHandle);
      if (!profile) return null;

      const db = getDb();
      const userListings = await db
        .select()
        .from(listings)
        .where(and(eq(listings.sellerId, profile.userId), eq(listings.status, "active")))
        .orderBy(desc(listings.createdAt))
        .limit(50);

      return {
        profile,
        listings: userListings.map((item) => {
          const images = parseStringArray(item.images);
          const features = parseStringArray(item.features);
          return {
            ...item,
            images,
            features,
            image: images[0] || null,
          };
        }),
      };
    }),

  update: authedQuery
    .input(
      z.object({
        handle: z.string().min(3).max(32).optional(),
        displayName: z.string().max(120).optional(),
        bio: z.string().max(700).optional(),
        location: z.string().max(120).optional(),
        website: z.string().max(255).optional(),
        contactEmail: z.string().email().max(320).optional(),
        avatarUrl: z.string().max(2000).optional(),
        bannerUrl: z.string().max(2000).optional(),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureSellerProfile(ctx.user.id);
      const existing = await getSellerProfileForUser(ctx.user.id);
      if (!existing) {
        throw new Error("Unable to initialize seller profile");
      }

      const db = getDb();
      const nextHandle = input.handle
        ? await generateUniqueHandle(normalizeHandle(input.handle), ctx.user.id)
        : existing.handle;
      const normalizedWebsite = normalizeUrl(input.website);
      const normalizedAvatarUrl = normalizeUrl(input.avatarUrl);
      const normalizedBannerUrl = normalizeUrl(input.bannerUrl);

      await db
        .update(sellerProfiles)
        .set({
          handle: nextHandle,
          displayName:
            input.displayName !== undefined ? sanitizeInput(input.displayName.trim()) || null : existing.displayName,
          bio: input.bio !== undefined ? sanitizeInput(input.bio.trim()) || null : existing.bio,
          location:
            input.location !== undefined ? sanitizeInput(input.location.trim()) || null : existing.location,
          website: normalizedWebsite !== undefined ? normalizedWebsite : existing.website,
          contactEmail:
            input.contactEmail !== undefined ? input.contactEmail.trim().toLowerCase() || null : existing.contactEmail,
          avatarUrl: normalizedAvatarUrl !== undefined ? normalizedAvatarUrl : existing.avatarUrl,
          bannerUrl: normalizedBannerUrl !== undefined ? normalizedBannerUrl : existing.bannerUrl,
          accentColor: input.accentColor !== undefined ? input.accentColor : existing.accentColor,
          isPublic: input.isPublic !== undefined ? input.isPublic : existing.isPublic,
          updatedAt: new Date(),
        })
        .where(eq(sellerProfiles.userId, ctx.user.id));

      return getSellerProfileForUser(ctx.user.id);
    }),
});
