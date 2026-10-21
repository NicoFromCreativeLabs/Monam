import "server-only";
import { prisma } from "@/lib/prisma";
import { claimCheck, discountSummary, grantsOnSignup } from "@/lib/discount-codes";
import { ruleFromRow } from "@/lib/discount-codes-server";

// Account-bound discounts as the client sees them (Paquetes → Mis descuentos) and
// as the front desk sees them when charging her.

export interface AccountDiscountView {
  codeId: string;
  code: string;
  name: string;
  summary: string;
  usableUntil: string | null; // ISO, last day to use it
}

export interface AccountDiscounts {
  claimable: (AccountDiscountView & { claimUntil: string | null })[]; // she can claim these now
  mine: AccountDiscountView[]; // in her account, not used yet
  used: (AccountDiscountView & { usedAt: string })[];
}

export async function getAccountDiscounts(clientId: string, now = new Date()): Promise<AccountDiscounts> {
  const [codes, claims, claimCounts] = await Promise.all([
    prisma.discountCode.findMany({ where: { mode: "ACCOUNT", isActive: true } }),
    prisma.clientDiscount.findMany({ where: { clientId }, include: { code: true }, orderBy: { claimedAt: "desc" } }),
    prisma.clientDiscount.groupBy({ by: ["codeId"], _count: true }),
  ]);
  const claimed = new Set(claims.map((c) => c.codeId));

  const view = (c: (typeof codes)[number]): AccountDiscountView => ({
    codeId: c.id,
    code: c.code,
    name: c.name,
    summary: discountSummary(c),
    usableUntil: c.validUntil ? c.validUntil.toISOString() : null,
  });

  const claimable = codes
    .filter((c) => c.listed) // private ones are only claimed with their QR or code
    .filter((c) =>
      claimCheck(ruleFromRow(c), {
        now,
        claimsSoFar: claimCounts.find((x) => x.codeId === c.id)?._count ?? 0,
        alreadyClaimed: claimed.has(c.id),
      }).ok,
    )
    .map((c) => ({ ...view(c), claimUntil: (c.claimUntil ?? c.validUntil)?.toISOString() ?? null }));

  const mine = claims
    .filter((c) => !c.redeemedAt && c.code.isActive && (!c.code.validUntil || c.code.validUntil >= now))
    .map((c) => view(c.code));

  const used = claims
    .filter((c) => c.redeemedAt)
    .map((c) => ({ ...view(c.code), usedAt: c.redeemedAt!.toISOString() }));

  return { claimable, mine, used };
}

// What the vendedor can apply to this client's ticket: the discounts in her account
// that are still usable.
export async function getUsableAccountDiscounts(clientId: string, now = new Date()): Promise<AccountDiscountView[]> {
  return (await getAccountDiscounts(clientId, now)).mine.filter((d) => !d.usableUntil || new Date(d.usableUntil) >= now);
}

// A new account gets every launch (SIGNUP) discount that is running.
export async function grantSignupDiscounts(clientId: string, now = new Date()): Promise<number> {
  const codes = await prisma.discountCode.findMany({ where: { mode: "ACCOUNT", accountGrant: "SIGNUP", isActive: true } });
  if (codes.length === 0) return 0;
  const counts = await prisma.clientDiscount.groupBy({ by: ["codeId"], _count: true });

  let granted = 0;
  for (const code of codes) {
    const claimsSoFar = counts.find((c) => c.codeId === code.id)?._count ?? 0;
    if (!grantsOnSignup(ruleFromRow(code), { now, claimsSoFar })) continue;
    await prisma.clientDiscount
      .create({ data: { clientId, codeId: code.id } })
      .then(() => granted++)
      .catch(() => {
        // Already has it (unique per account and code).
      });
  }
  return granted;
}
