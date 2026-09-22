import { ProfileForm } from "@/components/panel/ProfileForm";
import { CLIENT } from "@/lib/mock-data";

export default function ClientProfile() {
  return (
    <ProfileForm name={CLIENT.name} email={CLIENT.email} phone={CLIENT.phone} role={CLIENT.role} />
  );
}
