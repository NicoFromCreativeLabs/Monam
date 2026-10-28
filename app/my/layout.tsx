import { ClientNav } from "@/components/panel/ClientNav";
import { ClientSkinIdForm } from "@/components/panel/ClientSkinIdForm";
import { CurrentClientProvider } from "@/components/panel/CurrentClientContext";
import { getCurrentAppUser, requireClientOrPreview } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { isSkinIdComplete, skinIdToInput } from "@/lib/skin-id";

export default async function ClientLayout({ children }: LayoutProps<"/my">) {
  const { client } = await requireClientOrPreview();

  // First-visit onboarding: a client can't use /my (booking, packages, etc.)
  // until their Skin ID is filled in, so every client record starts with a
  // real one. Replaces the whole shell rather than redirecting, so it covers
  // every /my route without needing the pathname. Staff (Owner/Manager
  // opening /my from the view switcher) are exempt — it's their preview.
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    const skinId = await prisma.clientSkinId.findUnique({ where: { clientId: client.id } });
    if (!isSkinIdComplete(skinId)) {
      const firstName = client.name.split(" ")[0];
      return (
        <div className="mx-auto w-full max-w-[640px] flex-1 px-6 py-10">
          <h1 className="font-display text-2xl text-ciruela">Bienvenida, {firstName}</h1>
          <p className="mb-6 mt-2 font-body text-sm text-ciruela/70">
            Antes de reservar, cuéntanos sobre tu piel. Solo toma un minuto y nos ayuda a
            preparar tu primer tratamiento.
          </p>
          <ClientSkinIdForm initial={skinIdToInput(skinId)} onboarding />
        </div>
      );
    }
  }

  return (
    <CurrentClientProvider value={{ name: client.name, email: client.email ?? "", phone: client.phone ?? "" }}>
      <div className="flex min-h-full flex-1 flex-col">
        <ClientNav />
        <div className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-8">{children}</div>
      </div>
    </CurrentClientProvider>
  );
}
