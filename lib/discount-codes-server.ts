import "server-only";
import { prisma } from "@/lib/prisma";
import { evaluateCode, normalizeCode, type DiscountCodeRule } from "@/lib/discount-codes";
import type { DiscountCode } from "@/lib/generated/prisma/client";

export interface AppliedCode {
  codeId: string;
  code: string;
  name: string;
  summary: string;
  amountMxn: number;
  // ACCOUNT codes: the client's discount that this sale spends.
  claimId: string | null;
}

export function ruleFromRow(row: DiscountCode): DiscountCodeRule {
  return {
    code: row.code,
    name: row.name,
    kind: row.kind,
    value: row.value,
    scope: row.scope,
    mode: row.mode,
    accountGrant: row.accountGrant,
    addOnId: row.addOnId,
    productSku: row.productSku,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    claimUntil: row.claimUntil,
    maxUses: row.maxUses,
    onePerClient: row.onePerClient,
    isActive: row.isActive,
  };
}

// Looks the code up and checks it against this ticket (dates, limits, who it
// applies to, what it takes off). A checkout code works for anyone, every time
// (within its limits); an account code needs the client to have it in her account.
// Always runs on the server.
export async function evaluateCodeForTicket(
  rawCode: string,
  ticket: {
    clientId: string | null;
    servicePrice: number;
    addOns: { addOnId: string; price: number }[];
    retail: { sku: string; price: number; qty: number }[];
  },
): Promise<AppliedCode | { error: string }> {
  const code = normalizeCode(rawCode);
  if (!code) return { error: "Escribe o escanea el código." };

  const row = await prisma.discountCode.findUnique({ where: { code } });
  if (!row) return { error: "Ese código no existe." };

  const [usesSoFar, clientUsesSoFar, claim] = await Promise.all([
    prisma.discountRedemption.count({ where: { codeId: row.id } }),
    ticket.clientId
      ? prisma.discountRedemption.count({ where: { codeId: row.id, clientId: ticket.clientId } })
      : Promise.resolve(0),
    row.mode === "ACCOUNT" && ticket.clientId
      ? prisma.clientDiscount.findUnique({ where: { clientId_codeId: { clientId: ticket.clientId, codeId: row.id } } })
      : Promise.resolve(null),
  ]);

  const result = evaluateCode(ruleFromRow(row), {
    now: new Date(),
    usesSoFar,
    clientUsesSoFar,
    hasClient: ticket.clientId !== null,
    claim: { exists: claim !== null, used: claim?.redeemedAt != null },
    servicePrice: ticket.servicePrice,
    addOns: ticket.addOns,
    retail: ticket.retail,
  });
  if (!result.ok) return { error: result.error };
  return {
    codeId: row.id,
    code: row.code,
    name: row.name,
    summary: result.summary,
    amountMxn: result.amountMxn,
    claimId: claim?.id ?? null,
  };
}
