import { ProfileForm } from "@/components/panel/ProfileForm";
import { requireClient } from "@/lib/auth/dal";

export default async function ClientProfile() {
  const client = await requireClient();
  return (
    <ProfileForm name={client.name} email={client.email ?? ""} phone={client.phone} role="Cliente" />
  );
}
