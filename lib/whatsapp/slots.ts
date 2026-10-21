import { BUSINESS_HOURS } from "@/lib/mock-data";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

// Every bookable start time of that day (every 30 min, from opening to the last
// start for the duration), by the studio's hours for that weekday. Used to
// offer free times when the one asked for is taken.
export function candidateTimes(dateIso: string, tier: "Targeted" | "Signature"): string[] {
  const dayName = DAY_NAMES[new Date(`${dateIso}T12:00:00Z`).getUTCDay()];
  const hours = BUSINESS_HOURS.find((h) => h.day === dayName);
  if (!hours) return [];
  const last = tier === "Signature" ? hours.lastStart60 : hours.lastStart30;
  const out: string[] = [];
  for (let t = toMinutes(hours.open); t <= toMinutes(last); t += 30) out.push(toTime(t));
  return out;
}
