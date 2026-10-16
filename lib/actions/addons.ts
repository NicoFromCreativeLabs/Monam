"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";

// Add-ons menu editing (Configuración → Add-ons). Owner/Clinic Manager only,
// enforced here and not by hiding the buttons. `availableOn` is a list of
// protocol names (what the UI shows); it is resolved to AddOnProtocol rows.

export interface AddOnInput {
  name: string;
  function: string;
  extraMinutes: number;
  availableOn: string[];
}

export type AddOnResult = { error: string } | { id: string };

function validate(input: AddOnInput): string | null {
  if (!input.name.trim()) return "El nombre no puede estar vacío.";
  if (!Number.isInteger(input.extraMinutes) || input.extraMinutes < 0 || input.extraMinutes > 120) {
    return "Los minutos extra deben ser un número entre 0 y 120.";
  }
  return null;
}

async function protocolIds(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const rows = await prisma.protocol.findMany({ where: { name: { in: names } }, select: { id: true } });
  return rows.map((r) => r.id);
}

function revalidate() {
  // The add-on list is seeded in the root layout (app/layout.tsx), which
  // wraps every route — same reason catalog.ts revalidates the whole layout.
  revalidatePath("/", "layout");
}

export async function addAddOnAction(input: AddOnInput): Promise<AddOnResult> {
  await requireStaffRole(["OWNER", "CLINIC_MANAGER"]);
  const problem = validate(input);
  if (problem) return { error: problem };

  const ids = await protocolIds(input.availableOn);
  const created = await prisma.addOn.create({
    data: {
      name: input.name.trim(),
      function: input.function.trim(),
      extraMinutes: input.extraMinutes,
      protocols: { create: ids.map((protocolId) => ({ protocolId })) },
    },
  });
  revalidate();
  return { id: created.id };
}

export async function updateAddOnAction(id: string, input: AddOnInput): Promise<{ error?: string }> {
  await requireStaffRole(["OWNER", "CLINIC_MANAGER"]);
  const problem = validate(input);
  if (problem) return { error: problem };

  const ids = await protocolIds(input.availableOn);
  await prisma.$transaction([
    prisma.addOn.update({
      where: { id },
      data: { name: input.name.trim(), function: input.function.trim(), extraMinutes: input.extraMinutes },
    }),
    prisma.addOnProtocol.deleteMany({ where: { addOnId: id } }),
    prisma.addOnProtocol.createMany({ data: ids.map((protocolId) => ({ addOnId: id, protocolId })) }),
  ]);
  revalidate();
  return {};
}

export async function removeAddOnAction(id: string): Promise<{ error?: string }> {
  await requireStaffRole(["OWNER", "CLINIC_MANAGER"]);

  // Add-ons have no "inactive" flag, so one that already appears on a sale
  // can't be erased without breaking that sale's history.
  const used = await prisma.saleLineItem.count({ where: { addOnId: id } });
  if (used > 0) {
    return { error: "Este add-on ya aparece en ventas registradas, así que no se puede borrar." };
  }

  await prisma.$transaction([
    prisma.addOnProtocol.deleteMany({ where: { addOnId: id } }),
    prisma.addOn.delete({ where: { id } }),
  ]);
  revalidate();
  return {};
}
