"use client";

import { TopBar } from "@/components/panel/TopBar";
import { ProfileForm } from "@/components/panel/ProfileForm";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { FRONT_DESK_STAFF, ESTHETICIAN_STAFF } from "@/lib/mock-data";

export default function StaffProfile() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const full = role === "Front Desk" ? FRONT_DESK_STAFF : ESTHETICIAN_STAFF;

  return (
    <>
      <TopBar title="Mi perfil" userName={identity.name} userRole={identity.role} />
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
