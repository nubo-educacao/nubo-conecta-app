"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Check, X, Search, Loader2 } from "lucide-react";
import { saveUserPreferences, saveUserEnemScore } from "@/services/profileService";
import { supabase } from "@/lib/supabase";
import type { PerfilData } from "../page";

interface PreferenciasTabProps {
  userId: string;
  data: PerfilData | null;
  onRefresh: () => void;
}

const SHIFTS_OPTIONS = ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'EAD'];

const PROGRAMS = [
  { value: "sisu", label: "SISU" },
  { value: "prouni", label: "ProUni" },
  { value: "programa de bolsa", label: "Programa de Bolsa" },
  { value: "indiferente", label: "Indiferente" },
];

const UNIVERSITY_TYPES = [
  { value: "publica", label: "Pública" },
  { value: "privada", label: "Privada" },
  { value: "indiferente", label: "Indiferente" },
];

const QUOTA_OPTIONS = [
  // Percurso escolar
  { id: 'ESCOLA_PUBLICA',              label: 'Escola Pública',                    description: 'Cursou integralmente o ensino médio em escola pública.' },
  { id: 'EJA_ENCCEJA',                 label: 'EJA / ENCCEJA',                     description: 'Concluiu o ensino médio via EJA, supletivo ou ENCCEJA.' },
  { id: 'EFA',                         label: 'Escola Família Agrícola (EFA)',      description: 'Egresso de Escola Família Agrícola.' },
  { id: 'RURAL',                       label: 'Educação do Campo / Rural',          description: 'Cursou em escola comunitária do campo conveniada com o poder público.' },
  // Raça / Etnia
  { id: 'PPI',                         label: 'PPI — Preto, Pardo ou Indígena',    description: 'Autodeclarado preto, pardo ou indígena (L1/L2 SISU).' },
  { id: 'PRETOS E PARDOS',             label: 'Preto ou Pardo',                    description: 'Autodeclarado preto ou pardo.' },
  { id: 'INDIGENAS',                   label: 'Indígena',                           description: 'Pertencente a povo indígena.' },
  { id: 'QUILOMBOLAS',                 label: 'Quilombola',                         description: 'Pertencente a comunidade quilombola.' },
  { id: 'CIGANOS',                     label: 'Cigano',                             description: 'Pertencente a comunidade cigana.' },
  { id: 'TRADICIONAIS',                label: 'Povos e Comunidades Tradicionais',   description: 'Membro de povos ou comunidades tradicionais.' },
  { id: 'AGRICULTURA_FAMILIAR',        label: 'Agricultura Familiar',              description: 'Oriundo de família de agricultura familiar.' },
  // Deficiência
  { id: 'PCD',                         label: 'Pessoa com Deficiência (PcD)',       description: 'Possui deficiência reconhecida em lei.' },
  { id: 'PCD_AUDITIVA',                label: 'PcD — Deficiência Auditiva',        description: 'Possui deficiência auditiva (específico para Letras-Libras).' },
  { id: 'ALTAS_HABILIDADES',           label: 'Altas Habilidades / Superdotação',  description: 'Reconhecido com altas habilidades ou superdotação.' },
  { id: 'AUTISMO',                     label: 'Autismo (TEA)',                      description: 'Diagnóstico de Transtorno do Espectro Autista.' },
  // Identidade de gênero
  { id: 'TRANS',                       label: 'Trans / Travesti / Transgênero',     description: 'Pessoa trans, travesti ou transgênero.' },
  // Situação especial
  { id: 'MILITAR',                     label: 'Filho(a) de Militar/Policial morto ou incapacitado', description: 'Filho(a) de policial civil, militar, bombeiro ou inspector penitenciário morto ou incapacitado em serviço.' },
  { id: 'PROFESSOR',                   label: 'Professor de Escola Pública',        description: 'Docente atuante ou egresso da rede pública de ensino.' },
  { id: 'NAO_GRADUACAO',               label: 'Sem diploma de graduação',           description: 'Não possui diploma de curso de graduação.' },
  { id: 'PRIVACAO_LIBERDADE',          label: 'Em situação de privação de liberdade / egresso do sistema prisional', description: 'Em privação de liberdade ou egresso do sistema prisional.' },
  { id: 'REFUGIADOS',                  label: 'Refugiado / Migrante',               description: 'Pessoa em situação de refúgio ou migração forçada.' },
  { id: 'MIGRANTES',                   label: 'Migrante',                           description: 'Migrante interno ou internacional.' },
  { id: 'EGRESSOS',                    label: 'Egresso de escola pública (rede estadual/municipal)', description: 'Egresso de escola pública vinculada à Secretaria de Educação estadual ou municipal.' },
  { id: 'ESCOLA_PRIVADA_BOLSA_INTEGRAL', label: 'Escola Privada com Bolsa Integral', description: 'Cursou o ensino médio com bolsa integral em escola privada.' },
];

