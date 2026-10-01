"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient, requireStaffRole } from "@/lib/auth/dal";

// ---------------------------------------------------------------------------
// Client self-service (/my/skin-id, /my/preferences) — every action derives
// the target row from requireClient()'s own id, never from a caller-supplied
// clientId, so a client can only ever read/write their own record.
// ---------------------------------------------------------------------------

export interface SkinIdInput {
  skinType: string;
  allergies: string; // comma-separated in the form, split on save
  medications: string;
  visitObjective: string;
  sunExposure: string;
  notes: string;
}

export async function updateOwnSkinIdAction(data: SkinIdInput) {
  const client = await requireClient();

  await prisma.clientSkinId.upsert({
    where: { clientId: client.id },
    create: {
      clientId: client.id,
      skinType: data.skinType || null,
      allergies: splitList(data.allergies),
      medications: splitList(data.medications),
      visitObjective: data.visitObjective || null,
      sunExposure: data.sunExposure || null,
      clinicalNotes: data.notes || null,
    },
    update: {
      skinType: data.skinType || null,
      allergies: splitList(data.allergies),
      medications: splitList(data.medications),
      visitObjective: data.visitObjective || null,
      sunExposure: data.sunExposure || null,
      clinicalNotes: data.notes || null,
    },
  });

  revalidatePath("/my/skin-id");
  revalidatePath("/admin/clients");
  revalidatePath("/staff/clients");
}

export interface PreferencesInput {
  beverage: string;
  aromatherapy: string;
  conversation: string;
}

export async function updateOwnPreferencesAction(data: PreferencesInput) {
  const client = await requireClient();

  await prisma.clientPreference.upsert({
    where: { clientId: client.id },
    create: {
      clientId: client.id,
      beverage: data.beverage || null,
      aromatherapy: data.aromatherapy || null,
      conversationStyle: data.conversation || null,
    },
    update: {
      beverage: data.beverage || null,
      aromatherapy: data.aromatherapy || null,
      conversationStyle: data.conversation || null,
    },
  });

  revalidatePath("/my/preferences");
  revalidatePath("/admin/clients");
  revalidatePath("/staff/clients");
}

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Staff/Admin side (admin/clients/[id]) — Owner/Clinic Manager only, same
// boundary as lib/actions/catalog.ts's editors. Takes an explicit clientId
// since staff act on other people's records, unlike the self-service
// actions above.
// ---------------------------------------------------------------------------

async function requireClientEditor() {
  return requireStaffRole(["OWNER", "CLINIC_MANAGER"]);
}

export async function updateClientContactAction(
  clientId: string,
  data: { name: string; email: string; phone: string },
) {
  await requireClientEditor();
  await prisma.client.update({ where: { id: clientId }, data });
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
}

export interface StaffSkinIdInput {
  skinType: string;
  allergies: string; // comma-separated
  medications: string; // comma-separated
  pregnancyOrBreastfeeding: boolean;
  recentProcedures: string;
  visitObjective: string;
  sunExposure: string;
  notes: string;
}

export async function updateClientSkinIdAction(clientId: string, data: StaffSkinIdInput) {
  await requireClientEditor();

  const fields = {
    skinType: data.skinType || null,
    allergies: splitList(data.allergies),
    medications: splitList(data.medications),
    pregnancyOrBreastfeeding: data.pregnancyOrBreastfeeding,
    recentProcedures: data.recentProcedures || null,
    visitObjective: data.visitObjective || null,
    sunExposure: data.sunExposure || null,
    clinicalNotes: data.notes || null,
  };

  await prisma.clientSkinId.upsert({
    where: { clientId },
    create: { clientId, ...fields },
    update: fields,
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/staff/clients");
}

// "Esteticista preferida" isn't editable here yet — it's a real FK
// (AppUser), not free text, and needs a proper esthetician picker; deferred
// rather than half-wired to something that doesn't actually save.
export async function updateClientPreferencesAction(
  clientId: string,
  data: { beverage: string; music: string; aromatherapy: string; conversation: string },
) {
  await requireClientEditor();

  const fields = {
    beverage: data.beverage || null,
    music: data.music || null,
    aromatherapy: data.aromatherapy || null,
    conversationStyle: data.conversation || null,
  };

  await prisma.clientPreference.upsert({
    where: { clientId },
    create: { clientId, ...fields },
    update: fields,
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/staff/clients");
}

// ARCO deletion (spec §5.6) — anonymizes in place rather than hard-deleting:
// the appointment/sale/commission history a real business needs for
// accounting stays intact, it just stops being linkable to a real person.
// Owner-only, not Clinic Manager — the client database being
// un-exportable/undeletable by anyone but the Owners is a stated
// non-negotiable. Does NOT delete the Supabase Auth user itself (a separate,
// more irreversible operation) or the ClientPhoto storage objects (only
// their DB rows) — both are flagged here as manual follow-up, not silently
// skipped.
export async function anonymizeClientAction(clientId: string) {
  const owner = await requireStaffRole(["OWNER"]);

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.anonymizedAt) return;

  await prisma.$transaction([
    prisma.clientPhoto.deleteMany({ where: { clientId } }),
    prisma.client.update({
      where: { id: clientId },
      data: {
        name: "Cliente anonimizado",
        email: null,
        phone: `anon-${clientId}`,
        authUserId: null,
        anonymizedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: owner.id,
        actorRole: owner.role,
        action: "ANONYMIZE",
        entityType: "Client",
        entityId: clientId,
        reason: "Solicitud ARCO — derecho de cancelación/oposición",
      },
    }),
  ]);

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
}
