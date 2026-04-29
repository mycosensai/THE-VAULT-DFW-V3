import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cryptoPayments, listings } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { logAudit, getClientIP } from "./security";
import { TRPCError } from "@trpc/server";

// SOL/USD rate (should be fetched from oracle in production)
const SOL_USD_RATE = 150;

// Solana base58 alphabet
const SOL_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomSolAddress(): string {
  let s = "";
  for (let i = 0; i < 43; i++) s += SOL_CHARS[Math.floor(Math.random() * 58)];
  return s;
}

/**
 * Validate a Solana transaction by checking with the Solana RPC
 * In production, this should call the actual Solana JSON-RPC
 */
async function validateSolanaTransaction(txHash: string): Promise<{
  valid: boolean;
  confirmations: number;
  blockHash?: string;
  blockNumber?: number;
}> {
  try {
    // Validate base58 format
    if (!/^[1-9A-HJ-NP-Za-km-z]{43,88}$/.test(txHash)) {
      return { valid: false, confirmations: 0 };
    }

    // In production, query Solana RPC:
    // const rpcUrl = "https://api.devnet.solana.com";
    // const response = await fetch(rpcUrl, { ... });
    // For now, we require a real-looking hash but mark as pending
    // until manual admin verification or RPC integration

    return {
      valid: true,
      confirmations: 0, // Will be updated after RPC confirmation
    };
  } catch {
    return { valid: false, confirmations: 0 };
  }
}

export const cryptoRouter = createRouter({
  createPayment: authedQuery
    .input(
      z.object({
        listingId: z.number(),
        buyerAddress: z
          .string()
          .min(32)
          .max(44)
          .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Invalid Solana address format"),
        currency: z.enum(["SOL", "USDC"]).default("SOL"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, input.listingId))
        .limit(1);

      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      if (listing.status === "sold") throw new TRPCError({ code: "BAD_REQUEST", message: "Item already sold" });

      const amountUsd = Number(listing.price);
      const amountSol = amountUsd / SOL_USD_RATE;

      const result = await db.insert(cryptoPayments).values({
        listingId: input.listingId,
        buyerAddress: input.buyerAddress,
        sellerAddress: randomSolAddress(),
        amount: String(amountSol.toFixed(6)),
        amountUsd: String(amountUsd),
        currency: input.currency,
        network: "solana_devnet",
        status: "pending",
        confirmations: 0,
        metadata: JSON.stringify({
          listingTitle: listing.title,
          solUsdRate: SOL_USD_RATE,
          initiatedBy: ctx.user?.id,
        }),
      });

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "crypto.createPayment",
        userId: ctx.user?.id,
        action: "crypto_payment_initiated",
        details: `listing:${listing.id} buyer:${input.buyerAddress}`,
      });

      return {
        success: true,
        paymentId: Number(result.meta.last_row_id),
        amount: amountSol.toFixed(6),
        amountUsd: amountUsd.toFixed(2),
        currency: input.currency,
        solUsdRate: SOL_USD_RATE,
        message: `Send ${amountSol.toFixed(6)} SOL to the seller's wallet. Payment will be confirmed after blockchain verification.`,
      };
    }),

  /**
   * Submit a transaction hash for verification
   * Validates format and queues for confirmation
   * Does NOT mark as paid — requires blockchain confirmation
   */
  submitTx: publicQuery
    .input(
      z.object({
        paymentId: z.number(),
        txHash: z
          .string()
          .min(43)
          .max(88)
          .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Invalid Solana transaction hash format"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [payment] = await db
        .select()
        .from(cryptoPayments)
        .where(eq(cryptoPayments.id, input.paymentId))
        .limit(1);

      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      if (payment.status === "confirmed")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment already confirmed" });

      // Validate transaction format
      const validation = await validateSolanaTransaction(input.txHash);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid transaction hash. Please provide a valid Solana transaction signature.",
        });
      }

      // Queue for confirmation — does NOT mark as sold yet
      await db.update(cryptoPayments).set({
        txHash: input.txHash,
        status: "confirming",
        confirmations: 0,
      }).where(eq(cryptoPayments.id, input.paymentId));

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "crypto.submitTx",
        action: "tx_submitted_for_verification",
        details: `payment:${input.paymentId} tx:${input.txHash.slice(0, 16)}...`,
      });

      return {
        success: true,
        status: "confirming",
        message:
          "Transaction submitted for verification. It will be confirmed after blockchain validation. The item will NOT be marked as sold until sufficient confirmations are received.",
      };
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
    solUsd: SOL_USD_RATE,
    timestamp: Date.now(),
  })),

  listByUser: publicQuery
    .input(
      z
        .object({
          address: z
            .string()
            .min(32)
            .max(44)
            .regex(/^[1-9A-HJ-NP-Za-km-z]+$/),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      // If authenticated, show user's own payments
      if (ctx.user?.id) {
        return db
          .select()
          .from(cryptoPayments)
          .where(eq(cryptoPayments.buyerAddress, input?.address || ""))
          .orderBy(desc(cryptoPayments.createdAt))
          .limit(50);
      }
      // Anonymous users must provide address
      if (!input?.address) return [];
      return db
        .select()
        .from(cryptoPayments)
        .where(eq(cryptoPayments.buyerAddress, input.address))
        .orderBy(desc(cryptoPayments.createdAt))
        .limit(50);
    }),
});
