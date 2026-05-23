import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listings, categories } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { sanitizeInput, logAudit, getClientIP } from "./security";
import { autoTriggerFromAction } from "./lib/auto-trigger";
import { getCommissionRateFromTiers } from "./lib/commission";

export const listingsRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        status: z.string().optional().default("active"),
        certified: z.boolean().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters: any[] = [];
      const params = (input || {}) as Record<string, any>;

      if (params.status) {
        filters.push(eq(listings.status, params.status as "active" | "sold" | "pending" | "withdrawn") as any);
      }
      if (params.category) {
        const [cat] = await db.select().from(categories).where(eq(categories.slug, params.category)).limit(1);
        if (cat) {
          filters.push(eq(listings.categoryId, cat.id) as any);
        }
      }
      if (params.certified === true) {
        filters.push(eq(listings.isCertified, true) as any);
      }

      const where = filters.length > 0 ? sql`${sql.join(filters, sql` AND `)}` : undefined;

      const items = await db
        .select()
        .from(listings)
        .where(where)
        .orderBy(desc(listings.createdAt))
        .limit(params.limit || 20)
        .offset(params.offset || 0);

      // Get category names
      const cats = await db.select().from(categories);
      const catMap = new Map(cats.map(c => [c.id, c]));

      return items.map(item => ({
        ...item,
        category: catMap.get(item.categoryId) || null,
        image: item.images?.[0] || null,
      }));
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [item] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, input.id))
        .limit(1);

      if (!item) return null;

      const [cat] = await db.select().from(categories).where(eq(categories.id, item.categoryId)).limit(1);

      // Increment view count
      await db.update(listings)
        .set({ viewCount: sql`${listings.viewCount} + 1` })
        .where(eq(listings.id, input.id));

      return { ...item, category: cat || null, image: item.images?.[0] || null };
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(5000).optional(),
        categoryId: z.number(),
        price: z.number().positive(),
        condition: z.enum(["mint", "excellent", "very_good", "good", "fair"]).default("very_good"),
        images: z.array(z.string().url().max(2000)).max(20).optional(),
        features: z.array(z.string().max(200)).max(50).optional(),
        isBuyNow: z.boolean().default(true),
        isConsignment: z.boolean().default(false),
        badge: z.enum(["verified", "new", "hot", "offer", "none"]).default("none"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const rate = await getCommissionRateFromTiers(db, input.price);

      // Sanitize text inputs to prevent XSS
      const sanitizedInput = {
        title: sanitizeInput(input.title),
        description: input.description ? sanitizeInput(input.description) : undefined,
        features: input.features?.map((f) => sanitizeInput(f)),
      };

      const result = await db.insert(listings).values({
        title: sanitizedInput.title,
        description: sanitizedInput.description,
        categoryId: input.categoryId,
        price: String(input.price),
        condition: input.condition,
        images: input.images,
        features: sanitizedInput.features,
        isBuyNow: input.isBuyNow,
        isConsignment: input.isConsignment,
        badge: input.badge,
        commissionRate: rate,
        sellerId: ctx.user?.id || null,
        status: "active",
      });

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "listings.create",
        userId: ctx.user?.id,
        action: "listing_created",
        details: `id:${result.meta.last_row_id}`,
      });

      // ─── AUTONOMOUS TRIGGER: Dispatch outreach agents ───
      // Fire-and-forget: agents work in background while user continues
      const listingId = Number(result.meta.last_row_id);
      const cat = await db.select().from(categories).where(eq(categories.id, input.categoryId)).limit(1);
      autoTriggerFromAction("sell", sanitizedInput.title, cat[0]?.name || undefined, input.price, listingId);

      return { id: listingId, success: true };
    }),

  featured: publicQuery.query(async () => {
    const db = getDb();
    const items = await db
      .select()
      .from(listings)
      .where(eq(listings.status, "active"))
      .orderBy(desc(listings.createdAt))
      .limit(6);

    const cats = await db.select().from(categories);
    const catMap = new Map(cats.map(c => [c.id, c]));

    return items.map(item => ({
      ...item,
      category: catMap.get(item.categoryId) || null,
      image: item.images?.[0] || null,
    }));
  }),

  certified: publicQuery.query(async () => {
    const db = getDb();
    const items = await db
      .select()
      .from(listings)
      .where(eq(listings.isCertified, true))
      .orderBy(desc(listings.createdAt))
      .limit(20);

    const cats = await db.select().from(categories);
    const catMap = new Map(cats.map(c => [c.id, c]));

    return items.map(item => ({
      ...item,
      category: catMap.get(item.categoryId) || null,
      image: item.images?.[0] || null,
    }));
  }),
});
