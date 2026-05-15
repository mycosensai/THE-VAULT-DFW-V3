import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cryptoPayments, listings } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAudit, getClientIP } from "./security";
import { env } from "./lib/env";

const LAMPORTS_PER_SOL = 1_000_000_000;
const SOLANA_MAINNET_RPC = "https://api.mainnet-beta.solana.com";
const SOL_SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{43,88}$/;
const SOL_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DIRECT_CRYPTO_DISABLED_MESSAGE =
  "Direct Solana payments require SOLANA_RECEIVER_ADDRESS and SOLANA_RPC_URL to be configured before use.";

type RpcResponse<T> = {
  jsonrpc: "2.0";
  result?: T;
  error?: { code: number; message: string };
};

type ParsedInstruction = {
  program?: string;
  parsed?: {
    type?: string;
    info?: Record<string, unknown>;
  };
};

type ParsedSolanaTransaction = {
  slot?: number;
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    fee?: number;
  } | null;
  transaction?: {
    message?: {
      accountKeys?: Array<{ pubkey?: string; signer?: boolean; writable?: boolean }>;
      instructions?: ParsedInstruction[];
    };
  };
};

function getRuntimeValue(name: string): string {
  const runtimeEnv = env as unknown as Record<string, string>;
  if (name === "SOLANA_RECEIVER_ADDRESS") return runtimeEnv.solanaReceiverAddress || "";
  if (name === "TREASURY_WALLET") return runtimeEnv.treasuryWallet || "";
  if (name === "SOLANA_RPC_URL") return runtimeEnv.solanaRpcUrl || "";
  if (name === "SOL_USD_RATE") return runtimeEnv.solUsdRate || "";
  return "";
}

function getReceiverAddress(): string {
  return getRuntimeValue("SOLANA_RECEIVER_ADDRESS") || getRuntimeValue("TREASURY_WALLET");
}

function getRpcUrl(): string {
  return getRuntimeValue("SOLANA_RPC_URL") || SOLANA_MAINNET_RPC;
}

function getSolUsdRate(): number {
  const configured = Number(getRuntimeValue("SOL_USD_RATE"));
  return Number.isFinite(configured) && configured > 0 ? configured : 0;
}

function assertDirectCryptoConfigured() {
  const receiver = getReceiverAddress();
  const rate = getSolUsdRate();

  if (!receiver || !SOL_ADDRESS_RE.test(receiver)) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: DIRECT_CRYPTO_DISABLED_MESSAGE });
  }

  if (!rate) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Direct Solana payments require SOL_USD_RATE or a live pricing service before use.",
    });
  }
}

async function callSolanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
  });

  if (!response.ok) {
    throw new Error(`Solana RPC HTTP ${response.status}`);
  }

  const payload = (await response.json()) as RpcResponse<T>;
  if (payload.error) {
    throw new Error(`Solana RPC error ${payload.error.code}: ${payload.error.message}`);
  }

  return payload.result as T;
}

