import "server-only";
import { prisma } from "@/lib/prisma";
import { getPnlBreakdown } from "@/lib/reporting";
import type { PnlBreakdown } from "@/lib/pnl-math";
import {
  PNL_FIELDS,
  applyOverrides,
  monthKeyOfRange,
  normalizeSnapshot,
  type PnlField,
} from "@/lib/pnl-periods";

export interface PnlAdjustState {
  monthKey: string | null; // the calendar month the range covers; null when it is not exactly one month
  closed: boolean; // every selected location has this month closed
  closedAt: string | null;
  overriddenFields: PnlField[]; // lines with a hand-typed value
}

// The P&L for a date range with the Owner's hand-typed lines applied and
// closed months read from their snapshot. When nothing is adjusted this is
// exactly getPnlBreakdown (so consolidated numbers don't change); otherwise
// each affected location's contribution is swapped for its adjusted version.
export async function getAdjustedPnl(
  locationIds: string[],
  range: { start: Date; end: Date },
): Promise<{ pnl: PnlBreakdown; state: PnlAdjustState }> {
  const base = await getPnlBreakdown(locationIds, range);
  const monthKey = monthKeyOfRange(range);
  const none: PnlAdjustState = { monthKey, closed: false, closedAt: null, overriddenFields: [] };
  if (!monthKey || locationIds.length === 0) return { pnl: base, state: none };

  const [closes, overrides] = await Promise.all([
    prisma.pnlMonthClose.findMany({ where: { locationId: { in: locationIds }, month: monthKey } }),
    prisma.pnlOverride.findMany({ where: { locationId: { in: locationIds }, month: monthKey } }),
  ]);
  if (closes.length === 0 && overrides.length === 0) return { pnl: base, state: none };

  const adjustedIds = new Set([...closes.map((c) => c.locationId), ...overrides.map((o) => o.locationId)]);
  const result: PnlBreakdown = { ...base };
  for (const id of adjustedIds) {
    const computed = await getPnlBreakdown([id], range);
    const close = closes.find((c) => c.locationId === id);
    const final = close
      ? normalizeSnapshot(close.snapshot)
      : applyOverrides(
          computed,
          Object.fromEntries(overrides.filter((o) => o.locationId === id).map((o) => [o.field, o.valueMxn])),
        );
    for (const f of PNL_FIELDS) result[f] += final[f] - computed[f];
  }

  const closed = closes.length === locationIds.length;
  const openOverrides = overrides.filter((o) => !closes.some((c) => c.locationId === o.locationId));
  return {
    pnl: result,
    state: {
      monthKey,
      closed,
      closedAt: closed ? new Date(Math.max(...closes.map((c) => c.closedAt.getTime()))).toISOString() : null,
      overriddenFields: [...new Set(openOverrides.map((o) => o.field as PnlField))],
    },
  };
}
