import "server-only";
import { prisma } from "@/lib/prisma";
import { evaluateCode, normalizeCode, type DiscountCodeRule } from "@/lib/discount-codes";

export interface AppliedCode {
  codeId: string;
  code: string;
  name: string;
  summary: string;
  amountMxn: number;
}

// Looks the code up and checks it against this ticket (dates, limits, who it
// applies to, what it takes off). Always runs on the server.
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

  const [usesSoFar, clientUsesSoFar] = await Promise.all([
    prisma.discountRedemption.count({ where: { codeId: row.id } }),
    ticket.clientId
      ? prisma.discountRedemption.count({ where: { codeId: row.id, clientId: ticket.clientId } })
      : Promise.resolve(0),
  ]);

  const rule: DiscountCodeRule = {
    code: row.code,
    name: row.name,
    kind: row.kind,
    value: row.value,
    scope: row.scope,
    addOnId: row.addOnId,
    productSku: row.productSku,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    maxUses: row.maxUses,
    onePerClient: row.onePerClient,
    isActive: row.isActive,
  };
  const result = evaluateCode(rule, {
    now: new Date(),
    usesSoFar,
    clientUsesSoFar,
    hasClient: ticket.clientId !== null,
    servicePrice: ticket.servicePrice,
    addOns: ticket.addOns,
    retail: ticket.retail,
  });
  if (!result.ok) return { error: result.error };
  return { codeId: row.id, code: row.code, name: row.name, summary: result.summary, amountMxn: result.amountMxn };
}
