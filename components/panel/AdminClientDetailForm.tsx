"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import {
  updateClientContactAction,
  updateClientSkinIdAction,
  updateClientPreferencesAction,
} from "@/lib/actions/clients";

export interface AdminClientDetailData {
  id: string;
  contact: { name: string; phone: string; email: string };
  skinId: {
    skinType: string;
    allergies: string;
    medications: string;
    pregnancyOrBreastfeeding: boolean;
    recentProcedures: string;
    visitObjective: string;
    sunExposure: string;
    notes: string;
  };
  preferences: { beverage: string; music: string; aromatherapy: string; conversation: string };
  treatmentHistory: { protocol: string; date: string; esthetician: string }[];
  consents: { type: string; version: string; acceptedAt: string; status: string }[];
  auditTrail: { user: string; action: string; timestamp: string }[];
}

// Record detail — audit trail is mandatory, not optional (spec §6.3).
// Real Client/ClientSkinId/ClientPreference rows now (Client & Clinical
// phase) — Contact, Skin ID, and Preferences write through
// lib/actions/clients.ts; Historial/Consentimientos/Auditoría are real
// append-only queries (Appointment/TreatmentRecord, Consent, AuditLog) and
// read empty today simply because no real appointments or audited actions
// exist yet, not because they're mocked.
export function AdminClientDetailForm({ data }: { data: AdminClientDetailData }) {
  const [contact, setContact] = useState(data.contact);
  const [editingContact, setEditingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState(contact);
  const [savingContact, setSavingContact] = useState(false);

  const [skinId, setSkinId] = useState(data.skinId);
  const [editingSkinId, setEditingSkinId] = useState(false);
  const [skinIdDraft, setSkinIdDraft] = useState(skinId);
  const [savingSkinId, setSavingSkinId] = useState(false);

  const [preferences, setPreferences] = useState(data.preferences);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [preferencesDraft, setPreferencesDraft] = useState(preferences);
  const [savingPreferences, setSavingPreferences] = useState(false);

  async function saveContact() {
    setSavingContact(true);
    try {
      await updateClientContactAction(data.id, contactDraft);
      setContact(contactDraft);
      setEditingContact(false);
    } finally {
      setSavingContact(false);
    }
  }

  async function saveSkinId() {
    setSavingSkinId(true);
    try {
      await updateClientSkinIdAction(data.id, skinIdDraft);
      setSkinId(skinIdDraft);
      setEditingSkinId(false);
    } finally {
      setSavingSkinId(false);
    }
  }

  async function savePreferences() {
    setSavingPreferences(true);
    try {
      await updateClientPreferencesAction(data.id, preferencesDraft);
      setPreferences(preferencesDraft);
      setEditingPreferences(false);
    } finally {
      setSavingPreferences(false);
    }
  }

  return (
    <div className="flex-1 space-y-6 px-8 py-6">
      <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-3">
        <Card
          title="Contacto"
          action={
            !editingContact && (
              <button
                onClick={() => {
                  setContactDraft(contact);
                  setEditingContact(true);
                }}
                className="font-body text-xs text-ciruela underline"
              >
                Editar
              </button>
            )
          }
        >
          {editingContact ? (
            <div className="space-y-3">
              <Field
                label="Nombre"
                value={contactDraft.name}
                onChange={(v) => setContactDraft((d) => ({ ...d, name: v }))}
              />
              <Field
                label="Teléfono"
                value={contactDraft.phone}
                onChange={(v) => setContactDraft((d) => ({ ...d, phone: v }))}
              />
              <Field
                label="Email"
                value={contactDraft.email}
                onChange={(v) => setContactDraft((d) => ({ ...d, email: v }))}
              />
              <SaveCancel onSave={saveContact} onCancel={() => setEditingContact(false)} saving={savingContact} />
            </div>
          ) : (
            <dl className="space-y-2 font-body text-sm text-ciruela">
              <Row label="Nombre" value={contact.name} />
              <Row label="Teléfono" value={contact.phone} />
              <Row label="Email" value={contact.email || "—"} />
            </dl>
          )}
        </Card>

        <Card
          title="Skin ID — clínico"
          action={
            !editingSkinId && (
              <button
                onClick={() => {
                  setSkinIdDraft(skinId);
                  setEditingSkinId(true);
                }}
                className="font-body text-xs text-ciruela underline"
              >
                Editar
              </button>
            )
          }
        >
          {editingSkinId ? (
            <div className="space-y-3">
              <Field
                label="Tipo de piel"
                value={skinIdDraft.skinType}
                onChange={(v) => setSkinIdDraft((d) => ({ ...d, skinType: v }))}
              />
              <Field
                label="Alergias"
                value={skinIdDraft.allergies}
                onChange={(v) => setSkinIdDraft((d) => ({ ...d, allergies: v }))}
                placeholder="Separadas por coma"
              />
              <Field
                label="Medicamentos"
                value={skinIdDraft.medications}
                onChange={(v) => setSkinIdDraft((d) => ({ ...d, medications: v }))}
                placeholder="Separados por coma"
              />
              <label className="flex items-center gap-2 font-body text-sm text-ciruela">
                <input
                  type="checkbox"
                  checked={skinIdDraft.pregnancyOrBreastfeeding}
                  onChange={(e) =>
                    setSkinIdDraft((d) => ({ ...d, pregnancyOrBreastfeeding: e.target.checked }))
                  }
                  className="h-4 w-4 accent-ciruela"
                />
                Embarazo o lactancia
              </label>
              <Field
                label="Procedimientos recientes"
                value={skinIdDraft.recentProcedures}
                onChange={(v) => setSkinIdDraft((d) => ({ ...d, recentProcedures: v }))}
              />
              <Field
                label="Objetivo"
                value={skinIdDraft.visitObjective}
                onChange={(v) => setSkinIdDraft((d) => ({ ...d, visitObjective: v }))}
              />
              <Field
                label="Exposición solar"
                value={skinIdDraft.sunExposure}
                onChange={(v) => setSkinIdDraft((d) => ({ ...d, sunExposure: v }))}
              />
              <TextAreaField
                label="Notas clínicas"
                value={skinIdDraft.notes}
                onChange={(v) => setSkinIdDraft((d) => ({ ...d, notes: v }))}
                placeholder="Observaciones generales del expediente…"
              />
              <SaveCancel onSave={saveSkinId} onCancel={() => setEditingSkinId(false)} saving={savingSkinId} />
            </div>
          ) : (
            <dl className="space-y-2 font-body text-sm text-ciruela">
              <Row label="Tipo de piel" value={skinId.skinType || "—"} />
              <Row label="Alergias" value={skinId.allergies || "Ninguna"} tone="text-crepe" />
              <Row label="Medicamentos" value={skinId.medications || "Ninguno"} />
              <Row label="Embarazo/lactancia" value={skinId.pregnancyOrBreastfeeding ? "Sí" : "No"} />
              <Row label="Procedimientos recientes" value={skinId.recentProcedures || "—"} />
              <Row label="Objetivo" value={skinId.visitObjective || "—"} />
              <Row label="Exposición solar" value={skinId.sunExposure || "—"} />
              {skinId.notes && (
                <div className="border-t border-ciruela/8 pt-2">
                  <dt className="mb-1 text-ciruela/50">Notas clínicas</dt>
                  <dd className="text-ciruela">{skinId.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </Card>

        <Card
          title="Preferencias"
          action={
            !editingPreferences && (
              <button
                onClick={() => {
                  setPreferencesDraft(preferences);
                  setEditingPreferences(true);
                }}
                className="font-body text-xs text-ciruela underline"
              >
                Editar
              </button>
            )
          }
        >
          {editingPreferences ? (
            <div className="space-y-3">
              <Field
                label="Bebida"
                value={preferencesDraft.beverage}
                onChange={(v) => setPreferencesDraft((d) => ({ ...d, beverage: v }))}
              />
              <Field
                label="Música"
                value={preferencesDraft.music}
                onChange={(v) => setPreferencesDraft((d) => ({ ...d, music: v }))}
              />
              <Field
                label="Aromaterapia"
                value={preferencesDraft.aromatherapy}
                onChange={(v) => setPreferencesDraft((d) => ({ ...d, aromatherapy: v }))}
              />
              <Field
                label="Conversación"
                value={preferencesDraft.conversation}
                onChange={(v) => setPreferencesDraft((d) => ({ ...d, conversation: v }))}
              />
              <SaveCancel onSave={savePreferences} onCancel={() => setEditingPreferences(false)} saving={savingPreferences} />
            </div>
          ) : (
            <dl className="space-y-2 font-body text-sm text-ciruela">
              <Row label="Bebida" value={preferences.beverage || "—"} />
              <Row label="Música" value={preferences.music || "—"} />
              <Row label="Aromaterapia" value={preferences.aromatherapy || "—"} />
              <Row label="Conversación" value={preferences.conversation || "—"} />
            </dl>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-2">
        <Card title="Historial de tratamientos">
          {data.treatmentHistory.length === 0 ? (
            <p className="py-2 font-body text-sm text-ciruela/50">Sin tratamientos registrados.</p>
          ) : (
            <ul className="divide-y divide-ciruela/8">
              {data.treatmentHistory.map((t, i) => (
                <li key={i} className="flex justify-between py-2 font-body text-sm text-ciruela">
                  <span>{t.protocol}</span>
                  <span className="text-ciruela/50">
                    {t.date} · {t.esthetician}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Consentimientos">
          {data.consents.length === 0 ? (
            <p className="py-2 font-body text-sm text-ciruela/50">Sin consentimientos registrados.</p>
          ) : (
            <ul className="divide-y divide-ciruela/8">
              {data.consents.map((con, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-body text-sm text-ciruela">{con.type}</p>
                    <p className="font-body text-xs text-ciruela/50">
                      {con.version} · aceptado {con.acceptedAt}
                    </p>
                  </div>
                  <Badge tone={con.status === "Vigente" ? "positive" : "neutral"}>{con.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Registro de auditoría — este expediente">
        {data.auditTrail.length === 0 ? (
          <p className="py-2 font-body text-sm text-ciruela/50">Sin actividad registrada todavía.</p>
        ) : (
          <ul className="divide-y divide-ciruela/8">
            {data.auditTrail.map((entry, i) => (
              <li key={i} className="flex justify-between py-2 font-body text-sm">
                <span className="text-ciruela">
                  {entry.user} — {entry.action}
                </span>
                <span className="text-ciruela/50">{entry.timestamp}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-ciruela/50">{label}</dt>
      <dd className={`text-right ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
        {label}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
        {label}
      </label>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
      />
    </div>
  );
}

function SaveCancel({
  onSave,
  onCancel,
  saving,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar"}
      </button>
      <button
        onClick={onCancel}
        className="rounded-full border border-ciruela/30 px-4 py-1.5 font-body text-xs text-ciruela/70"
      >
        Cancelar
      </button>
    </div>
  );
}
