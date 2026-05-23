import { and, desc, eq, isNull, lte, gte } from "drizzle-orm";
import { commissionTiers } from "@db/schema";

export async function getCommissionRateFromTiers(db: any, value: number): Promise<string> {
  const tier = await db
    .select()
    .from(commissionTiers)
    .where(
      and(
        eq(commissionTiers.isActive, true),
        lte(commissionTiers.minAmount, String(value)),
      ),
    )
    .orderBy(desc(commissionTiers.minAmount))
    .limit(1);

  const candidate = tier[0];
  if (candidate) {
    if (!candidate.maxAmount || Number(value) <= Number(candidate.maxAmount)) {
      return String(candidate.rate);
    }
  }

  const fallback = await db
    .select()
    .from(commissionTiers)
    .where(and(eq(commissionTiers.isActive, true), isNull(commissionTiers.maxAmount)))
    .limit(1);
  if (fallback[0]) return String(fallback[0].rate);

  if (value >= 10000) return "5.00";
  if (value >= 5000) return "7.00";
  if (value >= 1000) return "10.00";
  return "12.00";
}
