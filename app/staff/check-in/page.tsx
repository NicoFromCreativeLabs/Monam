import { prisma } from "@/lib/prisma";
import { getTodayAppointments } from "@/lib/appointments";
import { StaffCheckInView } from "@/components/panel/StaffCheckInView";

export default async function StaffCheckIn() {
  const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const queue = romaNorte ? await getTodayAppointments(romaNorte.id) : [];

  return <StaffCheckInView queue={queue} />;
}
