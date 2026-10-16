"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";

async function requireSettingsEditor() {
  return requireStaffRole(["OWNER", "CLINIC_MANAGER"]);
}

import { normalizePermissionRows, type PermissionRow } from "@/lib/permissions-matrix";

async function setSetting(key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as never },
    update: { value: value as never },
  });
}

export interface BusinessRulesInput {
  commissionServicePct?: number;
  commissionRetailPct?: number;
  anomalyDiscountThresholdPct?: number;
  anomalyRefundThresholdMXN?: number;
  terminalFeePct?: number;
  stripeFeePct?: number;
  stripeFixedFeeMxn?: number;
}

// Commission rates live on CommissionRule (the real table createSaleAction
// reads to calculate every commission); anomaly thresholds live on Setting
// (the real table decideApprovalAction reads). BusinessRulesContext calls
// this on every edit, same fire-and-forget persist pattern as
// ProtocolsContext/LocationsContext.
export async function updateBusinessRulesAction(patch: BusinessRulesInput) {
  await requireSettingsEditor();

  if (patch.commissionServicePct !== undefined) {
    const rule = await prisma.commissionRule.findFirst({ where: { basis: "SERVICE", calcType: "PERCENTAGE", role: null } });
    if (rule) await prisma.commissionRule.update({ where: { id: rule.id }, data: { rateOrAmount: patch.commissionServicePct } });
    else await prisma.commissionRule.create({ data: { basis: "SERVICE", calcType: "PERCENTAGE", rateOrAmount: patch.commissionServicePct } });
  }
  if (patch.commissionRetailPct !== undefined) {
    const rule = await prisma.commissionRule.findFirst({ where: { basis: "RETAIL", calcType: "PERCENTAGE", role: null } });
    if (rule) await prisma.commissionRule.update({ where: { id: rule.id }, data: { rateOrAmount: patch.commissionRetailPct } });
    else await prisma.commissionRule.create({ data: { basis: "RETAIL", calcType: "PERCENTAGE", rateOrAmount: patch.commissionRetailPct } });
  }
  if (patch.anomalyDiscountThresholdPct !== undefined) {
    await setSetting("anomaly.discountThresholdPct", patch.anomalyDiscountThresholdPct);
  }
  if (patch.anomalyRefundThresholdMXN !== undefined) {
    await setSetting("anomaly.refundThresholdMxn", patch.anomalyRefundThresholdMXN);
  }
  if (patch.terminalFeePct !== undefined) {
    await setSetting("pnl.terminalFeePct", Math.min(100, Math.max(0, patch.terminalFeePct)));
  }
  if (patch.stripeFeePct !== undefined) {
    await setSetting("pnl.stripeFeePct", Math.min(100, Math.max(0, patch.stripeFeePct)));
  }
  if (patch.stripeFixedFeeMxn !== undefined) {
    await setSetting("pnl.stripeFixedFeeMxn", Math.min(1000, Math.max(0, patch.stripeFixedFeeMxn)));
  }

  revalidatePath("/admin/settings");
  // The deposit rules by appointment type are also seeded from the root
  // layout (used by /my/book), so refresh that too.
  revalidatePath("/", "layout");
}

export interface OperationalSettingsInput {
  depositRequiredFirstTime?: boolean;
  depositRequiredSignature?: boolean;
  depositRequiredTargeted?: boolean;
  cancellationWindowHours?: number;
  discountApprovalThresholdPct?: number;
  cleanupBufferMinutes?: number;
  addonBufferMinutes?: number;
}

export async function updateOperationalSettingsAction(patch: OperationalSettingsInput) {
  await requireSettingsEditor();

  if (patch.depositRequiredFirstTime !== undefined) await setSetting("deposit.requiredFirstTime", patch.depositRequiredFirstTime);
  if (patch.depositRequiredSignature !== undefined) await setSetting("deposit.requiredSignature", patch.depositRequiredSignature);
  if (patch.depositRequiredTargeted !== undefined) await setSetting("deposit.requiredTargeted", patch.depositRequiredTargeted);
  if (patch.cancellationWindowHours !== undefined) await setSetting("cancellation.windowHours", patch.cancellationWindowHours);
  if (patch.discountApprovalThresholdPct !== undefined) await setSetting("discount.approvalThresholdPct", patch.discountApprovalThresholdPct);
  if (patch.cleanupBufferMinutes !== undefined) await setSetting("booking.cleanupBufferMinutes", patch.cleanupBufferMinutes);
  if (patch.addonBufferMinutes !== undefined) await setSetting("booking.addonBufferMinutes", patch.addonBufferMinutes);

  revalidatePath("/admin/settings");
}

export async function updateKpiTargetAction(kpi: string, targetValue: number, targetUnit: string, vigenciaYear: number) {
  await requireSettingsEditor();
  await prisma.kpiTarget.upsert({
    where: { kpi },
    create: { kpi, targetValue, targetUnit, vigenciaYear },
    update: { targetValue, targetUnit, vigenciaYear },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

// Configuración → Permisos por rol. Owner only. The stored value is run
// through normalizePermissionRows, which drops anything invalid and keeps the
// Admin column locked. This is the reference matrix — it does not (yet) change
// what each role can do; that is enforced in lib/auth/dal.ts.
export async function updatePermissionsMatrixAction(rows: PermissionRow[]): Promise<{ error?: string }> {
  await requireStaffRole(["OWNER"]);
  const clean = normalizePermissionRows(rows).map((r) => ({ area: r.area, access: r.access }));
  await setSetting("permissions.matrix", clean);
  revalidatePath("/admin/settings");
  return {};
}
