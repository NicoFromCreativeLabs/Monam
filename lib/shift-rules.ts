// Pure rules for esthetician shifts (check-in / check-out) — no database
// access, shared by the server actions, the pages and the tests.
import { studioNow } from "@/lib/booking-time";

// The sign-off the esthetician must tick before checking out. All of them are
// required; the wording is what she confirms.
export const CLEAN_CHECKLIST = [
  "Limpié y desinfecté la camilla y las superficies",
  "Lavé y guardé el material y los aparatos usados",
  "Dejé los productos guardados y la cabina ordenada",
  "Saqué la basura y la ropa de cama usada",
] as const;

// A shift still open when its day (Mexico City) is over was forgotten: it no
// longer holds the cabina or counts as today's shift.
export function isShiftStale(checkInAt: Date, now = new Date()): boolean {
  return studioNow(checkInAt).date < studioNow(now).date;
}

export function canCheckOut(input: { checklist: boolean[]; cleanSignoff: boolean }): boolean {
  return (
    input.cleanSignoff &&
    input.checklist.length === CLEAN_CHECKLIST.length &&
    input.checklist.every(Boolean)
  );
}

export function shiftDurationLabel(checkInAt: Date, checkOutAt: Date | null, now = new Date()): string {
  const end = checkOutAt ?? now;
  const minutes = Math.max(0, Math.round((end.getTime() - checkInAt.getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}
