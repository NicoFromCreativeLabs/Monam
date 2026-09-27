import { Sidebar, type NavSection } from "@/components/panel/Sidebar";
import { PanelNavProvider } from "@/components/panel/PanelNavContext";

// Admin IA — rebuilt per client review (16-page spec, Sep 2026). See
// MONAM_OS_System_Specification.md §6.1 for the original IA; this
// supersedes it with: Panel top-level, OPERACIÓN, VENTAS, ANÁLISIS (6
// sub-pages), EQUIPO, CONTROL (Aprobaciones + Auditoría fused), and an
// extended CONFIGURACIÓN. Old /admin/financials and /admin/approvals +
// /admin/audit-log routes were folded into the new pages below rather than
// kept as orphaned routes — see git history for the previous IA.
const SECTIONS: NavSection[] = [
  {
    items: [{ href: "/admin", label: "Panel" }],
  },
  {
    heading: "Operación",
    items: [
      { href: "/admin/calendar", label: "Calendario" },
      { href: "/admin/clients", label: "Clientes" },
      { href: "/admin/inventory", label: "Inventario" },
      { href: "/admin/inventory/purchase-orders", label: "Órdenes de compra", disabled: true },
    ],
  },
  {
    heading: "Ventas",
    items: [
      { href: "/admin/sales", label: "Caja y cobros" },
      { href: "/admin/promotions", label: "Paquetes y promociones", disabled: true },
    ],
  },
  {
    heading: "Análisis",
    items: [
      { href: "/admin/analytics/ventas", label: "Ventas" },
      { href: "/admin/analytics/capacidad", label: "Capacidad" },
      { href: "/admin/analytics/clientas", label: "Clientas" },
      { href: "/admin/analytics/retail", label: "Retail" },
      { href: "/admin/analytics/equipo", label: "Equipo" },
      { href: "/admin/analytics/pnl", label: "P&L" },
    ],
  },
  {
    heading: "Equipo",
    items: [
      { href: "/admin/staff", label: "Personal y horarios" },
      { href: "/admin/commissions", label: "Comisiones" },
    ],
  },
  {
    heading: "Control",
    items: [{ href: "/admin/control", label: "Aprobaciones y auditoría" }],
  },
  {
    heading: "Administración",
    items: [{ href: "/admin/settings", label: "Configuración" }],
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
