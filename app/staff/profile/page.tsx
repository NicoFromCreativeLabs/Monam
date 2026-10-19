import { TopBar } from "@/components/panel/TopBar";
import { ProfileForm } from "@/components/panel/ProfileForm";
import { requireStaffRole, roleLabel } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export default async function StaffProfile() {
  const user = await requireStaffRole(["OWNER", "CLINIC_MANAGER", "FRONT_DESK", "ESTHETICIAN"], { allowWithoutShift: true });
  const assignments = await prisma.staffLocationAssignment.findMany({
    where: { userId: user.id },
    include: { location: true },
    orderBy: { isPrimary: "desc" },
  });

  return (
    <>
      <TopBar title="Mi perfil" />
      <div className="flex-1 px-8 py-6">
        <ProfileForm
          kind="staff"
          name={user.name}
          email={user.email}
          role={roleLabel(user.role)}
          location={assignments.map((a) => a.location.name).join(", ") || undefined}
        />
      </div>
    </>
  );
}
