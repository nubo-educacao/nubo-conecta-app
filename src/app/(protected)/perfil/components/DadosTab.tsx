"use client";

import { useState } from "react";
import {
  ChevronDown, Pencil, Check, X, UserPlus, User, MapPin,
  GraduationCap, DollarSign, LogOut, Phone, Hash, Home,
  GraduationCap as EnemIcon, Users, Globe,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { saveUserData, saveUserIncome, saveUserEnemScore } from "@/services/profileService";
import { useProfile } from "@/contexts/ProfileContext";
import AddDependentSheet from "@/components/profile/AddDependentSheet";
import type { PerfilData } from "../page";

// ── Constants (same as MatchOnboardingForm) ──────────────────────────────────
const EDUCATION_OPTIONS = [
  "Ensino Fundamental",
  "Ensino Médio Incompleto",
  "Ensino Médio Completo",
  "Ensino Superior Incompleto",
  "Ensino Superior Completo",
  "Pós-Gradução",
];

const STATES_BR = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const formatCurrency = (v: number | null | undefined) => {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#3092bb] transition-colors bg-white";
const inputStyle = { borderColor: "#E2E8F0", fontFamily: "Montserrat, sans-serif", color: "#3A424E" };
const labelStyle = { color: "#707A7E", fontFamily: "Montserrat, sans-serif" };

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Accordion({
  title, icon: Icon, children, defaultOpen = false,
}: {
  title: string; icon?: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-2xl border border-black/5 overflow-hidden mb-3"
      style={{ background: "rgba(255,255,255,0.85)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-5 py-4"
      >
        <span
          className="flex items-center gap-2 text-sm font-bold"
          style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}
        >
          {Icon && <Icon size={16} className="text-[#38B1E4]" />}
          {title}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: "#707A7E",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function FieldRow({
  label, value, editing, name, type = "text", children, onChange,
}: {
  label: string; value: string; editing: boolean; name: string;
  type?: string; children?: React.ReactNode;
  onChange: (name: string, val: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={labelStyle}>
        {label}
      </label>
      {editing ? (
        children ?? (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        )
      ) : (
        <p className="text-sm" style={{ color: value ? "#3A424E" : "#adb5bd", fontFamily: "Montserrat, sans-serif" }}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function EditActions({
  editing, onEdit, onSave, onCancel, saving,
}: {
  editing: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  if (!editing) {
    return (
      <button
        onClick={onEdit}
        className="flex items-center gap-1 text-xs font-semibold"
        style={{ color: "#3092bb", fontFamily: "Montserrat, sans-serif" }}
      >
        <Pencil size={12} /> Editar
      </button>
    );
  }
  return (
    <div className="flex gap-3">
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1 text-xs font-semibold"
        style={{ color: "#16a34a", fontFamily: "Montserrat, sans-serif" }}
      >
        <Check size={12} /> {saving ? "Salvando..." : "Salvar"}
      </button>
      <button
        onClick={onCancel}
        className="flex items-center gap-1 text-xs font-semibold"
        style={{ color: "#dc2626", fontFamily: "Montserrat, sans-serif" }}
      >
        <X size={12} /> Cancelar
      </button>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DadosTabProps {
  profileId: string;
  data: PerfilData | null;
  onRefresh: () => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DadosTab({ profileId, data, onRefresh }: DadosTabProps) {
  const { user, openAuthModal } = useAuth();
  const onboardingCompleted = user?.user_metadata?.onboarding_completed as boolean | undefined;
  const { profiles, refreshProfiles } = useProfile();
  const [addDependentOpen, setAddDependentOpen] = useState(false);

  // ── Dados Pessoais ─────────────────────────────────────────────────────────
  const [editingPessoais, setEditingPessoais] = useState(false);
  const [savingPessoais, setSavingPessoais] = useState(false);
  const [pessoais, setPessoais] = useState({
    full_name: String(data?.profile?.full_name ?? ""),
    birth_date: String(data?.profile?.birth_date ?? ""),
    cpf: String(data?.profile?.cpf ?? ""),
    phone: String(user?.phone ?? ""),
  });

  // ── Endereço ───────────────────────────────────────────────────────────────
  const [editingEnd, setEditingEnd] = useState(false);
  const [savingEnd, setSavingEnd] = useState(false);
  const outsideBrazil = Boolean(data?.profile?.outside_brazil);
  const [endereco, setEndereco] = useState({
    zip_code: String(data?.profile?.zip_code ?? ""),
    city: String(data?.profile?.city ?? ""),
    state: String(data?.profile?.state ?? ""),
    neighborhood: String(data?.profile?.neighborhood ?? ""),
    street: String(data?.profile?.street ?? ""),
    street_number: String(data?.profile?.street_number ?? ""),
    complement: String(data?.profile?.complement ?? ""),
    country: String(data?.profile?.country ?? "Brasil"),
  });

  // ── Escolaridade ───────────────────────────────────────────────────────────
  const [editingEsc, setEditingEsc] = useState(false);
  const [savingEsc, setSavingEsc] = useState(false);
  const [escolaridade, setEscolaridade] = useState({
    education: String(data?.profile?.education ?? ""),
    education_year: String(data?.profile?.education_year ?? ""),
  });

  // ── Renda ──────────────────────────────────────────────────────────────────
  const [editingRenda, setEditingRenda] = useState(false);
  const [savingRenda, setSavingRenda] = useState(false);
  const memberIncomesRaw: number[] = (data?.income?.member_incomes as number[]) ?? [];
  const [renda, setRenda] = useState({
    family_count: String(data?.income?.family_count ?? ""),
    per_capita_income: String(data?.income?.per_capita_income ?? ""),
    social_benefits: String(data?.income?.social_benefits ?? ""),
    alimony: String(data?.income?.alimony ?? ""),
  });
  const [memberIncomes, setMemberIncomes] = useState<string[]>(
    memberIncomesRaw.map((v) => String(v))
  );

  // ── ENEM ───────────────────────────────────────────────────────────────────
  const [editingEnem, setEditingEnem] = useState(false);
  const [savingEnem, setSavingEnem] = useState(false);
  const enemScoresRaw = (data?.enemScores ?? []) as Record<string, unknown>[];
  const latestScore = enemScoresRaw[0] as Record<string, unknown> | undefined;
  const [enem, setEnem] = useState({
    year: String(latestScore?.year ?? new Date().getFullYear()),
    nota_linguagens: String(latestScore?.nota_linguagens ?? ""),
    nota_ciencias_humanas: String(latestScore?.nota_ciencias_humanas ?? ""),
    nota_ciencias_natureza: String(latestScore?.nota_ciencias_natureza ?? ""),
    nota_matematica: String(latestScore?.nota_matematica ?? ""),
    nota_redacao: String(latestScore?.nota_redacao ?? ""),
  });

  // ── Save handlers ──────────────────────────────────────────────────────────
  async function savePessoais() {
    setSavingPessoais(true);
    try { 
      const { phone, ...profileData } = pessoais;
      await saveUserData(profileId, profileData); 
      onRefresh(); 
    }
    finally { setSavingPessoais(false); setEditingPessoais(false); }
  }

  async function saveEnd() {
    setSavingEnd(true);
    try { await saveUserData(profileId, endereco); onRefresh(); }
    finally { setSavingEnd(false); setEditingEnd(false); }
  }

  async function saveEsc() {
    setSavingEsc(true);
    try { await saveUserData(profileId, escolaridade); onRefresh(); }
    finally { setSavingEsc(false); setEditingEsc(false); }
  }

  async function saveRenda() {
    setSavingRenda(true);
    try {
      await saveUserIncome(profileId, {
        family_count: renda.family_count ? Number(renda.family_count) : null,
        social_benefits: renda.social_benefits ? Number(renda.social_benefits) : 0,
        alimony: renda.alimony ? Number(renda.alimony) : 0,
        member_incomes: memberIncomes.map((v) => parseFloat(v) || 0),
        per_capita_income: renda.per_capita_income ? Number(renda.per_capita_income) : null,
      });
      onRefresh();
    } finally { setSavingRenda(false); setEditingRenda(false); }
  }

  async function saveEnem() {
    setSavingEnem(true);
    try {
      await saveUserEnemScore(profileId, {
        year: parseInt(enem.year) || new Date().getFullYear(),
        nota_linguagens: parseFloat(enem.nota_linguagens) || null,
        nota_ciencias_humanas: parseFloat(enem.nota_ciencias_humanas) || null,
        nota_ciencias_natureza: parseFloat(enem.nota_ciencias_natureza) || null,
        nota_matematica: parseFloat(enem.nota_matematica) || null,
        nota_redacao: parseFloat(enem.nota_redacao) || null,
      });
      onRefresh();
    } finally { setSavingEnem(false); setEditingEnem(false); }
  }

  function handleFamilyCountChange(val: string) {
    setRenda((r) => ({ ...r, family_count: val }));
    const count = parseInt(val);
    if (!isNaN(count) && count > 0) {
      setMemberIncomes((prev) => {
        const arr = [...prev];
        while (arr.length < count) arr.push("");
        return arr.slice(0, count);
      });
    } else {
      setMemberIncomes([]);
    }
  }

  const dependentes = profiles.filter((p) => p.isdependent);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Dados Pessoais ── */}
      <Accordion title="Dados Pessoais" icon={User} defaultOpen>
        <div className="flex justify-end mb-3">
          <EditActions
            editing={editingPessoais}
            onEdit={() => setEditingPessoais(true)}
            onSave={savePessoais}
            onCancel={() => setEditingPessoais(false)}
            saving={savingPessoais}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FieldRow label="Nome completo" value={pessoais.full_name} editing={editingPessoais} name="full_name" onChange={(n, v) => setPessoais((p) => ({ ...p, [n]: v }))} />
          
          <FieldRow label="Data de nascimento" value={editingPessoais ? pessoais.birth_date : formatDateBR(pessoais.birth_date)} editing={editingPessoais} name="birth_date" type="date" onChange={(n, v) => setPessoais((p) => ({ ...p, [n]: v }))} />
          
          <FieldRow label="CPF" value={pessoais.cpf} editing={editingPessoais} name="cpf" onChange={(n, v) => setPessoais((p) => ({ ...p, [n]: v }))} />
          
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={labelStyle}>
              Telefone
            </label>
            {editingPessoais ? (
              <div className="flex gap-2 items-center">
                <p className="text-sm flex-1 p-2 rounded-xl border bg-gray-50" style={inputStyle}>
                  {pessoais.phone || "—"}
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('UPDATE_PHONE')}
                  className="px-3 py-2 bg-[#3092bb] text-white text-xs font-bold rounded-xl"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Alterar
                </button>
              </div>
            ) : (
              <p className="text-sm" style={{ color: pessoais.phone ? "#3A424E" : "#adb5bd", fontFamily: "Montserrat, sans-serif" }}>
                {pessoais.phone || "—"}
              </p>
            )}
          </div>
        </div>
      </Accordion>

      {/* ── Endereço ── */}
      <Accordion title="Endereço" icon={MapPin}>
        <div className="flex justify-end mb-3">
          <EditActions
            editing={editingEnd}
            onEdit={() => setEditingEnd(true)}
            onSave={saveEnd}
            onCancel={() => setEditingEnd(false)}
            saving={savingEnd}
          />
        </div>
        {!outsideBrazil ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4">
            <div className="col-span-1">
              <FieldRow label="CEP" value={endereco.zip_code} editing={editingEnd} name="zip_code" onChange={(n, v) => setEndereco((e) => ({ ...e, [n]: v }))} />
            </div>
            <div className="col-span-1">
              <FieldRow label="UF" value={endereco.state} editing={editingEnd} name="state" onChange={(n, v) => setEndereco((e) => ({ ...e, [n]: v }))}>
                {editingEnd && (
                  <select
                    value={endereco.state}
                    onChange={(e) => setEndereco((p) => ({ ...p, state: e.target.value }))}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="">UF</option>
                    {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </FieldRow>
            </div>
            <div className="col-span-2">
              <FieldRow label="Cidade" value={endereco.city} editing={editingEnd} name="city" onChange={(n, v) => setEndereco((e) => ({ ...e, [n]: v }))} />
            </div>
            <div className="col-span-2">
              <FieldRow label="Bairro" value={endereco.neighborhood} editing={editingEnd} name="neighborhood" onChange={(n, v) => setEndereco((e) => ({ ...e, [n]: v }))} />
            </div>
            <div className="col-span-2">
              <FieldRow label="Rua" value={endereco.street} editing={editingEnd} name="street" onChange={(n, v) => setEndereco((e) => ({ ...e, [n]: v }))} />
            </div>
            <div className="col-span-1">
              <FieldRow label="Número" value={endereco.street_number} editing={editingEnd} name="street_number" onChange={(n, v) => setEndereco((e) => ({ ...e, [n]: v }))} />
            </div>
            <div className="col-span-1">
              <FieldRow label="Complemento" value={endereco.complement} editing={editingEnd} name="complement" onChange={(n, v) => setEndereco((e) => ({ ...e, [n]: v }))} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <FieldRow label="País" value={endereco.country} editing={editingEnd} name="country" onChange={(n, v) => setEndereco((e) => ({ ...e, [n]: v }))} />
            <FieldRow label="Cidade" value={endereco.city} editing={editingEnd} name="city" onChange={(n, v) => setEndereco((e) => ({ ...e, [n]: v }))} />
          </div>
        )}
      </Accordion>

      {/* ── Escolaridade ── */}
      <Accordion title="Escolaridade" icon={GraduationCap}>
        <div className="flex justify-end mb-3">
          <EditActions
            editing={editingEsc}
            onEdit={() => setEditingEsc(true)}
            onSave={saveEsc}
            onCancel={() => setEditingEsc(false)}
            saving={savingEsc}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FieldRow label="Nível de ensino" value={escolaridade.education} editing={editingEsc} name="education" onChange={(n, v) => setEscolaridade((p) => ({ ...p, [n]: v }))}>
            {editingEsc && (
              <select
                value={escolaridade.education}
                onChange={(e) => setEscolaridade((p) => ({ ...p, education: e.target.value }))}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">Selecione...</option>
                {EDUCATION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </FieldRow>
          <FieldRow label="Ano escolar" value={escolaridade.education_year} editing={editingEsc} name="education_year" onChange={(n, v) => setEscolaridade((p) => ({ ...p, [n]: v }))} />
        </div>
      </Accordion>

      {/* ── Desempenho ENEM ── */}
      <Accordion title="Desempenho no ENEM" icon={EnemIcon}>
        <div className="flex justify-end mb-3">
          <EditActions
            editing={editingEnem}
            onEdit={() => setEditingEnem(true)}
            onSave={saveEnem}
            onCancel={() => setEditingEnem(false)}
            saving={savingEnem}
          />
        </div>
        {editingEnem && (
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={labelStyle}>Ano</label>
            <div className="flex gap-2">
              {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setEnem((e) => ({ ...e, year: String(y) }))}
                  className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
                  style={{
                    background: enem.year === String(y) ? "#38B1E4" : "white",
                    color: enem.year === String(y) ? "white" : "#636E7C",
                    borderColor: enem.year === String(y) ? "#38B1E4" : "#E2E8F0",
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Linguagens", field: "nota_linguagens" },
            { label: "Humanas", field: "nota_ciencias_humanas" },
            { label: "Natureza", field: "nota_ciencias_natureza" },
            { label: "Matemática", field: "nota_matematica" },
            { label: "Redação", field: "nota_redacao" },
          ].map((f) => (
            <div key={f.field}>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={labelStyle}>{f.label}</label>
              {editingEnem ? (
                <input
                  type="number"
                  value={enem[f.field as keyof typeof enem]}
                  onChange={(e) => setEnem((p) => ({ ...p, [f.field]: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="0.0"
                />
              ) : (
                <p className="text-sm font-semibold" style={{ color: enem[f.field as keyof typeof enem] ? "#3A424E" : "#adb5bd", fontFamily: "Montserrat, sans-serif" }}>
                  {enem[f.field as keyof typeof enem] || "—"}
                </p>
              )}
            </div>
          ))}
        </div>
        {!editingEnem && (
          <p className="text-xs mt-2" style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}>
            Ano de referência: <strong>{enem.year}</strong>
          </p>
        )}
      </Accordion>

      {/* ── Renda Familiar ── */}
      <Accordion title="Renda Familiar" icon={DollarSign}>
        <div className="flex justify-end mb-3">
          <EditActions
            editing={editingRenda}
            onEdit={() => setEditingRenda(true)}
            onSave={saveRenda}
            onCancel={() => setEditingRenda(false)}
            saving={savingRenda}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FieldRow
            label="Membros da família"
            value={renda.family_count}
            editing={editingRenda}
            name="family_count"
            type="number"
            onChange={(n, v) => { handleFamilyCountChange(v); }}
          />
          <FieldRow
            label="Benefícios sociais (R$)"
            value={renda.social_benefits}
            editing={editingRenda}
            name="social_benefits"
            type="number"
            onChange={(n, v) => setRenda((r) => ({ ...r, [n]: v }))}
          />
          <FieldRow
            label="Pensão alimentícia (R$)"
            value={renda.alimony}
            editing={editingRenda}
            name="alimony"
            type="number"
            onChange={(n, v) => setRenda((r) => ({ ...r, [n]: v }))}
          />
        </div>

        {/* Rendas individuais */}
        {memberIncomes.length > 0 && (
          <div className="mt-2">
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={labelStyle}>Rendas Individuais</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {memberIncomes.map((inc, i) => (
                <div key={i}>
                  <label className="block text-xs mb-1" style={labelStyle}>Pessoa {i + 1}</label>
                  {editingRenda ? (
                    <input
                      type="number"
                      value={inc}
                      onChange={(e) => {
                        const arr = [...memberIncomes];
                        arr[i] = e.target.value;
                        setMemberIncomes(arr);
                      }}
                      className={inputCls}
                      style={inputStyle}
                      placeholder="R$ 0,00"
                    />
                  ) : (
                    <p className="text-sm" style={{ color: inc ? "#3A424E" : "#adb5bd", fontFamily: "Montserrat, sans-serif" }}>
                      {inc ? formatCurrency(parseFloat(inc)) : "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Renda per capita calculada */}
        {data?.income?.per_capita_income != null && (
          <div
            className="mt-4 flex items-center justify-between p-4 rounded-2xl text-white"
            style={{ background: "linear-gradient(135deg, #024F86 0%, #38B1E4 100%)" }}
          >
            <div>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Renda Per Capita</p>
              <p className="text-lg font-black">{formatCurrency(data.income.per_capita_income as number)}</p>
            </div>
            <Check size={20} className="opacity-40" />
          </div>
        )}
      </Accordion>

      {/* ── Actions ── */}
      <div className="mt-8 space-y-3">
        {onboardingCompleted && (
          <button
            onClick={() => setAddDependentOpen(true)}
            className="flex items-center gap-2 w-full justify-center py-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm text-sm font-bold transition-all hover:border-[#38B1E4] hover:text-[#38B1E4]"
            style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}
          >
            <UserPlus size={18} className="text-[#38B1E4]" />
            Adicionar Dependente
          </button>
        )}

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="flex items-center gap-2 w-full justify-center py-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm text-sm font-bold transition-all hover:border-red-500 hover:text-red-500"
          style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>

      <AddDependentSheet
        open={addDependentOpen}
        onClose={() => { setAddDependentOpen(false); refreshProfiles(); }}
      />
    </div>
  );
}
