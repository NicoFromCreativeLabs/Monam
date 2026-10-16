import { TopBar } from "@/components/panel/TopBar";
import { ProfileForm } from "@/components/panel/ProfileForm";
import { requireStaffRole, roleLabel } from "@/lib/auth/dal";

export default async function AdminProfile() {
  const user = await requireStaffRole(["OWNER", "CLINIC_MANAGER"]);
  return (
    <>
      <TopBar title="Mi perfil" allowBothLocations />
      <div className="flex-1 px-8 py-6">
        <ProfileForm kind="staff" name={user.name} email={user.email} role={roleLabel(user.role)} />
      </div>
    </>
  );
}
