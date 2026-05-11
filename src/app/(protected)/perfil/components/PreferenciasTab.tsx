"use client";

import { useState } from "react";
import { saveUserPreferences, saveUserEnemScore } from "@/services/profileService";
import type { PerfilData } from "../page";

interface PreferenciasTabProps {
  userId: string;
  data: PerfilData | null;
  onRefresh: () => void;
}

const SHIFTS = ["Manhã", "Tarde", "Noite", "Integral"];
const PROGRAMS = [
  { value: "sisu", label: "SISU" },
  { value: "prouni", label: "ProUni" },
  { value: "indiferente", label: "Indiferente" },
];
const UNIVERSITY_TYPES = [
  { value: "publica", label: "Pública" },
  { value: "privada", label: "Privada" },
  { value: "indiferente", label: "Indiferente" },
];
const COURSE_AREAS = [
  "Exatas", "Humanas", "Saúde", "Tecnologia", "Artes", "Direito", "Negócios", "Educação"
];
const QUOTA_OPTIONS = [
  "Escola pública", "Renda familiar", "PPI (preto, pardo, indígena)", "Deficiência (PcD)"
];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
      style={{
        fontFamily: "Montserrat, sans-serif",
        background: active ? "#3092bb" : "transparent",
        color: active ? "white" : "#707A7E",
        borderColor: active ? "#3092bb" : "#E2E8F0",
      }}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InputNum({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold mb-1" style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#3092bb] transition-colors"
        style={{ borderColor: "#E2E8F0", fontFamily: "Montserrat, sans-serif", color: "#3A424E" }}
      />
    </div>
  );
}

