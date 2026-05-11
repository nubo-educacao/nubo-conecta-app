"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Check, X, UserPlus } from "lucide-react";
import { saveUserData, saveUserIncome } from "@/services/profileService";
import { useProfile } from "@/contexts/ProfileContext";
import AddDependentSheet from "@/components/profile/AddDependentSheet";
import type { PerfilData } from "../page";

interface DadosTabProps {
  profileId: string;
  data: PerfilData | null;
  onRefresh: () => void;
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-black/5 overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.8)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-5 py-4"
      >
        <span className="text-sm font-bold" style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}>
          {title}
        </span>
        <ChevronDown
          size={16}
          style={{ color: "#707A7E", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function Field({ label, value, editing, name, onChange }: {
  label: string;
  value: string;
  editing: boolean;
  name: string;
  onChange: (name: string, val: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold mb-1" style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}>
        {label}
      </label>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#3092bb] transition-colors"
          style={{ borderColor: "#E2E8F0", fontFamily: "Montserrat, sans-serif", color: "#3A424E" }}
        />
      ) : (
        <p className="text-sm" style={{ color: value ? "#3A424E" : "#adb5bd", fontFamily: "Montserrat, sans-serif" }}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}

export default function DadosTab({ profileId, data, onRefresh }: DadosTabProps) {
  const { profiles, refreshProfiles } = useProfile();
  const [addDependentOpen, setAddDependentOpen] = useState(false);

  // Pessoais
  const [editingPessoais, setEditingPessoais] = useState(false);
  const [pessoais, setPessoais] = useState({
    full_name: String(data?.profile?.full_name ?? ""),
    birth_date: String(data?.profile?.birth_date ?? ""),
  });
  const [savingPessoais, setSavingPessoais] = useState(false);

  // Endereço
  const [editingEnd, setEditingEnd] = useState(false);
  const [endereco, setEndereco] = useState({
    zip_code: String(data?.profile?.zip_code ?? ""),
    city: String(data?.profile?.city ?? ""),
    state: String(data?.profile?.state ?? ""),
    street: String(data?.profile?.street ?? ""),
    neighborhood: String(data?.profile?.neighborhood ?? ""),
  });
  const [savingEnd, setSavingEnd] = useState(false);

  // Escolaridade
  const [editingEsc, setEditingEsc] = useState(false);
  const [escolaridade, setEscolaridade] = useState({
    education: String(data?.profile?.education ?? ""),
    education_year: String(data?.profile?.education_year ?? ""),
  });
  const [savingEsc, setSavingEsc] = useState(false);

  // Renda
  const [editingRenda, setEditingRenda] = useState(false);
  const [renda, setRenda] = useState({
    family_count: String(data?.income?.family_count ?? ""),
    per_capita_income: String(data?.income?.per_capita_income ?? ""),
  });
  const [savingRenda, setSavingRenda] = useState(false);

  function editButton(editing: boolean, onEdit: () => void, onSave: () => void, onCancel: () => void, saving: boolean) {
    if (!editing) {
      return (
        <button onClick={onEdit} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#3092bb", fontFamily: "Montserrat, sans-serif" }}>
          <Pencil size={12} /> Editar
        </button>
      );
    }
    return (
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#16a34a", fontFamily: "Montserrat, sans-serif" }}>
          <Check size={12} /> {saving ? "Salvando..." : "Salvar"}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#dc2626", fontFamily: "Montserrat, sans-serif" }}>
          <X size={12} /> Cancelar
        </button>
      </div>
    );
  }

  async function savePessoais() {
    setSavingPessoais(true);
    try { await saveUserData(profileId, pessoais); onRefresh(); } finally { setSavingPessoais(false); setEditingPessoais(false); }
  }
  async function saveEnd() {
    setSavingEnd(true);
    try { await saveUserData(profileId, endereco); onRefresh(); } finally { setSavingEnd(false); setEditingEnd(false); }
  }
  async function saveEsc() {
    setSavingEsc(true);
    try { await saveUserData(profileId, escolaridade); onRefresh(); } finally { setSavingEsc(false); setEditingEsc(false); }
  }
  async function saveRenda() {
    setSavingRenda(true);
    try {
      await saveUserIncome(profileId, {
        family_count: renda.family_count ? Number(renda.family_count) : null,
        per_capita_income: renda.per_capita_income ? Number(renda.per_capita_income) : null,
      });
      onRefresh();
    } finally { setSavingRenda(false); setEditingRenda(false); }
  }

  const dependentes = profiles.filter((p) => p.isdependent);

  function handleChangePessoais(name: string, val: string) { setPessoais((p) => ({ ...p, [name]: val })); }
  function handleChangeEnd(name: string, val: string) { setEndereco((p) => ({ ...p, [name]: val })); }
  function handleChangeEsc(name: string, val: string) { setEscolaridade((p) => ({ ...p, [name]: val })); }
  function handleChangeRenda(name: string, val: string) { setRenda((p) => ({ ...p, [name]: val })); }

  return (
    <div>
      {/* Dados Pessoais */}
      <Accordion title="Dados Pessoais" defaultOpen>
        <div className="flex justify-end mb-3">
          {editButton(editingPessoais, () => setEditingPessoais(true), savePessoais, () => setEditingPessoais(false), savingPessoais)}
        </div>
        <Field label="Nome completo" value={pessoais.full_name} editing={editingPessoais} name="full_name" onChange={handleChangePessoais} />
        <Field label="Data de nascimento" value={pessoais.birth_date} editing={editingPessoais} name="birth_date" onChange={handleChangePessoais} />
      </Accordion>

      {/* Endereço */}
      <Accordion title="Endereço">
        <div className="flex justify-end mb-3">
          {editButton(editingEnd, () => setEditingEnd(true), saveEnd, () => setEditingEnd(false), savingEnd)}
        </div>
        <Field label="CEP" value={endereco.zip_code} editing={editingEnd} name="zip_code" onChange={handleChangeEnd} />
        <Field label="Cidade" value={endereco.city} editing={editingEnd} name="city" onChange={handleChangeEnd} />
        <Field label="Estado" value={endereco.state} editing={editingEnd} name="state" onChange={handleChangeEnd} />
        <Field label="Rua" value={endereco.street} editing={editingEnd} name="street" onChange={handleChangeEnd} />
        <Field label="Bairro" value={endereco.neighborhood} editing={editingEnd} name="neighborhood" onChange={handleChangeEnd} />
      </Accordion>

      {/* Escolaridade */}
      <Accordion title="Escolaridade">
        <div className="flex justify-end mb-3">
          {editButton(editingEsc, () => setEditingEsc(true), saveEsc, () => setEditingEsc(false), savingEsc)}
        </div>
        <Field label="Nível de ensino" value={escolaridade.education} editing={editingEsc} name="education" onChange={handleChangeEsc} />
        <Field label="Ano escolar" value={escolaridade.education_year} editing={editingEsc} name="education_year" onChange={handleChangeEsc} />
      </Accordion>

      {/* Renda */}
      <Accordion title="Renda Familiar">
        <div className="flex justify-end mb-3">
          {editButton(editingRenda, () => setEditingRenda(true), saveRenda, () => setEditingRenda(false), savingRenda)}
        </div>
        <Field label="Membros da família" value={renda.family_count} editing={editingRenda} name="family_count" onChange={handleChangeRenda} />
        <Field label="Renda per capita (R$)" value={renda.per_capita_income} editing={editingRenda} name="per_capita_income" onChange={handleChangeRenda} />
      </Accordion>

      {/* Dependentes */}
      <Accordion title="Dependentes">
        {dependentes.length === 0 ? (
          <p className="text-sm text-center py-2" style={{ color: "#adb5bd", fontFamily: "Montserrat, sans-serif" }}>
            Nenhum dependente cadastrado.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {dependentes.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(48,146,187,0.06)" }}
              >
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)" }}
                >
                  {(d.full_name ?? "D").charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium" style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}>
                  {d.full_name ?? "Dependente"}
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => setAddDependentOpen(true)}
          className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors hover:bg-[rgba(48,146,187,0.05)]"
          style={{ borderColor: "#3092bb", color: "#3092bb", fontFamily: "Montserrat, sans-serif" }}
        >
          <UserPlus size={15} />
          Adicionar Dependente
        </button>
      </Accordion>

      <AddDependentSheet
        open={addDependentOpen}
        onClose={() => { setAddDependentOpen(false); refreshProfiles(); }}
      />
    </div>
  );
}
