"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { CATALOG_CACHE_TAG } from "@/lib/catalog-cache";

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
  // Commission rates, anomaly thresholds and fee percentages are also served
  // from the cached getCatalogData (used by /my/book and every panel), so
  // refresh that too.
  updateTag(CATALOG_CACHE_TAG);
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
  // depositRequiredSignature/Targeted are part of the cached getCatalogData
  // (used by /my/book) — this previously never revalidated it, so a deposit
  // rule change wouldn't show up until something else happened to bust the
  // cache (or, before caching existed, by accident every request).
  updateTag(CATALOG_CACHE_TAG);
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

export interface TerminalSettingsInput {
  enabled?: boolean;
  bridgeUrl?: string; // local HTTP bridge on the shop's LAN — see terminal-bridge/README.md
  terminalIp?: string; // PAX A910S IP on the local network
  terminalPort?: number; // Redsys ECR-POS TCP port the terminal listens on (ask BBVA to confirm once ECR mode is activated)
  fuc?: string; // Redsys merchant code (Código de comercio) BBVA assigns
  terminalId?: string; // Redsys terminal code (Código de terminal)
}

// Each location has its own physical terminal on its own LAN (own IP, own
// bridge instance), so the config is per-location, not one global row —
// opening a second store must not require re-wiring the first one's PAX
// A910S. Keyed the same way the rest of this codebase looks locations up
// (by name, e.g. prisma.location.findFirst({ where: { name } })), not id.
function terminalSettingKey(locationName: string) {
  return `terminal.redsysEcr:${locationName}`;
}

// Configuración → Terminal de cobro. Front Desk never sees these — only
// the bridge connection details the staff tablet needs to reach the PAX
// A910S over the shop's LAN (see lib/terminal/redsys-ecr.ts for why this
// can't go through the Next.js server). Stored as one JSON blob per
// location since each location's fields are always read/written together,
// unlike the per-key Setting rows above.
export async function updateTerminalSettingsAction(locationName: string, patch: TerminalSettingsInput) {
  await requireSettingsEditor();

  const key = terminalSettingKey(locationName);
  const current = await prisma.setting.findUnique({ where: { key } });
  const currentValue = (current?.value as TerminalSettingsInput | undefined) ?? {};
  await setSetting(key, { ...currentValue, ...patch });

  revalidatePath("/admin/settings");
  updateTag(CATALOG_CACHE_TAG);
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