function readLamports(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hasExpectedSolTransfer(tx: ParsedSolanaTransaction, expectedDestination: string, expectedLamports: number) {
  const instructions = tx.transaction?.message?.instructions || [];

  return instructions.some((instruction) => {
    if (instruction.program !== "system") return false;
    if (instruction.parsed?.type !== "transfer") return false;

    const info = instruction.parsed.info || {};
    const destination = String(info.destination || "");
    const lamports = readLamports(info.lamports);

    return destination === expectedDestination && lamports >= expectedLamports;
  });
}

async function verifySolanaPayment(input: {
  txHash: string;
  expectedDestination: string;
  expectedSolAmount: number;
}) {
  if (!SOL_SIGNATURE_RE.test(input.txHash)) {
    return { valid: false, confirmations: 0, reason: "Invalid Solana transaction signature format" };
  }

  if (!SOL_ADDRESS_RE.test(input.expectedDestination)) {
    return { valid: false, confirmations: 0, reason: "Invalid destination wallet configuration" };
  }

  const tx = await callSolanaRpc<ParsedSolanaTransaction | null>("getTransaction", [
    input.txHash,
    {
      encoding: "jsonParsed",
      commitment: "finalized",
      maxSupportedTransactionVersion: 0,
    },
  ]);

  if (!tx) {
    return { valid: false, confirmations: 0, reason: "Transaction not found or not finalized" };
  }

  if (tx.meta?.err) {
    return { valid: false, confirmations: 0, reason: "Transaction failed on-chain" };
  }

  const expectedLamports = Math.ceil(input.expectedSolAmount * LAMPORTS_PER_SOL);
  const transferFound = hasExpectedSolTransfer(tx, input.expectedDestination, expectedLamports);

  if (!transferFound) {
    return {
      valid: false,
      confirmations: 0,
      reason: "No finalized SOL transfer to the expected destination for the required amount was found",
    };
  }

  return {
    valid: true,
    confirmations: 1,
    blockNumber: tx.slot,
    blockTime: tx.blockTime ?? null,
    reason: "Finalized Solana payment verified by RPC",
  };
}

export const cryptoRouter = createRouter({
  createPayment: authedQuery
    .input(
      z.object({
        listingId: z.number(),
        buyerAddress: z.string().regex(SOL_ADDRESS_RE, "Invalid Solana wallet address"),
        currency: z.enum(["SOL"]).default("SOL"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertDirectCryptoConfigured();

      const db = getDb();
      const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);

      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      if (listing.status === "sold") throw new TRPCError({ code: "BAD_REQUEST", message: "Item already sold" });

      const amountUsd = Number(listing.price);
      const solUsdRate = getSolUsdRate();
      const amountSol = amountUsd / solUsdRate;
      const receiver = getReceiverAddress();

      const result = await db.insert(cryptoPayments).values({
        listingId: input.listingId,
        buyerAddress: input.buyerAddress,
        sellerAddress: receiver,
        amount: amountSol.toFixed(9),
        amountUsd: amountUsd.toFixed(2),
        currency: "SOL",
        network: "solana_mainnet",
        status: "pending",
        confirmations: 0,
        metadata: JSON.stringify({
          listingTitle: listing.title,
          solUsdRate,
          receiver,
          initiatedBy: ctx.user?.id,
        }),
      });

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "crypto.createPayment",
        userId: ctx.user?.id,
        action: "direct_solana_payment_created",
        details: `listing:${listing.id} receiver:${receiver}`,
      });

      return {
        success: true,
        paymentId: Number(result.meta.last_row_id),
        destinationAddress: receiver,
        amount: amountSol.toFixed(9),
        amountUsd: amountUsd.toFixed(2),
        currency: "SOL",
        network: "solana_mainnet",
        solUsdRate,
        message: `Send exactly ${amountSol.toFixed(9)} SOL to ${receiver}. The item will only be marked paid after finalized RPC verification.`,
      };
    }),

  submitTx: authedQuery
    .input(
      z.object({
        paymentId: z.number(),
        txHash: z.string().regex(SOL_SIGNATURE_RE, "Invalid Solana transaction signature"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertDirectCryptoConfigured();

      const db = getDb();
      const [payment] = await db
        .select()
        .from(cryptoPayments)
        .where(eq(cryptoPayments.id, input.paymentId))
        .limit(1);

      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      if (payment.status === "confirmed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment already confirmed" });
      }
      if (payment.txHash && payment.txHash !== input.txHash) {
        throw new TRPCError({ code: "CONFLICT", message: "A different transaction is already attached to this payment" });
      }

      const destination = payment.sellerAddress || getReceiverAddress();
      const amount = Number(payment.amount);
      const verification = await verifySolanaPayment({
        txHash: input.txHash,
        expectedDestination: destination,
        expectedSolAmount: amount,
      });

      if (!verification.valid) {
        await db
          .update(cryptoPayments)
          .set({ txHash: input.txHash, status: "verification_failed", confirmations: 0 })
          .where(eq(cryptoPayments.id, input.paymentId));

        throw new TRPCError({ code: "BAD_REQUEST", message: verification.reason });
      }

      await db
        .update(cryptoPayments)
        .set({
          txHash: input.txHash,
          status: "confirmed",
          confirmations: verification.confirmations,
          blockNumber: verification.blockNumber ?? null,
          metadata: JSON.stringify({
            ...(payment.metadata ? JSON.parse(payment.metadata) : {}),
            verification,
            verifiedAt: Date.now(),
          }),
        })
        .where(eq(cryptoPayments.id, input.paymentId));

      await db.update(listings).set({ status: "sold" }).where(eq(listings.id, payment.listingId));

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "crypto.submitTx",
        userId: ctx.user?.id,
        action: "direct_solana_payment_verified",
        details: `payment:${input.paymentId} tx:${input.txHash.slice(0, 16)}...`,
      });

      return {
        success: true,
        status: "confirmed",
        message: "Finalized Solana payment verified by RPC and listing marked sold.",
        verification,
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

  getRate: publicQuery.query(() => {
    const rate = getSolUsdRate();
    const receiver = getReceiverAddress();
    return {
      enabled: Boolean(rate && receiver && SOL_ADDRESS_RE.test(receiver)),
      solUsd: rate || null,
      destinationConfigured: Boolean(receiver && SOL_ADDRESS_RE.test(receiver)),
      timestamp: Date.now(),
      message: rate && receiver ? "Direct Solana payment verification is configured." : DIRECT_CRYPTO_DISABLED_MESSAGE,
    };
  }),

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
