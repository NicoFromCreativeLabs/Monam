import "server-only";
import { prisma } from "@/lib/prisma";

// Using a package's sessions to book. A session is taken when the appointment
// is booked (so the same session cannot be used twice) and given back if the
// appointment is cancelled. An appointment paid with a package has no service
// charge at checkout.

export interface UsablePackage {
  purchaseId: string;
  name: string;
  tier: "Targeted" | "Signature";
  sessionsRemaining: number;
  expiresOn: string | null; // ISO
}

// The client's packages that still have sessions and have not expired, the one
// expiring soonest first (that one is used first).
export async function getUsablePackages(clientId: string, now = new Date()): Promise<UsablePackage[]> {
  const purchases = await prisma.packagePurchase.findMany({
    where: { clientId },
    include: { packageOption: true },
  });
  return purchases
    .filter((p) => p.sessionsUsed < p.packageOption.sessions && (!p.expiresOn || p.expiresOn > now))
    .sort((a, b) => (a.expiresOn?.getTime() ?? Infinity) - (b.expiresOn?.getTime() ?? Infinity))
    .map((p) => ({
      purchaseId: p.id,
      name: p.packageOption.name,
      tier: p.packageOption.tier === "SIGNATURE" ? ("Signature" as const) : ("Targeted" as const),
      sessionsRemaining: p.packageOption.sessions - p.sessionsUsed,
      expiresOn: p.expiresOn ? p.expiresOn.toISOString() : null,
    }));
}

export async function findUsablePackage(
  clientId: string,
  tier: "Targeted" | "Signature",
): Promise<UsablePackage | null> {
  return (await getUsablePackages(clientId)).find((p) => p.tier === tier) ?? null;
}

// Takes one session for this appointment. The update only goes through if
// nobody else used a session since it was read, so two bookings at the same
// moment cannot both take the last one.
export async function redeemPackageForAppointment(purchaseId: string, appointmentId: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      const purchase = await tx.packagePurchase.findUnique({
        where: { id: purchaseId },
        include: { packageOption: true },
      });
      if (!purchase || purchase.sessionsUsed >= purchase.packageOption.sessions) return false;
      const taken = await tx.packagePurchase.updateMany({
        where: { id: purchaseId, sessionsUsed: purchase.sessionsUsed },
        data: { sessionsUsed: { increment: 1 } },
      });
      if (taken.count === 0) return false;
      await tx.packageRedemption.create({ data: { packagePurchaseId: purchaseId, appointmentId } });
      return true;
    });
  } catch {
    return false;
  }
}

// Gives the session back when the appointment that took it is cancelled.
export async function releasePackageRedemption(appointmentId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const redemption = await tx.packageRedemption.findUnique({ where: { appointmentId } });
    if (!redemption) return;
    await tx.packageRedemption.delete({ where: { id: redemption.id } });
    await tx.packagePurchase.update({
      where: { id: redemption.packagePurchaseId },
      data: { sessionsUsed: { decrement: 1 } },
    });
  });
}
