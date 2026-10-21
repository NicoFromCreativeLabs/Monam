"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientOrPreview } from "@/lib/auth/dal";
import { claimCheck } from "@/lib/discount-codes";
import { ruleFromRow } from "@/lib/discount-codes-server";

// The client claims an account discount (Cyber Monday style) from Paquetes →
// Mis descuentos. It goes into her account and she uses it once at checkout.
export async function claimDiscountAction(codeId: string): Promise<{ error: string } | { ok: true }> {
  const { client } = await requireClientOrPreview();

  const row = await prisma.discountCode.findUnique({ where: { id: codeId } });
  if (!row) return { error: "Descuento no encontrado." };

  const [claimsSoFar, existing] = await Promise.all([
    prisma.clientDiscount.count({ where: { codeId } }),
    prisma.clientDiscount.findUnique({ where: { clientId_codeId: { clientId: client.id, codeId } } }),
  ]);
  const check = claimCheck(ruleFromRow(row), { now: new Date(), claimsSoFar, alreadyClaimed: existing !== null });
  if (!check.ok) return { error: check.error };

  try {
    await prisma.clientDiscount.create({ data: { clientId: client.id, codeId } });
  } catch {
    return { error: "Ya lo reclamaste." };
  }
  revalidatePath("/my/packages");
  return { ok: true };
}
