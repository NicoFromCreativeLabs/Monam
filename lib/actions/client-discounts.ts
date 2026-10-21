"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientOrPreview } from "@/lib/auth/dal";
import { claimCheck, normalizeCode } from "@/lib/discount-codes";
import { ruleFromRow } from "@/lib/discount-codes-server";

// The client claims an account discount (Cyber Monday style) from Paquetes →
// Mis descuentos. It goes into her account and she uses it once at checkout.
export async function claimDiscountAction(codeId: string): Promise<{ error: string } | { ok: true }> {
  const { client } = await requireClientOrPreview();
  return claimFor(client.id, codeId);
}

// The client scans a promo QR (or types its code) to add that discount to her
// account. Checkout codes are not added to an account: they are shown at the
// front desk; launch codes are only for new accounts.
export async function claimDiscountByCodeAction(
  rawCode: string,
): Promise<{ error: string } | { ok: true; name: string }> {
  const { client } = await requireClientOrPreview();

  const code = normalizeCode(rawCode);
  if (!code) return { error: "Escribe o escanea el código." };
  const row = await prisma.discountCode.findUnique({ where: { code } });
  if (!row) return { error: "Ese código no existe." };
  if (row.mode === "CHECKOUT") {
    return { error: "Este código se usa en recepción al pagar: muéstralo ahí, no se agrega a tu cuenta." };
  }
  if (row.accountGrant === "SIGNUP") return { error: "Este descuento es solo para cuentas nuevas." };

  const result = await claimFor(client.id, row.id);
  return "error" in result ? result : { ok: true, name: row.name };
}

async function claimFor(clientId: string, codeId: string): Promise<{ error: string } | { ok: true }> {
  const row = await prisma.discountCode.findUnique({ where: { id: codeId } });
  if (!row) return { error: "Descuento no encontrado." };

  const [claimsSoFar, existing] = await Promise.all([
    prisma.clientDiscount.count({ where: { codeId } }),
    prisma.clientDiscount.findUnique({ where: { clientId_codeId: { clientId, codeId } } }),
  ]);
  const check = claimCheck(ruleFromRow(row), { now: new Date(), claimsSoFar, alreadyClaimed: existing !== null });
  if (!check.ok) return { error: check.error };

  try {
    await prisma.clientDiscount.create({ data: { clientId, codeId } });
  } catch {
    return { error: "Ya lo reclamaste." };
  }
  revalidatePath("/my/packages");
  return { ok: true };
}
