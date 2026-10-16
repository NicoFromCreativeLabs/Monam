import "server-only";
import { prisma } from "@/lib/prisma";
import {
  TIER_DEPOSIT_SETTING_KEYS,
  depositRequiredForTier,
  parseTierDepositRules,
  type DepositTier,
} from "@/lib/deposit-rules";

// Server-side read of the Depósitos settings, so a booking can't skip a
// deposit the Owner has turned on just by calling the action directly.
export async function isDepositRequired(tier: DepositTier): Promise<boolean> {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...TIER_DEPOSIT_SETTING_KEYS] } } });
  return depositRequiredForTier(tier, parseTierDepositRules(rows));
}
