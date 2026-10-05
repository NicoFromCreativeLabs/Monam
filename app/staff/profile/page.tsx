"use client";

import { TopBar } from "@/components/panel/TopBar";
import { ProfileForm } from "@/components/panel/ProfileForm";
import { useStaffRole } from "@/components/panel/StaffRoleContext";
import { FRONT_DESK_STAFF, ESTHETICIAN_STAFF } from "@/lib/mock-data";

export default function StaffProfile() {
  const { role } = useStaffRole();
  const full = role === "Front Desk" ? FRONT_DESK_STAFF : ESTHETICIAN_STAFF;

  return (
    <>
      <TopBar title="Mi perfil" />
      <div className="flex-1 px-8 py-6">
        <ProfileForm
          name={full.name}
          email={full.email}
          phone={full.phone}
          role={full.role}
          location={full.location}
        />
      </div>
    </>
  );
}
