// Pure rules for backbar containers — no database access, shared by the
// server actions, the pages and the tests.

const DAY_MS = 24 * 60 * 60 * 1000;

// The date a container must be thrown away by: the earlier of the lot's own
// expiry and the opening date plus the product's period-after-opening (days).
export function containerLimit(openedAt: Date, paoDays: number, lotExpiresOn: Date | null): Date {
  const afterOpening = new Date(openedAt.getTime() + paoDays * DAY_MS);
  if (!lotExpiresOn) return afterOpening;
  return lotExpiresOn.getTime() < afterOpening.getTime() ? lotExpiresOn : afterOpening;
}

export interface ContainerForUse {
  id: string;
  remainingMl: number;
  openedAt: Date;
  expiresOn: Date;
}

export type Allocation = { containerId: string; ml: number; remainingAfter: number };

// Takes `ml` out of the usable containers (not expired), oldest opened first,
// spilling over to the next one when a container runs out. Returns null when
// there is not enough product across all of them — nothing is partially taken.
export function allocateMl(containers: ContainerForUse[], ml: number, now = new Date()): Allocation[] | null {
  if (!Number.isFinite(ml) || ml <= 0) return null;
  const usable = containers
    .filter((c) => c.remainingMl > 0 && c.expiresOn.getTime() >= now.getTime())
    .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  const out: Allocation[] = [];
  let left = ml;
  for (const c of usable) {
    if (left <= 0) break;
    const take = Math.min(left, c.remainingMl);
    out.push({ containerId: c.id, ml: take, remainingAfter: c.remainingMl - take });
    left -= take;
  }
  return left > 0 ? null : out;
}

// ml available to use right now across a set of containers.
export function usableMl(containers: ContainerForUse[], now = new Date()): number {
  return containers
    .filter((c) => c.expiresOn.getTime() >= now.getTime())
    .reduce((s, c) => s + Math.max(0, c.remainingMl), 0);
}

export function isExpired(expiresOn: Date, now = new Date()): boolean {
  return expiresOn.getTime() < now.getTime();
}
