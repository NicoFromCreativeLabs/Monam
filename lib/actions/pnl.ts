"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { getPnlBreakdown } from "@/lib/reporting";
import {
  PNL_FIELDS,
  applyOverrides,
  isFutureMonth,
  isMonthKey,
  monthHasEnded,
  monthRange,
  nextMonthKey,
  type PnlField,
} from "@/lib/pnl-periods";

// Editing the P&L's "Real" column and closing a month are bookkeeping
// decisions, so they are Owner-only (the screen is read-only for everyone
// else). Every change is also written to the audit log.

type Result = { error?: string };

async function resolveOpenMonth(locationName: string, monthKey: string) {
  if (!isMonthKey(monthKey)) return { error: "Mes no válido." } as const;
  if (isFutureMonth(monthKey)) return { error: "No se puede editar un mes que aún no empieza." } as const;
  const location = await prisma.location.findFirst({ where: { name: locationName } });
  if (!location) return { error: "Sucursal no encontrada." } as const;
  const closed = await prisma.pnlMonthClose.findUnique({
    where: { locationId_month: { locationId: location.id, month: monthKey } },
  });
  if (closed) return { error: "Este mes ya está cerrado y no se puede editar." } as const;
  return { location } as const;
}

export async function savePnlLineAction(input: {
  locationName: string;
  monthKey: string;
  field: string;
  valueMxn: number; // signed as the P&L stores it (costs negative)
}): Promise<Result> {
  const owner = await requireStaffRole(["OWNER"]);
  if (!(PNL_FIELDS as string[]).includes(input.field)) return { error: "Línea no válida." };
  if (!Number.isInteger(input.valueMxn) || Math.abs(input.valueMxn) > 100_000_000) {
    return { error: "Escribe un monto entero en pesos." };
  }
  const resolved = await resolveOpenMonth(input.locationName, input.monthKey);
  if ("error" in resolved) return { error: resolved.error };

  await prisma.pnlOverride.upsert({
    where: {
      locationId_month_field: { locationId: resolved.location.id, month: input.monthKey, field: input.field },
    },
    create: {
      locationId: resolved.location.id,
      month: input.monthKey,
      field: input.field,
      valueMxn: input.valueMxn,
      updatedByUserId: owner.id,
    },
    update: { valueMxn: input.valueMxn, updatedByUserId: owner.id },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id,
      actorRole: owner.role,
      action: "PNL_EDIT",
      entityType: "PnlOverride",
      locationId: resolved.location.id,
      metadata: { month: input.monthKey, field: input.field, valueMxn: input.valueMxn },
    },
  });
  revalidatePath("/admin/analytics/pnl");
  return {};
}

// Back to the value the sales data computes.
export async function clearPnlLineAction(input: {
  locationName: string;
  monthKey: string;
  field: string;
}): Promise<Result> {
  const owner = await requireStaffRole(["OWNER"]);
  const resolved = await resolveOpenMonth(input.locationName, input.monthKey);
  if ("error" in resolved) return { error: resolved.error };

  await prisma.pnlOverride.deleteMany({
    where: { locationId: resolved.location.id, month: input.monthKey, field: input.field },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id,
      actorRole: owner.role,
      action: "PNL_EDIT_RESET",
      entityType: "PnlOverride",
      locationId: resolved.location.id,
      metadata: { month: input.monthKey, field: input.field },
    },
  });
  revalidatePath("/admin/analytics/pnl");
  return {};
}

// Freezes a finished month for one location: stores the final numbers and
// from then on reports read them instead of recomputing. Irreversible from
// the app by design.
export async function closePnlMonthAction(input: {
  locationName: string;
  monthKey: string;
}): Promise<Result & { nextMonthKey?: string }> {
  const owner = await requireStaffRole(["OWNER"]);
  const resolved = await resolveOpenMonth(input.locationName, input.monthKey);
  if ("error" in resolved) return { error: resolved.error };
  if (!monthHasEnded(input.monthKey)) {
    return { error: "El mes se puede cerrar cuando termine." };
  }

  const { location } = resolved;
  const [computed, overrides] = await Promise.all([
    getPnlBreakdown([location.id], monthRange(input.monthKey)),
    prisma.pnlOverride.findMany({ where: { locationId: location.id, month: input.monthKey } }),
  ]);
  const snapshot = applyOverrides(computed, Object.fromEntries(overrides.map((o) => [o.field, o.valueMxn])));

  await prisma.pnlMonthClose.create({
    data: {
      locationId: location.id,
      month: input.monthKey,
      closedByUserId: owner.id,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id,
      actorRole: owner.role,
      action: "PNL_CLOSE",
      entityType: "PnlMonthClose",
      locationId: location.id,
      metadata: { month: input.monthKey, editedLines: overrides.map((o) => o.field) as PnlField[] },
    },
  });
  revalidatePath("/admin/analytics/pnl");
  revalidatePath("/admin");
  return { nextMonthKey: nextMonthKey(input.monthKey) };
}