function Chip({ label, active, onClick, showX, interactive = true }: { label: string; active: boolean; onClick: () => void; showX?: boolean; interactive?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${interactive ? "hover:opacity-80 active:scale-95 cursor-pointer" : "cursor-default"} ${active ? "shadow-sm" : ""}`}
      style={{
        fontFamily: "Montserrat, sans-serif",
        background: active ? "#3092bb" : "transparent",
        color: active ? "white" : "#707A7E",
        borderColor: active ? "#3092bb" : "#E2E8F0",
      }}
    >
      {label}
      {showX && <X size={12} />}
    </button>
  );
}

function Section({ title, editing, onEdit, onSave, onCancel, saving, children, readOnlyView }: { 
  title: string; 
  editing: boolean; 
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  children: React.ReactNode;
  readOnlyView: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/5 overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.8)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
        <h3 className="text-sm font-bold" style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}>
          {title}
        </h3>
        {!editing ? (
          <button onClick={onEdit} className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 active:scale-95 transition-all" style={{ color: "#3092bb", fontFamily: "Montserrat, sans-serif" }}>
            <Pencil size={12} /> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={onSave} disabled={saving} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#16a34a", fontFamily: "Montserrat, sans-serif" }}>
              <Check size={12} /> {saving ? "..." : "Salvar"}
            </button>
            <button onClick={onCancel} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#dc2626", fontFamily: "Montserrat, sans-serif" }}>
              <X size={12} /> Cancelar
            </button>
          </div>
        )}
      </div>
      <div className="px-5 py-4">
        {editing ? children : readOnlyView}
      </div>
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

  // Normaliza rótulos EAD legados ('Curso a distância', 'EaD') para o vocabulário do form ('EAD') —
  // valor legado fica invisível nos checkboxes e seria re-gravado silenciosamente a cada save.
  const normalizeShifts = (shifts: string[] | null | undefined): string[] =>
    [...new Set((shifts ?? []).map(s => (s === 'Curso a distância' || s === 'EaD') ? 'EAD' : s))];

  const [courseInterest, setCourseInterest] = useState<string[]>((prefs?.course_interest as string[]) ?? []);
  const [quotaTypes, setQuotaTypes] = useState<string[]>((prefs?.quota_types as string[]) ?? []);
  const [preferredShifts, setPreferredShifts] = useState<string[]>(normalizeShifts(prefs?.preferred_shifts as string[]));
  const [programPref, setProgramPref] = useState<string>(String(prefs?.program_preference ?? "indiferente"));
  const [universityPref, setUniversityPref] = useState<string>(String(prefs?.university_preference ?? "indiferente"));
  const [locationPref, setLocationPref] = useState(String(prefs?.location_preference ?? ""));
  const [statePref, setStatePref] = useState(String(prefs?.state_preference ?? ""));

  const [editingEnem, setEditingEnem] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);
  const [editingQuota, setEditingQuota] = useState(false);
  const [editingShift, setEditingShift] = useState(false);
  const [editingProgram, setEditingProgram] = useState(false);
  const [editingUniv, setEditingUniv] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Course Autocomplete ──
  const [courseInput, setCourseInput] = useState("");
  const [courseResults, setCourseResults] = useState<string[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);
  const courseInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (courseInput.length < 2) {
      setCourseResults([]);
      setShowCourseSuggestions(false);
      return;
    }
    setCoursesLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("courses")
        .select("course_name")
        .ilike("course_name", `%${courseInput}%`)
        .limit(10);
      const names = [...new Set((data || []).map((r: any) => r.course_name).filter(Boolean))] as string[];
      setCourseResults(names);
      setShowCourseSuggestions(names.length > 0);
      setCoursesLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [courseInput]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (courseInputRef.current && !courseInputRef.current.contains(e.target as Node)) {
        setShowCourseSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleArr(arr: string[], val: string, setter: (a: string[]) => void, editing: boolean) {
    if (!editing) return;
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function handleSave(setEditingFalse: () => void) {
    setSaving(true);
    try {
      await Promise.all([
        saveUserPreferences(userId, {
          enem_score: enem.enem_score ? Number(enem.enem_score) : null,
          course_interest: courseInterest,
          quota_types: quotaTypes,
          preferred_shifts: preferredShifts,
          program_preference: programPref,
          university_preference: universityPref,
          location_preference: locationPref || null,
          state_preference: statePref || null,
        }),
        saveUserEnemScore(userId, {
          year: latestEnem.year ? Number(latestEnem.year) : new Date().getFullYear() - 1,
          nota_linguagens: enem.nota_linguagens ? Number(enem.nota_linguagens) : null,
          nota_ciencias_humanas: enem.nota_ciencias_humanas ? Number(enem.nota_ciencias_humanas) : null,
          nota_ciencias_natureza: enem.nota_ciencias_natureza ? Number(enem.nota_ciencias_natureza) : null,
          nota_matematica: enem.nota_matematica ? Number(enem.nota_matematica) : null,
          nota_redacao: enem.nota_redacao ? Number(enem.nota_redacao) : null,
        }),
      ]);
      setToast("Preferências salvas!");
      setEditingFalse();
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
        <Section 
          title="Vestibular — ENEM" 
          editing={editingEnem} 
          onEdit={() => setEditingEnem(true)} 
          onCancel={() => setEditingEnem(false)} 
          onSave={() => handleSave(() => setEditingEnem(false))} 
          saving={saving}
          readOnlyView={
            <div className="grid grid-cols-2 gap-3 text-sm" style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}>
              <p><span className="font-semibold text-[#707A7E]">Nota Geral:</span> {enem.enem_score || "—"}</p>
            </div>
          }
        >
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
        <Section 
          title="Interesse de Curso"
          editing={editingCourse}
          onEdit={() => setEditingCourse(true)}
          onCancel={() => {
            setEditingCourse(false);
            setCourseInput("");
            setCourseInterest((prefs?.course_interest as string[]) ?? []);
          }}
          onSave={() => handleSave(() => setEditingCourse(false))}
          saving={saving}
          readOnlyView={
            <div className="flex flex-wrap gap-2">
              {courseInterest.length ? courseInterest.map(course => (
                <Chip key={course} label={course} active={true} onClick={() => {}} />
              )) : <p className="text-sm text-[#707A7E]">Nenhum interesse selecionado</p>}
            </div>
          }
        >
          <div ref={courseInputRef} className="relative mb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707A7E]" />
                <input
                  className="w-full rounded-xl border pl-9 pr-8 py-2 text-sm outline-none focus:border-[#3092bb] transition-colors"
                  style={{ borderColor: "#E2E8F0", fontFamily: "Montserrat, sans-serif", color: "#3A424E" }}
                  placeholder="Buscar curso (ex: Medicina)..."
                  value={courseInput}
                  onChange={e => { setCourseInput(e.target.value); setShowCourseSuggestions(true); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const t = courseInput.trim();
                      if (t && !courseInterest.includes(t)) setCourseInterest([...courseInterest, t]);
                      setCourseInput("");
                      setShowCourseSuggestions(false);
                    }
                  }}
                />
                {coursesLoading && (
                  <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#3092bb]" />
                )}
              </div>
            </div>

            {showCourseSuggestions && courseResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-56 overflow-y-auto">
                {courseResults.map(name => (
                  <button
                    key={name}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-xs text-[#3A424E] hover:bg-[#E0F2FE] transition-colors font-medium"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                    onMouseDown={e => {
                      e.preventDefault();
                      if (!courseInterest.includes(name)) setCourseInterest([...courseInterest, name]);
                      setCourseInput("");
                      setShowCourseSuggestions(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {courseInterest.map((course) => (
              <Chip 
                key={course} 
                label={course} 
                active={true} 
                showX={true}
                interactive={true}
                onClick={() => setCourseInterest(courseInterest.filter(x => x !== course))} 
              />
            ))}
          </div>
        </Section>

        {/* Cotas */}
        <Section 
          title="Modalidades de Cota"
          editing={editingQuota}
          onEdit={() => setEditingQuota(true)}
          onCancel={() => {
            setEditingQuota(false);
            setQuotaTypes((prefs?.quota_types as string[]) ?? []);
          }}
          onSave={() => handleSave(() => setEditingQuota(false))}
          saving={saving}
          readOnlyView={
            <div className="flex flex-wrap gap-2">
              {quotaTypes.length ? quotaTypes.map(qId => {
                const q = QUOTA_OPTIONS.find(opt => opt.id === qId);
                return <Chip key={qId} label={q?.label || qId} active={true} onClick={() => {}} interactive={false} />;
              }) : <p className="text-sm text-[#707A7E]">Nenhuma cota selecionada</p>}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-2">
            {QUOTA_OPTIONS.map((q) => (
              <label 
                key={q.id} 
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  quotaTypes.includes(q.id) ? "bg-[#E0F2FE]/50 border-[#3092bb]/50" : "bg-white/30 border-black/5"
                }`}
              >
                <input 
                  type="checkbox" 
                  className="w-4 h-4 accent-[#3092bb]"
                  checked={quotaTypes.includes(q.id)}
                  onChange={() => {
                    if (quotaTypes.includes(q.id)) setQuotaTypes(quotaTypes.filter(x => x !== q.id));
                    else setQuotaTypes([...quotaTypes, q.id]);
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#3A424E]" style={{ fontFamily: "Montserrat, sans-serif" }}>{q.label}</span>
                  <span className="text-[10px] text-[#707A7E] leading-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>{q.description}</span>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {/* Turno */}
        <Section 
          title="Turno Preferido"
          editing={editingShift}
          onEdit={() => setEditingShift(true)}
          onCancel={() => {
            setEditingShift(false);
            setPreferredShifts(normalizeShifts(prefs?.preferred_shifts as string[]));
          }}
          onSave={() => handleSave(() => setEditingShift(false))}
          saving={saving}
          readOnlyView={
            <div className="flex flex-wrap gap-2">
              {preferredShifts.length ? preferredShifts.map(s => <Chip key={s} label={s} active={true} onClick={() => {}} interactive={false} />) : <p className="text-sm text-[#707A7E]">Nenhum turno selecionado</p>}
            </div>
          }
        >
          <div className="flex flex-wrap gap-2">
            {SHIFTS_OPTIONS.map((s) => (
              <Chip key={s} label={s} active={preferredShifts.includes(s)} onClick={() => toggleArr(preferredShifts, s, setPreferredShifts, editingShift)} interactive={editingShift} />
            ))}
          </div>
        </Section>

        {/* Programa */}
        <Section 
          title="Programa"
          editing={editingProgram}
          onEdit={() => setEditingProgram(true)}
          onCancel={() => {
            setEditingProgram(false);
            setProgramPref(String(prefs?.program_preference ?? "indiferente"));
          }}
          onSave={() => handleSave(() => setEditingProgram(false))}
          saving={saving}
          readOnlyView={
            <div className="flex flex-wrap gap-2">
              <Chip label={PROGRAMS.find(p => p.value === programPref)?.label || programPref} active={true} onClick={() => {}} interactive={false} />
            </div>
          }
        >
          <div className="flex gap-2 flex-wrap">
            {PROGRAMS.map((p) => (
              <Chip key={p.value} label={p.label} active={programPref === p.value} onClick={() => editingProgram && setProgramPref(p.value)} interactive={editingProgram} />
            ))}
          </div>
        </Section>

        {/* Tipo de Instituição */}
        <Section 
          title="Tipo de Instituição"
          editing={editingUniv}
          onEdit={() => setEditingUniv(true)}
          onCancel={() => {
            setEditingUniv(false);
            setUniversityPref(String(prefs?.university_preference ?? "indiferente"));
          }}
          onSave={() => handleSave(() => setEditingUniv(false))}
          saving={saving}
          readOnlyView={
            <div className="flex flex-wrap gap-2">
              <Chip label={UNIVERSITY_TYPES.find(p => p.value === universityPref)?.label || universityPref} active={true} onClick={() => {}} interactive={false} />
            </div>
          }
        >
          <div className="flex gap-2 flex-wrap">
            {UNIVERSITY_TYPES.map((u) => (
              <Chip key={u.value} label={u.label} active={universityPref === u.value} onClick={() => editingUniv && setUniversityPref(u.value)} interactive={editingUniv} />
            ))}
          </div>
        </Section>

        {/* Localização */}
        <Section 
          title="Localização"
          editing={editingLocation}
          onEdit={() => setEditingLocation(true)}
          onCancel={() => setEditingLocation(false)}
          onSave={() => handleSave(() => setEditingLocation(false))}
          saving={saving}
          readOnlyView={
            <div className="text-sm" style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}>
              <p><span className="font-semibold text-[#707A7E]">Preferência de local:</span> {locationPref || "—"}</p>
              <p><span className="font-semibold text-[#707A7E]">Estado:</span> {statePref || "—"}</p>
            </div>
          }
        >
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
            className="text-xs font-medium rounded-xl px-3 py-2 mt-4"
            style={{
              background: toast.includes("Erro") ? "rgba(220,38,38,0.1)" : "rgba(22,163,74,0.1)",
              color: toast.includes("Erro") ? "#dc2626" : "#16a34a",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {toast}
          </p>
        )}
      </div>
    </div>
  );
}
