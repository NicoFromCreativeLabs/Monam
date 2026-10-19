"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/generated/prisma/client";

const ROLE_FROM_LABEL: Record<string, Role> = {
  Admin: "OWNER",
  "Recepción": "FRONT_DESK",
  Esteticista: "ESTHETICIAN",
  "Gerente de clínica": "CLINIC_MANAGER",
};

async function resolveLocationIds(locationLabel: string): Promise<string[]> {
  if (locationLabel === "Ambas") {
    const all = await prisma.location.findMany({ select: { id: true } });
    return all.map((l) => l.id);
  }
  const location = await prisma.location.findFirst({ where: { name: locationLabel } });
  return location ? [location.id] : [];
}

export interface InviteStaffInput {
  name: string;
  email: string;
  roleLabel: string;
  locationLabel: string;
  salaryMxn: number;
}

export type InviteStaffResult =
  | { error: string }
  // existingAccount: the email already had a login (e.g. a client who signed
  // up), so it was promoted in place — no invite email, status is ACTIVE.
  | { userId: string; existingAccount: boolean };

// Supabase has no get-user-by-email on the admin API, so page through
// listUsers. Fine at this studio's scale (hundreds of accounts, not millions).
async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
  }
  return null;
}

// Real account creation — same two-step pattern as
// scripts/create-staff-account.ts (the very first Owner account was
// bootstrapped this way): create the Supabase Auth user, then the AppUser +
// StaffLocationAssignment rows, then try to send a password-setup email.
// If the email already has a login (someone who signed up as a client), that
// login is reused instead: they keep their password and just gain the staff
// role. Individual named logins only, never shared (spec §10).
export async function inviteStaffAction(input: InviteStaffInput): Promise<InviteStaffResult> {
  await requireStaffRole(["OWNER"]);

  const role = ROLE_FROM_LABEL[input.roleLabel];
  if (!role) return { error: "Rol no reconocido." };

  const email = input.email.trim().toLowerCase();
  const admin = createAdminClient();

  let userId = await findAuthUserIdByEmail(admin, email);
  const existingAccount = userId !== null;

  if (userId) {
    const alreadyStaff = await prisma.appUser.findUnique({ where: { id: userId } });
    if (alreadyStaff?.archivedAt) {
      return { error: "Esta persona está archivada. Pídele a soporte que la restaure." };
    }
    if (alreadyStaff) return { error: "Esta persona ya está en el equipo." };
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: input.name },
    });
    if (error || !data.user) {
      return { error: error?.message ?? "No se pudo crear la cuenta." };
    }
    userId = data.user.id;
  }

  await prisma.appUser.create({
    data: {
      id: userId,
      name: input.name,
      email,
      role,
      salaryMxn: input.salaryMxn,
      status: existingAccount ? "ACTIVE" : "INVITED",
    },
  });

  const locationIds = await resolveLocationIds(input.locationLabel);
  for (const [i, locationId] of locationIds.entries()) {
    await prisma.staffLocationAssignment.create({
      data: { userId, locationId, isPrimary: i === 0 },
    });
  }

  if (!existingAccount) {
    await admin.auth.resetPasswordForEmail(email).catch(() => {
      // Account still exists even if the email send fails (rate limits,
      // etc.) — same tolerance as the bootstrap script; retry is a resend,
      // not a blocker.
    });
  }

  revalidatePath("/admin/staff");
  return { userId, existingAccount };
}

export interface UpdateStaffInput {
  roleLabel: string;
  locationLabel: string;
  salaryMxn: number;
}

export async function updateStaffAction(userId: string, input: UpdateStaffInput) {
  await requireStaffRole(["OWNER"]);

  const role = ROLE_FROM_LABEL[input.roleLabel];
  if (!role) return;

  await prisma.appUser.update({ where: { id: userId }, data: { role, salaryMxn: input.salaryMxn } });

  const locationIds = await resolveLocationIds(input.locationLabel);
  await prisma.staffLocationAssignment.deleteMany({ where: { userId } });
  for (const [i, locationId] of locationIds.entries()) {
    await prisma.staffLocationAssignment.create({
      data: { userId, locationId, isPrimary: i === 0 },
    });
  }

  revalidatePath("/admin/staff");
}

