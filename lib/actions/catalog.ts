"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";

// Editing the location/protocol menu is Owner/Clinic Manager territory —
// same boundary Configuración already implies by only being in the Admin
// nav, now actually enforced server-side rather than by hiding a UI link.
async function requireCatalogEditor() {
  return requireStaffRole(["OWNER", "CLINIC_MANAGER"]);
}

function revalidateCatalog() {
  // The actual fetch lives in the root layout (app/layout.tsx), which wraps
  // every route including the static marketing homepage — revalidate that
  // too, not just the three panels, so a Location/Protocol edit can't leave
  // a stale cached copy anywhere in the tree.
  revalidatePath("/", "layout");
}

export interface LocationRoomInput {
  id: string;
  name: string;
}

export interface LocationPatch {
  name?: string;
  address?: string;
  isActive?: boolean;
  rentCost?: number;
  maintenanceCost?: number;
  rooms?: LocationRoomInput[];
}

// Rooms arrive as the full replacement list (LocationsContext's existing
// contract — Configuración always sends the complete set, not a diff), so
// this syncs Postgres to match: upsert every room in the list by its own id
// (client-generated UUIDs for new rooms double as their real row id — no
// remapping needed), then delete whatever's no longer present.
export async function updateLocationAction(id: string, patch: LocationPatch) {
  await requireCatalogEditor();

  const { rooms, rentCost, maintenanceCost, ...rest } = patch;
  await prisma.location.update({
    where: { id },
    data: {
      ...rest,
      ...(rentCost !== undefined ? { rentCostMxn: rentCost } : {}),
      ...(maintenanceCost !== undefined ? { maintenanceCostMxn: maintenanceCost } : {}),
    },
  });

  if (rooms) {
    for (const room of rooms) {
      await prisma.room.upsert({
        where: { id: room.id },
        create: { id: room.id, locationId: id, name: room.name },
        update: { name: room.name },
      });
    }
    await prisma.room.deleteMany({
      where: { locationId: id, id: { notIn: rooms.map((r) => r.id) } },
    });
  }

  revalidateCatalog();
}

export async function addLocationAction(data: {
  name: string;
  address: string;
  isActive: boolean;
  rentCost: number;
  maintenanceCost: number;
  rooms: LocationRoomInput[];
}) {
  await requireCatalogEditor();

  const location = await prisma.location.create({
    data: {
      name: data.name,
      address: data.address,
      isActive: data.isActive,
      rentCostMxn: data.rentCost,
      maintenanceCostMxn: data.maintenanceCost,
      rooms: { create: data.rooms.map((r) => ({ id: r.id, name: r.name })) },
    },
  });

  revalidateCatalog();
  return location.id;
}

export interface ProtocolPatch {
  tier?: "Targeted" | "Signature";
  duration?: number;
  price?: number;
  cost?: number;
}

const TIER_TO_DB = { Targeted: "TARGETED", Signature: "SIGNATURE" } as const;

export async function updateProtocolAction(id: string, patch: ProtocolPatch) {
  await requireCatalogEditor();

  await prisma.protocol.update({
    where: { id },
    data: {
      ...(patch.tier !== undefined ? { tier: TIER_TO_DB[patch.tier] } : {}),
      ...(patch.duration !== undefined ? { durationMin: patch.duration } : {}),
      ...(patch.price !== undefined ? { priceMxn: patch.price } : {}),
      ...(patch.cost !== undefined ? { costMxn: patch.cost } : {}),
    },
  });

  revalidateCatalog();
}

export async function addProtocolAction(data: {
  name: string;
  tier: "Targeted" | "Signature";
  duration: number;
  price: number;
  cost: number;
}) {
  await requireCatalogEditor();

  const protocol = await prisma.protocol.create({
    data: {
      name: data.name,
      tier: TIER_TO_DB[data.tier],
      durationMin: data.duration,
      priceMxn: data.price,
      costMxn: data.cost,
    },
  });

  revalidateCatalog();
  return protocol.id;
}

// Soft-delete — a hard delete would fail once real Appointment/
// TreatmentRecord rows reference this protocol, and "remove" in Settings
// has always meant "stop offering it," not "erase its history."
export async function removeProtocolAction(id: string) {
  await requireCatalogEditor();
  await prisma.protocol.update({ where: { id }, data: { isActive: false } });
  revalidateCatalog();
}
