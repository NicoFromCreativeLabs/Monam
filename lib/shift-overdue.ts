import { STUDIO_TIME_ZONE, studioNow } from "@/lib/booking-time";
import { BUSINESS_HOURS } from "@/lib/mock-data";
import { isShiftStale } from "@/lib/shift-rules";

// A shift still open an hour after the studio closed, or left open from an
// earlier day, was forgotten: the admin is alerted. Pure, so the alert logic
// and the tests share it.
export const OVERDUE_GRACE_MIN = 60;

function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Today's closing time at the studio ("20:00"), by Mexico City weekday.
export function closingTimeToday(now: Date): string | null {
  const weekday = new Intl.DateTimeFormat("es-MX", { weekday: "long", timeZone: STUDIO_TIME_ZONE }).format(now);
  const name = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return BUSINESS_HOURS.find((d) => d.day === name)?.close ?? null;
}

export function isShiftOverdue(checkInAt: Date, now = new Date()): boolean {
  if (isShiftStale(checkInAt, now)) return true;
  const close = closingTimeToday(now);
  if (!close) return false;
  return minutes(studioNow(now).time) >= minutes(close) + OVERDUE_GRACE_MIN;
}
