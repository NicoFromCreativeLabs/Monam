import { ClientNav } from "@/components/panel/ClientNav";

export default function ClientLayout({ children }: LayoutProps<"/my">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <ClientNav />
      <div className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
