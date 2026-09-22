import { Sidebar, type NavSection } from "@/components/panel/Sidebar";
import { PanelNavProvider } from "@/components/panel/PanelNavContext";

// Admin IA — see MONAM_OS_System_Specification.md §6.1.
const SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Panel" },
      { href: "/admin/calendar", label: "Calendario" },
      { href: "/admin/clients", label: "Clientes" },
    ],
  },
  {
    heading: "Operación",
    items: [
      { href: "/admin/inventory", label: "Inventario" },
      { href: "/admin/inventory/purchase-orders", label: "Órdenes de compra", disabled: true },
    ],
  },
  {
    heading: "Finanzas",
    items: [
      { href: "/admin/financials", label: "Reportes financieros" },
      { href: "/admin/commissions", label: "Comisiones" },
      { href: "/admin/promotions", label: "Promociones y paquetes", disabled: true },
    ],
  },
  {
    heading: "Administración",
    items: [
      { href: "/admin/staff", label: "Personal" },
      { href: "/admin/approvals", label: "Aprobaciones" },
      { href: "/admin/audit-log", label: "Registro de auditoría" },
      { href: "/admin/settings", label: "Configuración" },
    ],
  },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <PanelNavProvider>
      <div className="flex min-h-full flex-1">
        <Sidebar sections={SECTIONS} brandHref="/admin" />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </PanelNavProvider>
  );
}
