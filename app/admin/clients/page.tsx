import Link from "next/link";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { OWNER, CLIENTS_LIST } from "@/lib/mock-data";

// Full-text search across the shared client database (spec §6.3).
// No bulk export control exists for any role but Owner — see Settings/Audit
// Log for the logged export action; there is none here on purpose.
export default function AdminClients() {
  return (
    <>
      <TopBar title="Clientes" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 px-8 py-6">
        <Card>
          <input
            type="search"
            placeholder="Buscar por nombre o teléfono…"
            className="mb-4 w-full rounded-full border border-ciruela/20 bg-hueso px-4 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
          />
          <table className="w-full font-body text-sm text-ciruela">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">Nombre</th>
                <th className="pb-2">Teléfono</th>
                <th className="pb-2">Tipo de piel</th>
                <th className="pb-2">Última visita</th>
                <th className="pb-2">Notas</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {CLIENTS_LIST.map((c) => (
                <tr key={c.id} className="border-t border-ciruela/8">
                  <td className="py-3">{c.name}</td>
                  <td className="py-3 text-ciruela/60">{c.phone}</td>
                  <td className="py-3 text-ciruela/60">{c.skinType}</td>
                  <td className="py-3 text-ciruela/60">{c.lastVisit}</td>
                  <td className="py-3 text-xs text-crepe">{c.flags.join(" · ")}</td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="font-body text-xs text-ciruela underline"
                    >
                      Ver expediente
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
