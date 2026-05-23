import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { blockchainCerts, listings } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { logAudit, getClientIP } from "./security";
import { TRPCError } from "@trpc/server";
import { autoTriggerFromAction } from "./lib/auto-trigger";

const SOL_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomSolAddress(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(44));
  return Array.from(bytes).map((b) => SOL_CHARS[b % 58]).join("");
}

function genHash(listingId: number, ts: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes).map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function genBlockHash(certHash: string): string {
  let hash = 0;
  for (let i = 0; i < certHash.length; i++) hash = ((hash << 5) - hash + certHash.charCodeAt(i)) | 0;
  return "0x" + Math.abs(hash).toString(16).padStart(64, "0");
}



export const blockchainRouter = createRouter({
  certify: authedQuery
    .input(
      z.object({
        listingId: z.number(),
        itemName: z.string().min(1).max(500),
        itemDescription: z.string().max(5000).optional(),
        walletAddress: z.string().min(32).max(44).regex(/^[1-9A-HJ-NP-Za-km-z]+$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Check existing cert
      const [existing] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.listingId, input.listingId)).limit(1);
      if (existing) return { success: false, error: "Item already certified", cert: existing };

      // Verify listing exists
      const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });

      // Generate all values for atomic insert
      const ts = Date.now();
      const certHash = genHash(input.listingId, ts);
      const contractAddr = randomSolAddress();
      const blockHash = genBlockHash(certHash);
      const r = crypto.getRandomValues(new Uint32Array(2));
      const tokenId = String((r[0] % 1_000_000) + 1);
      const blockNum = Number((r[1] % 900_000_000) + 100_000_000);

      const result = await db.insert(blockchainCerts).values({
        listingId: input.listingId,
        userId: ctx.user?.id || null,
        certificateHash: certHash,
        contractAddress: contractAddr,
        tokenId,
        blockHash,
        blockNumber: blockNum,
        network: "solana_devnet",
        itemName: input.itemName,
        itemDescription: input.itemDescription || null,
        metadataUri: "",
        status: "minted",
        certificationFee: "0.002",
      });

      const certId = Number(result.meta.last_row_id);

      // Update listing in parallel
      await db.update(listings).set({
        isCertified: true,
        tokenContractAddress: contractAddr,
        certificationId: certId,
      }).where(eq(listings.id, input.listingId));

      autoTriggerFromAction("verify", input.itemName, undefined, listing.price ? Number(listing.price) : undefined, input.listingId);
      autoTriggerFromAction("tokenize", input.itemName, undefined, listing.price ? Number(listing.price) : undefined, input.listingId);

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "blockchain.certify",
        userId: ctx.user?.id,
        action: "item_certified",
        details: `listing:${input.listingId} cert:${certId}`,
      });

      return {
        success: true,
        cert: {
          id: certId,
          certificateHash: certHash,
          contractAddress: contractAddr,
          tokenId,
          blockHash,
          blockNumber: blockNum,
          network: "solana_devnet",
          status: "minted",
          itemName: input.itemName,
        },
        message: "Item certified. Certificate of authenticity generated.",
        disclaimer:
          "This is a simulated blockchain certificate for demonstration purposes. For production deployment, integrate with Solana Program Library (SPL) Token program via @solana/web3.js to execute real on-chain transactions.",
      };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [c] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.id, input.id)).limit(1);
      if (!c) return null;
      return {
        ...c,
        disclaimer: "Simulated certificate — not on mainnet",
      };
    }),

  getByListing: publicQuery
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [c] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.listingId, input.listingId)).limit(1);
      if (!c) return null;
      return {
        ...c,
        disclaimer: "Simulated certificate — not on mainnet",
      };
    }),

  verify: publicQuery
    .input(z.object({ certificateHash: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [c] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.certificateHash, input.certificateHash)).limit(1);
      if (!c) return { valid: false, message: "Certificate not found" };
      return {
        valid: c.status === "minted",
        cert: c,
        message: c.status === "minted" ? "Certificate verified in Vault records" : "Pending/failed",
        network: c.network,
        blockHash: c.blockHash,
        blockNumber: c.blockNumber,
        disclaimer: "This verifies the certificate exists in Vault records. For full blockchain verification, query the Solana devnet explorer.",
      };
    }),

  list: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(blockchainCerts)
      .where(eq(blockchainCerts.status, "minted"))
      .orderBy(desc(blockchainCerts.createdAt))
      .limit(50);
  }),
});
