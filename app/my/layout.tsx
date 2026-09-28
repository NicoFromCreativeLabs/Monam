import { ClientNav } from "@/components/panel/ClientNav";
import { CurrentClientProvider } from "@/components/panel/CurrentClientContext";
import { requireClient } from "@/lib/auth/dal";

export default async function ClientLayout({ children }: LayoutProps<"/my">) {
  const client = await requireClient();

  return (
    <CurrentClientProvider value={{ name: client.name, email: client.email ?? "", phone: client.phone }}>
      <div className="flex min-h-full flex-1 flex-col">
        <ClientNav />
        <div className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-8">{children}</div>
      </div>
    </CurrentClientProvider>
  );
}
