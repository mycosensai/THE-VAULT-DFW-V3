import { and, eq } from "drizzle-orm";
import { sellerProfiles, users } from "@db/schema";
import { getDb } from "./queries/connection";

function toHandleSeed(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (cleaned.length >= 3) return cleaned.slice(0, 32);
  return `seller-${Date.now().toString(36).slice(-6)}`;
}

export async function generateUniqueHandle(seed: string, userId?: number): Promise<string> {
  const db = getDb();
  const base = toHandleSeed(seed);

  for (let i = 0; i < 30; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const [existing] = await db
      .select({ id: sellerProfiles.id, userId: sellerProfiles.userId })
      .from(sellerProfiles)
      .where(eq(sellerProfiles.handle, candidate))
      .limit(1);

    if (!existing || (userId !== undefined && existing.userId === userId)) {
      return candidate;
    }
  }

  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function ensureSellerProfile(userId: number): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ id: sellerProfiles.id })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, userId))
    .limit(1);

  if (existing) return;

  const [user] = await db
    .select({ name: users.name, email: users.email, avatar: users.avatar })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const seed = user?.name || user?.email || `seller-${userId}`;
  const handle = await generateUniqueHandle(seed, userId);

  await db.insert(sellerProfiles).values({
    userId,
    handle,
    displayName: user?.name || null,
    contactEmail: user?.email || null,
    avatarUrl: user?.avatar || null,
  });
}

export type SellerProfileWithUser = {
  id: number;
  userId: number;
  handle: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  contactEmail: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  accentColor: string | null;
  isPublic: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getSellerProfileForUser(userId: number): Promise<SellerProfileWithUser | null> {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, userId))
    .limit(1);

  return (profile as SellerProfileWithUser | undefined) || null;
}

export async function getPublicSellerProfileByHandle(handle: string): Promise<SellerProfileWithUser | null> {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(sellerProfiles)
    .where(and(eq(sellerProfiles.handle, handle), eq(sellerProfiles.isPublic, true)))
    .limit(1);

  return (profile as SellerProfileWithUser | undefined) || null;
}
