"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import {
  normalizeCode,
  suggestCode,
  validateNewCode,
  type AccountGrant,
  type DiscountCodeKind,
  type DiscountMode,
  type DiscountScope,
} from "@/lib/discount-codes";

// Admin → Descuentos: Owner and Clinic Manager create the codes. A valid code is
// pre-approved by whoever created it, so the vendedor can apply it at checkout
// even above the usual approval threshold.

const MANAGER_ROLES = ["OWNER", "CLINIC_MANAGER"] as const;

export interface CreateDiscountCodeInput {
  code?: string; // empty → one is generated
  name: string;
  kind: DiscountCodeKind;
  value: number;
  scope: DiscountScope;
  addOnId?: string | null;
  productSku?: string | null;
  validFrom?: string | null; // YYYY-MM-DD
  validUntil?: string | null; // YYYY-MM-DD, valid through the end of that day
  // CHECKOUT: a QR/code the vendedor applies at the front desk, every time.
  // ACCOUNT: lives in the client's account, once per account — given at signup
  // (SIGNUP) or claimed by her (CLAIM, until claimUntil).
  mode?: DiscountMode;
  accountGrant?: AccountGrant | null;
  claimUntil?: string | null; // YYYY-MM-DD
  // CLAIM only: show it in every account's "Mis descuentos" (otherwise it is private:
  // claimed only with its QR or code).
  listed?: boolean;
  maxUses?: number | null;
  onePerClient: boolean;
}

export type DiscountCodeResult = { error: string } | { ok: true; id: string; code: string };

// Studio dates are Mexico City time (UTC-6, no daylight saving).
const startOfDay = (d: string) => new Date(`${d}T00:00:00-06:00`);
const endOfDay = (d: string) => new Date(`${d}T23:59:59-06:00`);

export async function createDiscountCodeAction(input: CreateDiscountCodeInput): Promise<DiscountCodeResult> {
  const user = await requireStaffRole([...MANAGER_ROLES]);

  const code = normalizeCode(input.code?.trim() ? input.code : suggestCode());
  const validFrom = input.validFrom ? startOfDay(input.validFrom) : null;
  const validUntil = input.validUntil ? endOfDay(input.validUntil) : null;
  const mode: DiscountMode = input.mode ?? "CHECKOUT";
  const accountGrant = mode === "ACCOUNT" ? (input.accountGrant ?? null) : null;
  const claimUntil = mode === "ACCOUNT" && accountGrant === "CLAIM" && input.claimUntil ? endOfDay(input.claimUntil) : null;
  const isFree = input.kind === "FREE_ADD_ON" || input.kind === "FREE_PRODUCT";

  const problem = validateNewCode({
    code,
    name: input.name,
    kind: input.kind,
    value: isFree ? 0 : Math.round(input.value),
    addOnId: input.addOnId,
    productSku: input.productSku,
    validFrom,
    validUntil,
    maxUses: input.maxUses ?? null,
    mode,
    accountGrant,
    claimUntil,
  });
  if (problem) return { error: problem };

  if (await prisma.discountCode.findUnique({ where: { code } })) {
    return { error: "Ya existe un código igual. Elige otro." };
  }

  const row = await prisma.discountCode.create({
    data: {
      code,
      name: input.name.trim(),
      kind: input.kind,
      value: isFree ? 0 : Math.round(input.value),
      scope: isFree ? "ALL" : input.scope,
      addOnId: input.kind === "FREE_ADD_ON" ? input.addOnId : null,
      productSku: input.kind === "FREE_PRODUCT" ? input.productSku : null,
      validFrom,
      validUntil,
      mode,
      accountGrant,
      claimUntil,
      listed: mode === "ACCOUNT" && accountGrant === "CLAIM" ? !!input.listed : false,
      maxUses: input.maxUses ?? null,
      // An account discount is always once per account.
      onePerClient: mode === "ACCOUNT" ? true : input.onePerClient,
      createdByUserId: user.id,
    },
  });
  revalidatePath("/admin/discounts");
  return { ok: true, id: row.id, code: row.code };
}

export async function setDiscountCodeActiveAction(id: string, isActive: boolean): Promise<void> {
  await requireStaffRole([...MANAGER_ROLES]);
  await prisma.discountCode.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/discounts");
}

// A code that has been used is only deactivated (its sales keep pointing at it).
export async function deleteDiscountCodeAction(id: string): Promise<{ error: string } | { ok: true }> {
  await requireStaffRole([...MANAGER_ROLES]);
  const used = await prisma.discountRedemption.count({ where: { codeId: id } });
  if (used > 0) return { error: "Este código ya se usó en ventas. Desactívalo en lugar de eliminarlo." };
  await prisma.discountCode.delete({ where: { id } });
  revalidatePath("/admin/discounts");
  return { ok: true };
}

// The link the QR carries: scanning it with a phone camera opens a page that says
// "show this code at reception"; the front desk's scanner reads the code from it.
function discountLink(code: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://monam.mx").replace(/\/+$/, "");
  return `${base}/d/${code}`;
}

export async function getDiscountQrAction(id: string): Promise<{ dataUrl: string; link: string; code: string } | { error: string }> {
  await requireStaffRole([...MANAGER_ROLES]);
  const row = await prisma.discountCode.findUnique({ where: { id } });
  if (!row) return { error: "Código no encontrado." };
  const link = discountLink(row.code);
  const dataUrl = await QRCode.toDataURL(link, {
    width: 900,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#3f0215", light: "#ffffff" },
  });
  return { dataUrl, link, code: row.code };
}
