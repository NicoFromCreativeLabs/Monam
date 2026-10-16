// "Is this slot already in the past?", judged on Mexico City wall-clock time.
// Slots are entered as plain date + HH:MM strings in the studio's own time
// zone, so they are compared as strings against "now in Mexico City" — this
// does not depend on the server's time zone (the published site runs in UTC,
// a developer machine does not).
export const STUDIO_TIME_ZONE = "America/Mexico_City";

export function studioNow(now = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

// A slot that starts at or before the current minute can no longer be booked.
export function isSlotInPast(date: string, time: string, now = new Date()): boolean {
  const current = studioNow(now);
  return `${date} ${time}` <= `${current.date} ${current.time}`;
}
