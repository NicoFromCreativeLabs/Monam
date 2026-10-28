"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { CATALOG_CACHE_TAG } from "@/lib/catalog-cache";

// Add-ons menu editing (Configuración → Add-ons). Owner/Clinic Manager only,
// enforced here and not by hiding the buttons. `availableOn` is a list of
// protocol names (what the UI shows); it is resolved to AddOnProtocol rows.

export interface AddOnInput {
  name: string;
  function: string;
  extraMinutes: number;
  priceMxn: number; // extra charge on top of the facial; 0 = included
  costMxn: number; // product cost each time it is used (feeds the P&L)
  availableOn: string[];
}

export type AddOnResult = { error: string } | { id: string };

function validate(input: AddOnInput): string | null {
  if (!input.name.trim()) return "El nombre no puede estar vacío.";
  if (!Number.isInteger(input.extraMinutes) || input.extraMinutes < 0 || input.extraMinutes > 120) {
    return "Los minutos extra deben ser un número entre 0 y 120.";
  }
  if (!Number.isInteger(input.priceMxn) || input.priceMxn < 0 || input.priceMxn > 100000) {
    return "El precio debe ser un número entero de pesos (0 si va incluido).";
  }
  if (!Number.isInteger(input.costMxn) || input.costMxn < 0 || input.costMxn > 100000) {
    return "El costo debe ser un número entero de pesos (0 si no aplica).";
  }
  return null;
}

async function protocolIds(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const rows = await prisma.protocol.findMany({ where: { name: { in: names } }, select: { id: true } });
  return rows.map((r) => r.id);
}

function revalidate() {
  // The add-on list is served from the cached getCatalogData (lib/catalog-cache.ts),
  // shared by every route — same reason catalog.ts revalidates this tag.
  updateTag(CATALOG_CACHE_TAG);
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
      priceMxn: input.priceMxn,
      costMxn: input.costMxn,
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
      data: {
        name: input.name.trim(),
        function: input.function.trim(),
        extraMinutes: input.extraMinutes,
        priceMxn: input.priceMxn,
        costMxn: input.costMxn,
      },
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
  const [onSales, onAppointments] = await Promise.all([
    prisma.saleLineItem.count({ where: { addOnId: id } }),
    prisma.appointmentAddOn.count({ where: { addOnId: id } }),
  ]);
  if (onSales + onAppointments > 0) {
    return { error: "Este add-on ya aparece en citas o ventas registradas, así que no se puede borrar." };
  }

  await prisma.$transaction([
    prisma.addOnProtocol.deleteMany({ where: { addOnId: id } }),
    prisma.addOn.delete({ where: { id } }),
  ]);
  revalidate();
  return {};
}
