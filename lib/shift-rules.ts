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

// ---------------------------------------------------------------------------
// Front desk (vendedor): check-in opens the cash register and picks the sede;
// check-out runs this checklist and counts the cash.
// ---------------------------------------------------------------------------

export const FRONT_DESK_CHECKLIST = [
  "Todos los cobros del día están registrados",
  "Guardé el efectivo y los comprobantes de la terminal en el lugar seguro",
  "La terminal de tarjetas quedó apagada o cargando",
  "No quedan clientas esperando ni citas sin atender",
  "Dejé la recepción limpia y ordenada",
  "Apagué luces, aire acondicionado y equipos",
] as const;

// What should be in the cash drawer: the opening float plus the cash collected.
export function expectedCash(openingFloatMxn: number, cashSalesMxn: number): number {
  return openingFloatMxn + cashSalesMxn;
}

// Positive: more cash than expected; negative: missing.
export function cashDifference(countedMxn: number, expectedMxn: number): number {
  return countedMxn - expectedMxn;
}

export type CheckOutCheck = { ok: true } | { ok: false; reason: string };

// A front desk check-out needs: every checklist point, the signature, the cash
// counted when this person closes the caja (the last one out), and a note when
// clients were still waiting to be charged.
export function frontDeskCheckOutCheck(input: {
  checklist: boolean[];
  signed: boolean;
  closesCaja: boolean;
  countedMxn: number | null;
  pendingCharges: number;
  note: string;
}): CheckOutCheck {
  if (input.checklist.length !== FRONT_DESK_CHECKLIST.length || !input.checklist.every(Boolean)) {
    return { ok: false, reason: "Confirma todos los puntos del checklist." };
  }
  if (!input.signed) return { ok: false, reason: "Firma que revisaste que todo está en orden." };
  if (input.closesCaja) {
    if (input.countedMxn === null || !Number.isFinite(input.countedMxn) || input.countedMxn < 0) {
      return { ok: false, reason: "Cuenta el efectivo de la caja e ingresa el monto." };
    }
  }
  if (input.pendingCharges > 0 && input.note.trim().length < 3) {
    return {
      ok: false,
      reason: `Hay ${input.pendingCharges} ${input.pendingCharges === 1 ? "clienta lista" : "clientas listas"} para cobro. Cóbrala o escribe una nota.`,
    };
  }
  return { ok: true };
}
