"use client";

import { use, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { OWNER, CLIENT_DETAIL } from "@/lib/mock-data";

// Record detail — audit trail is mandatory, not optional (spec §6.3).
// This mock always renders the one seeded client regardless of :id.
// Contact, Skin ID, and Preferences are all editable here (Owner/staff
// entering clinical data is exactly what spec §5.1 describes); Historial
// and Consentimientos stay read-only since they're append-only records, not
// settings — "editing" them would mean creating a new entry elsewhere
// (Treatment Record, Consent Center), not rewriting history here.
export default function AdminClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  use(params);
  const c = CLIENT_DETAIL;

  const [contact, setContact] = useState({
    phone: c.phone,
    email: c.email,
    location: c.location,
  });
  const [editingContact, setEditingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState(contact);

  const [skinId, setSkinId] = useState({
    skinType: c.skinId.skinType,
    allergies: c.skinId.allergies.join(", "),
    medications: c.skinId.medications.join(", "),
    pregnancyOrBreastfeeding: c.skinId.pregnancyOrBreastfeeding,
    recentProcedures: c.skinId.recentProcedures,
    visitObjective: c.skinId.visitObjective,
    sunExposure: c.skinId.sunExposure,
    notes: "",
  });
  const [editingSkinId, setEditingSkinId] = useState(false);
  const [skinIdDraft, setSkinIdDraft] = useState(skinId);

  const [preferences, setPreferences] = useState({
    preferredEsthetician: c.preferences.preferredEsthetician,
    beverage: c.preferences.beverage,
    music: c.preferences.music,
    aromatherapy: c.preferences.aromatherapy,
    conversation: c.preferences.conversation,
  });
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [preferencesDraft, setPreferencesDraft] = useState(preferences);

  return (
    <>
      <TopBar title={c.name} userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
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
                  label="Teléfono"
                  value={contactDraft.phone}
                  onChange={(v) => setContactDraft((d) => ({ ...d, phone: v }))}
                />
                <Field
                  label="Email"
                  value={contactDraft.email}
                  onChange={(v) => setContactDraft((d) => ({ ...d, email: v }))}
                />
                <Field
                  label="Ubicación"
                  value={contactDraft.location}
                  onChange={(v) => setContactDraft((d) => ({ ...d, location: v }))}
                />
                <SaveCancel
                  onSave={() => {
                    setContact(contactDraft);
                    setEditingContact(false);
                  }}
                  onCancel={() => setEditingContact(false)}
                />
              </div>
            ) : (
              <dl className="space-y-2 font-body text-sm text-ciruela">
                <Row label="Teléfono" value={contact.phone} />
                <Row label="Email" value={contact.email} />
                <Row label="Ubicación" value={contact.location} />
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
                <SaveCancel
                  onSave={() => {
                    setSkinId(skinIdDraft);
                    setEditingSkinId(false);
                  }}
                  onCancel={() => setEditingSkinId(false)}
                />
              </div>
            ) : (
              <dl className="space-y-2 font-body text-sm text-ciruela">
                <Row label="Tipo de piel" value={skinId.skinType} />
                <Row label="Alergias" value={skinId.allergies || "Ninguna"} tone="text-crepe" />
                <Row label="Medicamentos" value={skinId.medications || "Ninguno"} />
                <Row
                  label="Embarazo/lactancia"
                  value={skinId.pregnancyOrBreastfeeding ? "Sí" : "No"}
                />
                <Row label="Procedimientos recientes" value={skinId.recentProcedures} />
                <Row label="Objetivo" value={skinId.visitObjective} />
                <Row label="Exposición solar" value={skinId.sunExposure} />
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
                  label="Esteticista"
                  value={preferencesDraft.preferredEsthetician}
                  onChange={(v) => setPreferencesDraft((d) => ({ ...d, preferredEsthetician: v }))}
                />
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
                <SaveCancel
                  onSave={() => {
                    setPreferences(preferencesDraft);
                    setEditingPreferences(false);
                  }}
                  onCancel={() => setEditingPreferences(false)}
                />
              </div>
            ) : (
              <dl className="space-y-2 font-body text-sm text-ciruela">
                <Row label="Esteticista" value={preferences.preferredEsthetician} />
                <Row label="Bebida" value={preferences.beverage} />
                <Row label="Música" value={preferences.music} />
                <Row label="Aromaterapia" value={preferences.aromatherapy} />
                <Row label="Conversación" value={preferences.conversation} />
              </dl>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-2">
          <Card title="Historial de tratamientos">
            <ul className="divide-y divide-ciruela/8">
              {c.treatmentHistory.map((t, i) => (
                <li key={i} className="flex justify-between py-2 font-body text-sm text-ciruela">
                  <span>{t.protocol}</span>
                  <span className="text-ciruela/50">
                    {t.date} · {t.esthetician}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Consentimientos">
            <ul className="divide-y divide-ciruela/8">
              {c.consents.map((con) => (
                <li key={con.type} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-body text-sm text-ciruela">{con.type}</p>
                    <p className="font-body text-xs text-ciruela/50">
                      {con.version} · aceptado {con.acceptedAt}
                    </p>
                  </div>
                  <Badge tone="positive">{con.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="Registro de auditoría — este expediente">
          <ul className="divide-y divide-ciruela/8">
            {c.auditTrail.map((entry, i) => (
              <li key={i} className="flex justify-between py-2 font-body text-sm">
                <span className="text-ciruela">
                  {entry.user} — {entry.action}
                </span>
                <span className="text-ciruela/50">{entry.timestamp}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
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

function SaveCancel({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onSave}
        className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso"
      >
        Guardar
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
