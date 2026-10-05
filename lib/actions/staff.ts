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

export type InviteStaffResult = { error: string } | { userId: string };

// Real account creation — same two-step pattern as
// scripts/create-staff-account.ts (the very first Owner account was
// bootstrapped this way): create the Supabase Auth user, then the AppUser +
// StaffLocationAssignment rows, then try to send a password-setup email.
// Individual named logins only, never shared (spec §10) — this is the only
// way a new staff member gets in.
export async function inviteStaffAction(input: InviteStaffInput): Promise<InviteStaffResult> {
  await requireStaffRole(["OWNER"]);

  const role = ROLE_FROM_LABEL[input.roleLabel];
  if (!role) return { error: "Rol no reconocido." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    user_metadata: { name: input.name },
  });
  if (error || !data.user) {
    return { error: error?.message ?? "No se pudo crear la cuenta." };
  }

  await prisma.appUser.create({
    data: {
      id: data.user.id,
      name: input.name,
      email: input.email,
      role,
      salaryMxn: input.salaryMxn,
      status: "INVITED",
    },
  });

  const locationIds = await resolveLocationIds(input.locationLabel);
  for (const [i, locationId] of locationIds.entries()) {
    await prisma.staffLocationAssignment.create({
      data: { userId: data.user.id, locationId, isPrimary: i === 0 },
    });
  }

  await admin.auth.resetPasswordForEmail(input.email).catch(() => {
    // Account still exists even if the email send fails (rate limits,
    // etc.) — same tolerance as the bootstrap script; retry is a resend,
    // not a blocker.
  });

  revalidatePath("/admin/staff");
  return { userId: data.user.id };
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
