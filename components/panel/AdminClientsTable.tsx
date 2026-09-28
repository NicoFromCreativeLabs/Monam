"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/panel/Card";

export interface AdminClientRow {
  id: string;
  name: string;
  phone: string;
  skinType: string;
  allergies: string;
}

export function AdminClientsTable({ clients }: { clients: AdminClientRow[] }) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const filtered = term
    ? clients.filter(
        (c) => c.name.toLowerCase().includes(term) || c.phone.replace(/\s/g, "").includes(term.replace(/\s/g, "")),
      )
    : clients;

  return (
    <Card>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o teléfono…"
        className="mb-4 w-full rounded-full border border-ciruela/20 bg-hueso px-4 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
      />
      {filtered.length === 0 ? (
        <p className="py-6 text-center font-body text-sm text-ciruela/50">Sin resultados.</p>
      ) : (
        <table className="w-full font-body text-sm text-ciruela">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
              <th className="pb-2">Nombre</th>
              <th className="pb-2">Teléfono</th>
              <th className="pb-2">Tipo de piel</th>
              <th className="pb-2">Alergias</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-ciruela/8">
                <td className="py-3">{c.name}</td>
                <td className="py-3 text-ciruela/60">{c.phone}</td>
                <td className="py-3 text-ciruela/60">{c.skinType || "—"}</td>
                <td className="py-3 text-xs text-crepe">{c.allergies}</td>
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
      )}
    </Card>
  );
}