export default function PreferenciasTab({ userId, data, onRefresh }: PreferenciasTabProps) {
  const prefs = data?.preferences as Record<string, unknown> | null;
  const enemScores = (data?.enemScores ?? []) as Record<string, unknown>[];
  const latestEnem = enemScores[0] ?? {};

  const [enem, setEnem] = useState({
    enem_score: String(prefs?.enem_score ?? ""),
    nota_linguagens: String(latestEnem?.nota_linguagens ?? ""),
    nota_ciencias_humanas: String(latestEnem?.nota_ciencias_humanas ?? ""),
    nota_ciencias_natureza: String(latestEnem?.nota_ciencias_natureza ?? ""),
    nota_matematica: String(latestEnem?.nota_matematica ?? ""),
    nota_redacao: String(latestEnem?.nota_redacao ?? ""),
  });

  const [courseInterest, setCourseInterest] = useState<string[]>((prefs?.course_interest as string[]) ?? []);
  const [quotaTypes, setQuotaTypes] = useState<string[]>((prefs?.quota_types as string[]) ?? []);
  const [preferredShifts, setPreferredShifts] = useState<string[]>((prefs?.preferred_shifts as string[]) ?? []);
  const [programPref, setProgramPref] = useState<string>(String(prefs?.program_preference ?? "indiferente"));
  const [univPref, setUnivPref] = useState<string>(String(prefs?.university_preference ?? "indiferente"));
  const [locationPref, setLocationPref] = useState(String(prefs?.location_preference ?? ""));
  const [statePref, setStatePref] = useState(String(prefs?.state_preference ?? ""));

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function toggleArr(arr: string[], val: string, setter: (a: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        saveUserPreferences(userId, {
          enem_score: enem.enem_score ? Number(enem.enem_score) : null,
          course_interest: courseInterest,
          quota_types: quotaTypes,
          preferred_shifts: preferredShifts,
          program_preference: programPref,
          university_preference: univPref,
          location_preference: locationPref || null,
          state_preference: statePref || null,
        }),
        saveUserEnemScore(userId, {
          nota_linguagens: enem.nota_linguagens ? Number(enem.nota_linguagens) : null,
          nota_ciencias_humanas: enem.nota_ciencias_humanas ? Number(enem.nota_ciencias_humanas) : null,
          nota_ciencias_natureza: enem.nota_ciencias_natureza ? Number(enem.nota_ciencias_natureza) : null,
          nota_matematica: enem.nota_matematica ? Number(enem.nota_matematica) : null,
          nota_redacao: enem.nota_redacao ? Number(enem.nota_redacao) : null,
        }),
      ]);
      setToast("Preferências salvas!");
      onRefresh();
    } catch {
      setToast("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <div>
      <div
        className="rounded-2xl p-5 mb-4"
        style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.05)" }}
      >
        {/* ENEM */}
        <Section title="Vestibular — ENEM">
          <InputNum label="Nota geral" value={enem.enem_score} onChange={(v) => setEnem((e) => ({ ...e, enem_score: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <InputNum label="Linguagens" value={enem.nota_linguagens} onChange={(v) => setEnem((e) => ({ ...e, nota_linguagens: v }))} />
            <InputNum label="Humanas" value={enem.nota_ciencias_humanas} onChange={(v) => setEnem((e) => ({ ...e, nota_ciencias_humanas: v }))} />
            <InputNum label="Natureza" value={enem.nota_ciencias_natureza} onChange={(v) => setEnem((e) => ({ ...e, nota_ciencias_natureza: v }))} />
            <InputNum label="Matemática" value={enem.nota_matematica} onChange={(v) => setEnem((e) => ({ ...e, nota_matematica: v }))} />
            <InputNum label="Redação" value={enem.nota_redacao} onChange={(v) => setEnem((e) => ({ ...e, nota_redacao: v }))} />
          </div>
        </Section>

        {/* Interesse de curso */}
        <Section title="Interesse de Curso">
          <div className="flex flex-wrap gap-2">
            {COURSE_AREAS.map((area) => (
              <Chip key={area} label={area} active={courseInterest.includes(area)} onClick={() => toggleArr(courseInterest, area, setCourseInterest)} />
            ))}
          </div>
        </Section>

        {/* Cotas */}
        <Section title="Cotas">
          <div className="flex flex-wrap gap-2">
            {QUOTA_OPTIONS.map((q) => (
              <Chip key={q} label={q} active={quotaTypes.includes(q)} onClick={() => toggleArr(quotaTypes, q, setQuotaTypes)} />
            ))}
          </div>
        </Section>

        {/* Turno */}
        <Section title="Turno Preferido">
          <div className="flex flex-wrap gap-2">
            {SHIFTS.map((s) => (
              <Chip key={s} label={s} active={preferredShifts.includes(s)} onClick={() => toggleArr(preferredShifts, s, setPreferredShifts)} />
            ))}
          </div>
        </Section>

        {/* Programa */}
        <Section title="Programa">
          <div className="flex gap-2 flex-wrap">
            {PROGRAMS.map((p) => (
              <Chip key={p.value} label={p.label} active={programPref === p.value} onClick={() => setProgramPref(p.value)} />
            ))}
          </div>
        </Section>

        {/* Tipo de Instituição */}
        <Section title="Tipo de Instituição">
          <div className="flex gap-2 flex-wrap">
            {UNIVERSITY_TYPES.map((u) => (
              <Chip key={u.value} label={u.label} active={univPref === u.value} onClick={() => setUnivPref(u.value)} />
            ))}
          </div>
        </Section>

        {/* Localização */}
        <Section title="Localização">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}>
                Preferência de local
              </label>
              <input
                type="text"
                value={locationPref}
                onChange={(e) => setLocationPref(e.target.value)}
                placeholder="Ex: Capital, Interior..."
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#3092bb] transition-colors"
                style={{ borderColor: "#E2E8F0", fontFamily: "Montserrat, sans-serif", color: "#3A424E" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}>
                Estado
              </label>
              <input
                type="text"
                value={statePref}
                onChange={(e) => setStatePref(e.target.value)}
                placeholder="Ex: SP, RJ..."
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#3092bb] transition-colors"
                style={{ borderColor: "#E2E8F0", fontFamily: "Montserrat, sans-serif", color: "#3A424E" }}
              />
            </div>
          </div>
        </Section>

        {toast && (
          <p
            className="text-xs font-medium rounded-xl px-3 py-2 mb-3"
            style={{
              background: toast.includes("Erro") ? "rgba(220,38,38,0.1)" : "rgba(22,163,74,0.1)",
              color: toast.includes("Erro") ? "#dc2626" : "#16a34a",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {toast}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)",
            color: "#fff",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          {saving ? "Salvando..." : "Salvar Preferências"}
        </button>
      </div>
    </div>
  );
}
