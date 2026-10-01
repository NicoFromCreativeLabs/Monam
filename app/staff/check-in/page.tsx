import { prisma } from "@/lib/prisma";
import { getTodayAppointments } from "@/lib/appointments";
import { StaffCheckInView } from "@/components/panel/StaffCheckInView";

export default async function StaffCheckIn() {
  const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const queue = romaNorte ? await getTodayAppointments(romaNorte.id) : [];
  const clients = await prisma.client.findMany({
    where: { anonymizedAt: null },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });

  return <StaffCheckInView queue={queue} clients={clients} />;
}
