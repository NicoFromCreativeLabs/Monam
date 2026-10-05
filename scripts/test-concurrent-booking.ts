import { prisma } from "../lib/prisma";

// Standalone verification the schema comment itself calls for (see the
// "Domain 2 — Booking" block in prisma/schema.prisma): fires two concurrent
// inserts for the exact same room+time, then the same esthetician+time, and
// confirms Postgres's EXCLUDE constraints — not application code — reject
// the second one. Never run against a database with real appointments in
// it; this creates and then deletes throwaway rows.
//   npx tsx --env-file=.env.local scripts/test-concurrent-booking.ts

type Attempt = { label: string; ok: boolean; error?: string };

async function attemptInsert(data: Parameters<typeof prisma.appointment.create>[0]["data"]): Promise<Attempt & { id?: string }> {
  try {
    const row = await prisma.appointment.create({ data });
    return { label: "", ok: true, id: row.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { label: "", ok: false, error: message };
  }
}

async function raceAndAssertExactlyOneWins(
  label: string,
  build: (clientId: string, locationId: string, roomId: string, estheticianId: string, startAt: Date, endAt: Date) => [object, object],
  clientId: string,
  locationId: string,
  roomId: string,
  estheticianId: string,
  startAt: Date,
  endAt: Date,
): Promise<boolean> {
  const [dataA, dataB] = build(clientId, locationId, roomId, estheticianId, startAt, endAt);
  const [a, b] = await Promise.all([
    attemptInsert(dataA as never),
    attemptInsert(dataB as never),
  ]);

  const successes = [a, b].filter((r) => r.ok);
  const failures = [a, b].filter((r) => !r.ok);
  const pass = successes.length === 1 && failures.length === 1;

  console.log(`\n${label}`);
  console.log(`  insert A: ${a.ok ? "succeeded" : `rejected (${a.error?.split("\n")[0]})`}`);
  console.log(`  insert B: ${b.ok ? "succeeded" : `rejected (${b.error?.split("\n")[0]})`}`);
  console.log(`  ${pass ? "PASS" : "FAIL"} — expected exactly one insert to win, got ${successes.length}`);

  for (const r of successes) {
    if (r.id) await prisma.appointment.delete({ where: { id: r.id } }).catch(() => {});
  }
  return pass;
}

async function main() {
  const location = await prisma.location.findFirst({ orderBy: { createdAt: "asc" } });
  if (!location) throw new Error("No seeded location found — run the seed script first.");

  const rooms = await prisma.room.findMany({ where: { locationId: location.id }, take: 2 });
  if (rooms.length < 1) throw new Error("Location has no rooms seeded.");

  const estheticians = await prisma.appUser.findMany({
    where: { role: "ESTHETICIAN", status: "ACTIVE", locationAssignments: { some: { locationId: location.id } } },
    take: 2,
  });
  if (estheticians.length < 1) throw new Error("Location has no active esthetician seeded.");

  const client = await prisma.client.findFirst({ where: { anonymizedAt: null } });
  if (!client) throw new Error("No seeded client found.");

  // Far-future slot so this can never collide with a real booking.
  const startAt = new Date("2099-06-01T10:00:00");
  const endAt = new Date("2099-06-01T10:30:00");

  let allPassed = true;

  // Same room, same time, two different estheticians — the room constraint
  // alone must reject the second insert.
  allPassed =
    (await raceAndAssertExactlyOneWins(
      "Same room, same time slot",
      (clientId, locationId, roomId, estheticianId, s, e) => [
        { clientId, locationId, roomId, estheticianId, durationTier: "TARGETED", startAt: s, endAt: e },
        {
          clientId,
          locationId,
          roomId,
          estheticianId: estheticians[1]?.id ?? estheticianId,
          durationTier: "TARGETED",
          startAt: s,
          endAt: e,
        },
      ],
      client.id,
      location.id,
      rooms[0].id,
      estheticians[0].id,
      startAt,
      endAt,
    )) && allPassed;

  // Same esthetician, same time, two different rooms — the esthetician
  // constraint alone must reject the second insert.
  allPassed =
    (await raceAndAssertExactlyOneWins(
      "Same esthetician, same time slot",
      (clientId, locationId, roomId, estheticianId, s, e) => [
        { clientId, locationId, roomId, estheticianId, durationTier: "TARGETED", startAt: s, endAt: e },
        {
          clientId,
          locationId,
          roomId: rooms[1]?.id ?? roomId,
          estheticianId,
          durationTier: "TARGETED",
          startAt: s,
          endAt: e,
        },
      ],
      client.id,
      location.id,
      rooms[0].id,
      estheticians[0].id,
      startAt,
      endAt,
    )) && allPassed;

  // Identical row twice — both constraints apply, still exactly one winner.
  allPassed =
    (await raceAndAssertExactlyOneWins(
      "Identical room + esthetician + time",
      (clientId, locationId, roomId, estheticianId, s, e) => [
        { clientId, locationId, roomId, estheticianId, durationTier: "TARGETED", startAt: s, endAt: e },
        { clientId, locationId, roomId, estheticianId, durationTier: "TARGETED", startAt: s, endAt: e },
      ],
      client.id,
      location.id,
      rooms[0].id,
      estheticians[0].id,
      startAt,
      endAt,
    )) && allPassed;

  console.log(`\n${allPassed ? "All scenarios passed." : "Some scenarios FAILED — the EXCLUDE constraints are not enforcing correctly."}`);
  if (!allPassed) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
