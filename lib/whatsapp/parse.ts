// Reading what a person types in WhatsApp: a day and a time. Pure (no database,
// no clock of its own — the studio's "today" is passed in), so it is tested and
// behaves the same on the server whatever its time zone.

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // "sábado" / "sabado"
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function validDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

// Accepts "hoy", "mañana", a weekday ("sábado" → the next one), "DD/MM",
// "DD/MM/YYYY" or "YYYY-MM-DD". Anything else is not understood (null). A
// "DD/MM" that has already passed this year means next year's.
export function parseDate(text: string, todayIso: string): string | null {
  const t = normalize(text);
  if (t === "hoy" || t === "today") return todayIso;
  if (t === "manana" || t === "tomorrow") return addDays(todayIso, 1);
  if (t === "pasado manana") return addDays(todayIso, 2);

  const weekday = WEEKDAYS.indexOf(t.replace(/^el\s+/, ""));
  if (weekday >= 0) {
    const todayDow = new Date(`${todayIso}T12:00:00Z`).getUTCDay();
    const ahead = (weekday - todayDow + 7) % 7 || 7; // "lunes" on a Monday means next Monday
    return addDays(todayIso, ahead);
  }

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = t.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const thisYear = Number(todayIso.slice(0, 4));
    if (dmy[3]) return validDate(Number(dmy[3]), month, day);
    const candidate = validDate(thisYear, month, day);
    if (candidate && candidate < todayIso) return validDate(thisYear + 1, month, day);
    return candidate;
  }
  return null;
}

// "10:00", "10", "2pm", "2:30 pm" → "HH:MM" (24h). No am/pm and an hour from 1
// to 7 is read as the afternoon (the studio does not open that early).
export function parseTime(text: string): string | null {
  const t = normalize(text).replace(/\s+/g, "").replace(/hrs?$/, "");
  const match = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;
  const [, hStr, mStr, ampm] = match;
  let h = Number(hStr);
  const m = mStr ? Number(mStr) : 0;
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (!ampm && h >= 1 && h <= 7) h += 12;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
