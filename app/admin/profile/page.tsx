import { TopBar } from "@/components/panel/TopBar";
import { ProfileForm } from "@/components/panel/ProfileForm";
import { OWNER } from "@/lib/mock-data";

export default function AdminProfile() {
  return (
    <>
      <TopBar title="Mi perfil" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 px-8 py-6">
        <ProfileForm name={OWNER.name} email={OWNER.email} phone={OWNER.phone} role={OWNER.role} />
      </div>
    </>
  );
}
