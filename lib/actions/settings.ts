"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";

async function requireSettingsEditor() {
  return requireStaffRole(["OWNER", "CLINIC_MANAGER"]);
}

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

  revalidatePath("/admin/settings");
}

export interface OperationalSettingsInput {
  depositRequiredFirstTime?: boolean;
  depositRequiredSignature?: boolean;
  cancellationWindowHours?: number;
  discountApprovalThresholdPct?: number;
}

export async function updateOperationalSettingsAction(patch: OperationalSettingsInput) {
  await requireSettingsEditor();

  if (patch.depositRequiredFirstTime !== undefined) await setSetting("deposit.requiredFirstTime", patch.depositRequiredFirstTime);
  if (patch.depositRequiredSignature !== undefined) await setSetting("deposit.requiredSignature", patch.depositRequiredSignature);
  if (patch.cancellationWindowHours !== undefined) await setSetting("cancellation.windowHours", patch.cancellationWindowHours);
  if (patch.discountApprovalThresholdPct !== undefined) await setSetting("discount.approvalThresholdPct", patch.discountApprovalThresholdPct);

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
