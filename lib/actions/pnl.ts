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

// Saves everything changed in one "Editar" session at once.
export async function savePnlLinesAction(input: {
  locationName: string;
  monthKey: string;
  changes: { field: string; valueMxn: number }[]; // signed as the P&L stores it (costs negative)
}): Promise<Result> {
  const owner = await requireStaffRole(["OWNER"]);
  if (input.changes.length === 0) return {};
  for (const c of input.changes) {
    if (!(PNL_FIELDS as string[]).includes(c.field)) return { error: "Línea no válida." };
    if (!Number.isInteger(c.valueMxn) || Math.abs(c.valueMxn) > 100_000_000) {
      return { error: "Escribe montos enteros en pesos." };
    }
  }
  const resolved = await resolveOpenMonth(input.locationName, input.monthKey);
  if ("error" in resolved) return { error: resolved.error };
  const locationId = resolved.location.id;

  await prisma.$transaction([
    ...input.changes.map((c) =>
      prisma.pnlOverride.upsert({
        where: { locationId_month_field: { locationId, month: input.monthKey, field: c.field } },
        create: { locationId, month: input.monthKey, field: c.field, valueMxn: c.valueMxn, updatedByUserId: owner.id },
        update: { valueMxn: c.valueMxn, updatedByUserId: owner.id },
      }),
    ),
    prisma.auditLog.create({
      data: {
        actorUserId: owner.id,
        actorRole: owner.role,
        action: "PNL_EDIT",
        entityType: "PnlOverride",
        locationId,
        metadata: { month: input.monthKey, changes: input.changes },
      },
    }),
  ]);
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
  closeEarly?: boolean; // the Owner confirmed closing a month that has not ended yet
}): Promise<Result & { nextMonthKey?: string }> {
  const owner = await requireStaffRole(["OWNER"]);
  const resolved = await resolveOpenMonth(input.locationName, input.monthKey);
  if ("error" in resolved) return { error: resolved.error };
  if (!monthHasEnded(input.monthKey) && !input.closeEarly) {
    return { error: "El mes aún no termina. Confirma que quieres cerrarlo antes de tiempo." };
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
