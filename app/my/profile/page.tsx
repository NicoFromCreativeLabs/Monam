import { ProfileForm } from "@/components/panel/ProfileForm";
import { requireClientOrPreview } from "@/lib/auth/dal";

export default async function ClientProfile() {
  const { client } = await requireClientOrPreview();
  return (
    <ProfileForm name={client.name} email={client.email ?? ""} phone={client.phone} role="Cliente" />
  );
}
