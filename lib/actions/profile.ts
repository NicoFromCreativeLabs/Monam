"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientOrPreview, requireStaffRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { CATALOG_CACHE_TAG } from "@/lib/catalog-cache";

// "Mi perfil" for all three panels. The caller's own row is always derived
// from the session (never a caller-supplied id), and `kind` picks which
// identity is being edited — an Owner who also has a client account edits
// the staff row from /admin/profile and the client row from /my/profile.
// Email is the login identifier, so it's read-only here; changing it is a
// separate auth flow (Supabase email-change confirmation), not a text box.

export type ProfileKind = "staff" | "client";
export type ProfileResult = { error?: string };

export async function updateOwnProfileAction(
  kind: ProfileKind,
  data: { name: string; phone?: string },
): Promise<ProfileResult> {
  const name = data.name.trim();
  if (!name) return { error: "El nombre no puede estar vacío." };

  if (kind === "staff") {
    const appUser = await requireStaffRole(["OWNER", "CLINIC_MANAGER", "FRONT_DESK", "ESTHETICIAN"], { allowWithoutShift: true });
    await prisma.appUser.update({ where: { id: appUser.id }, data: { name } });
    revalidatePath("/admin", "layout");
    revalidatePath("/staff", "layout");
    // The staff roster (used by StaffRosterProvider) is part of the cached
    // getCatalogData — a name change here previously wouldn't show up there.
    updateTag(CATALOG_CACHE_TAG);
    return {};
  }

  const { client } = await requireClientOrPreview();
  const phone = (data.phone ?? "").trim();
  if (phone.replace(/\D/g, "").length < 10) {
    return { error: "Ingresa un número de WhatsApp válido (10 dígitos)." };
  }
  if (phone !== client.phone) {
    const taken = await prisma.client.findUnique({ where: { phone } });
    if (taken) return { error: "Ya existe una cuenta con este número de WhatsApp." };
  }
  await prisma.client.update({ where: { id: client.id }, data: { name, phone } });
  revalidatePath("/my", "layout");
  revalidatePath("/admin/clients");
  revalidatePath("/staff/clients");
  return {};
}

export async function updateOwnPasswordAction(next: string, confirm: string): Promise<ProfileResult> {
  if (next.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (next !== confirm) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: "No se pudo actualizar la contraseña. Intenta de nuevo." };
  return {};
}
