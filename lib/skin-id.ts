import type { SkinIdInput } from "@/lib/actions/clients";

// The three single-choice answers every client must give before using /my
// (first-visit onboarding). Allergies, medications and notes are free text
// where "none" is a legitimate answer, so they don't gate access.
export function isSkinIdComplete(
  skinId: { skinType: string | null; visitObjective: string | null; sunExposure: string | null } | null,
): boolean {
  return !!skinId?.skinType && !!skinId.visitObjective && !!skinId.sunExposure;
}

export function skinIdToInput(
  skinId: {
    skinType: string | null;
    allergies: string[];
    medications: string[];
    visitObjective: string | null;
    sunExposure: string | null;
    clinicalNotes: string | null;
  } | null,
): SkinIdInput {
  return {
    skinType: skinId?.skinType ?? "",
    allergies: skinId?.allergies.join(", ") ?? "",
    medications: skinId?.medications.join(", ") ?? "",
    visitObjective: skinId?.visitObjective ?? "",
    sunExposure: skinId?.sunExposure ?? "",
    notes: skinId?.clinicalNotes ?? "",
  };
}
