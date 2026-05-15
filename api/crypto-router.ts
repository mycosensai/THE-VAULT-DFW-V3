import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cryptoPayments } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const DIRECT_CRYPTO_DISABLED_MESSAGE =
  "Direct wallet cryptocurrency payments are temporarily disabled until RPC verification, destination wallet validation, live pricing, and settlement controls are audited. Use Coinbase Commerce for crypto checkout.";

export const cryptoRouter = createRouter({
  createPayment: publicQuery
    .input(
      z.object({
        listingId: z.number(),
        buyerAddress: z.string().optional(),
        currency: z.enum(["SOL", "USDC"]).default("SOL"),
      })
    )
    .mutation(() => {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: DIRECT_CRYPTO_DISABLED_MESSAGE,
      });
    }),

  submitTx: publicQuery
    .input(
      z.object({
        paymentId: z.number(),
        txHash: z.string().optional(),
      })
    )
    .mutation(() => {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: DIRECT_CRYPTO_DISABLED_MESSAGE,
      });
    }),

  getStatus: publicQuery
    .input(z.object({ paymentId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [p] = await db
        .select()
        .from(cryptoPayments)
        .where(eq(cryptoPayments.id, input.paymentId))
        .limit(1);
      return p || null;
    }),

  getRate: publicQuery.query(() => ({
    disabled: true,
    solUsd: null,
    timestamp: Date.now(),
    message: DIRECT_CRYPTO_DISABLED_MESSAGE,
  })),

  listByUser: publicQuery
    .input(
      z
        .object({
          address: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      if (!input?.address) return [];
      return db
        .select()
        .from(cryptoPayments)
        .where(eq(cryptoPayments.buyerAddress, input.address))
        .orderBy(desc(cryptoPayments.createdAt))
        .limit(50);
    }),
});
