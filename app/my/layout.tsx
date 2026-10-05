import { ClientNav } from "@/components/panel/ClientNav";
import { CurrentClientProvider } from "@/components/panel/CurrentClientContext";
import { requireClientOrPreview } from "@/lib/auth/dal";

export default async function ClientLayout({ children }: LayoutProps<"/my">) {
  const { client, isPreview } = await requireClientOrPreview();

  return (
    <CurrentClientProvider value={{ name: client.name, email: client.email ?? "", phone: client.phone }}>
      <div className="flex min-h-full flex-1 flex-col">
        <ClientNav />
        {isPreview && (
          <p className="bg-crepe px-6 py-1.5 text-center font-body text-xs text-ciruela">
            Vista de cliente (previsualización) — viendo como {client.name}
          </p>
        )}
        <div className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-8">{children}</div>
      </div>
    </CurrentClientProvider>
  );
}
