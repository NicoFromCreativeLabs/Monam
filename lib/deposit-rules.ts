// Deposit rules by appointment type, configured in Configuración → Depósitos.
// Pure (no database access) so the booking page, the booking actions and the
// WhatsApp bot all decide the same way. Defaults match how the studio worked
// before these were configurable: Signature asks for a deposit, Targeted
// does not.
export type DepositTier = "Targeted" | "Signature";

export interface TierDepositRules {
  signature: boolean;
  targeted: boolean;
}

export const TIER_DEPOSIT_SETTING_KEYS = ["deposit.requiredSignature", "deposit.requiredTargeted"] as const;

export function parseTierDepositRules(rows: { key: string; value: unknown }[]): TierDepositRules {
  const bool = (key: string, fallback: boolean) => {
    const row = rows.find((r) => r.key === key);
    return typeof row?.value === "boolean" ? row.value : fallback;
  };
  return {
    signature: bool("deposit.requiredSignature", true),
    targeted: bool("deposit.requiredTargeted", false),
  };
}

export function depositRequiredForTier(tier: DepositTier, rules: TierDepositRules): boolean {
  return tier === "Signature" ? rules.signature : rules.targeted;
}