export async function toggleStaffStatusAction(userId: string) {
  await requireStaffRole(["OWNER"]);
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user) return;
  const nextStatus = user.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
  await prisma.appUser.update({ where: { id: userId }, data: { status: nextStatus } });
  revalidatePath("/admin/staff");
}

// `canArchive`: the delete was refused because of their history, so the
// screen can offer archiving instead.
export type DeleteStaffResult = { error: string; canArchive?: boolean } | { ok: true };

// Removes a person from the team for good. Only possible while they have no
// history (appointments, treatments, sales, commissions, shifts…): those rows
// point at them, and deleting the person would erase or break the records —
// someone with history is deactivated instead. If the same login also belongs
// to a client account, the login stays (they simply stop being staff);
// otherwise the login is deleted too so it cannot be used any more.
export async function deleteStaffAction(userId: string): Promise<DeleteStaffResult> {
  const me = await requireStaffRole(["OWNER"]);
  if (userId === me.id) return { error: "No puedes eliminar tu propia cuenta." };

  const target = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!target) return { ok: true };

  if (target.role === "OWNER" && target.status !== "INACTIVE") {
    const otherOwners = await prisma.appUser.count({
      where: { role: "OWNER", status: { not: "INACTIVE" }, id: { not: userId } },
    });
    if (otherOwners === 0) return { error: "Debe quedar al menos un Admin activo." };
  }

  try {
    await prisma.$transaction([
      prisma.clientPreference.updateMany({
        where: { preferredEstheticianId: userId },
        data: { preferredEstheticianId: null },
      }),
      prisma.staffLocationAssignment.deleteMany({ where: { userId } }),
      prisma.appUser.delete({ where: { id: userId } }),
    ]);
  } catch (e) {
    const code = (e as { code?: string }).code;
    const message = e instanceof Error ? e.message.toLowerCase() : "";
    if (code === "P2003" || message.includes("foreign key")) {
      return {
        error: "Esta persona ya tiene historial (citas, tratamientos, ventas o turnos), así que no se puede borrar.",
        canArchive: true,
      };
    }
    return { error: "No se pudo eliminar. Intenta de nuevo." };
  }

  const alsoClient = await prisma.client.findFirst({ where: { authUserId: userId }, select: { id: true } });
  if (!alsoClient) {
    await createAdminClient()
      .auth.admin.deleteUser(userId)
      .catch(() => {
        // The team record is already gone; a leftover login cannot open the panel.
      });
  }

  revalidatePath("/admin/staff");
  return { ok: true };
}

// Takes someone off the roster without losing anything they did: they are
// deactivated (so they cannot sign in or be booked) and hidden from the list.
export async function archiveStaffAction(userId: string): Promise<DeleteStaffResult> {
  const me = await requireStaffRole(["OWNER"]);
  if (userId === me.id) return { error: "No puedes archivar tu propia cuenta." };

  const target = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!target) return { ok: true };

  if (target.role === "OWNER" && target.status !== "INACTIVE") {
    const otherOwners = await prisma.appUser.count({
      where: { role: "OWNER", status: { not: "INACTIVE" }, id: { not: userId }, archivedAt: null },
    });
    if (otherOwners === 0) return { error: "Debe quedar al menos un Admin activo." };
  }

  await prisma.appUser.update({ where: { id: userId }, data: { status: "INACTIVE", archivedAt: new Date() } });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export interface AccountSuggestion {
  name: string;
  email: string;
}

// Autocomplete for the roster's "add person" form: existing client accounts
// (real logins, not yet on the team) matching what the Owner has typed, so
// they can be promoted instead of re-invited. Owner-only, capped, and never
// returns anonymized or already-staff accounts.
export async function searchAccountsAction(query: string): Promise<AccountSuggestion[]> {
  await requireStaffRole(["OWNER"]);

  const q = query.trim();
  if (q.length < 2) return [];

  const staff = await prisma.appUser.findMany({ select: { id: true } });
  const clients = await prisma.client.findMany({
    where: {
      authUserId: { not: null, notIn: staff.map((s) => s.id) },
      anonymizedAt: null,
      email: { not: null },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { name: true, email: true },
    orderBy: { name: "asc" },
    take: 8,
  });

  return clients.flatMap((c) => (c.email ? [{ name: c.name, email: c.email }] : []));
}
