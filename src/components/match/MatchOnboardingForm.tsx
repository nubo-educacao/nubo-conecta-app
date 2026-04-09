'use client';

// MatchOnboardingForm — Sprint 4.5 (BUG-004)
// Seção 1 (Dados Pessoais): espelha UserDataSection do nubo-hub-app.
// Seção 2 (Preferências): espelha UserPreferencesSection do nubo-hub-app.
// Fluxo: validate+saveUserData+saveUserIncome → saveUserPreferences → generateMatch → markOnboardingComplete → onComplete()

import { useState, useCallback } from 'react';
import {
  User, MapPin, GraduationCap, Calendar, Search, Home, Hash, Building,
  AlertCircle, DollarSign, Users, Calculator, X, Globe, Loader2, Sparkles,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { saveUserData, saveUserIncome, saveUserPreferences, markOnboardingComplete } from '@/services/profileService';
import { generateMatch } from '@/services/matchService';

interface MatchOnboardingFormProps {
  userId: string;
  onComplete: () => void;
}

// ── Education ────────────────────────────────────────────────────────────────
const EDUCATION_OPTIONS = [
  'Ensino Fundamental',
  'Ensino Médio Incompleto',
  'Ensino Médio Completo',
  'Ensino Superior Incompleto',
  'Ensino Superior Completo',
  'Pós-Gradução',
];

// ── Shifts (exact from UserPreferencesSection) ────────────────────────────────
const SHIFTS_OPTIONS = ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'EAD'];

// ── Program / University (DB check constraint: lowercase) ────────────────────
const PROGRAM_OPTIONS = [
  { label: 'Sisu', value: 'sisu' },
  { label: 'Prouni', value: 'prouni' },
  { label: 'Indiferente', value: 'indiferente' },
];
const UNIVERSITY_OPTIONS = [
  { label: 'Pública', value: 'publica' },
  { label: 'Privada', value: 'privada' },
  { label: 'Indiferente', value: 'indiferente' },
];

// ── Quota types (ConcurrencyTag enum values, exact from nubo-hub-app) ────────
const QUOTA_OPTIONS = [
  { id: 'AMPLA_CONCORRENCIA',           label: 'Ampla Concorrência',              description: 'Vagas sem critérios específicos de cota.' },
  { id: 'ESCOLA_PUBLICA',               label: 'Escola Pública',                  description: 'Para quem cursou todo o ensino médio em escola pública.' },
  { id: 'BAIXA_RENDA',                  label: 'Baixa Renda',                     description: 'Para estudantes de baixa renda familiar.' },
  { id: 'PPI',                          label: 'PPI (Pretos, Pardos e Indígenas)', description: 'Para estudantes autodeclarados pretos, pardos ou indígenas.' },
  { id: 'PRETOS E PARDOS',              label: 'Pretos e Pardos',                  description: 'Para estudantes autodeclarados pretos ou pardos.' },
  { id: 'INDIGENAS',                    label: 'Indígenas',                        description: 'Para estudantes indígenas.' },
  { id: 'QUILOMBOLAS',                  label: 'Quilombolas',                      description: 'Para estudantes pertencentes a comunidades quilombolas.' },
  { id: 'PCD',                          label: 'Pessoa com Deficiência (PCD)',      description: 'Para pessoas com deficiência, conforme laudo exigido.' },
  { id: 'TRANS',                        label: 'Trans / Travesti',                 description: 'Para pessoas trans ou travestis, quando previsto.' },
  { id: 'RURAL',                        label: 'Rural / Campo',                    description: 'Para estudantes oriundos de áreas rurais.' },
  { id: 'AGRICULTURA_FAMILIAR',         label: 'Agricultura Familiar',             description: 'Para estudantes de famílias que vivem da agricultura familiar.' },
  { id: 'REFUGIADOS',                   label: 'Refugiados',                       description: 'Para pessoas com status de refugiado reconhecido.' },
  { id: 'CIGANOS',                      label: 'Ciganos',                          description: 'Para estudantes pertencentes a comunidades ciganas.' },
  { id: 'AUTISMO',                      label: 'Autismo',                          description: 'Para pessoas no espectro autista.' },
  { id: 'ALTAS_HABILIDADES',            label: 'Altas Habilidades',                description: 'Para estudantes com altas habilidades ou superdotação.' },
  { id: 'EJA_ENCCEJA',                  label: 'EJA / ENCCEJA',                   description: 'Para quem concluiu os estudos pelo EJA ou ENCCEJA.' },
  { id: 'PROFESSOR',                    label: 'Professor da Rede Pública',        description: 'Para professores que atuam na rede pública.' },
  { id: 'MILITAR',                      label: 'Militares e Familiares',           description: 'Para policiais, bombeiros, militares ou seus familiares.' },
  { id: 'EFA',                          label: 'Escolas Família Agrícola (EFA)',   description: 'Para egressos de Escolas Família Agrícola.' },
  { id: 'PRIVACAO_LIBERDADE',           label: 'Privação de Liberdade',            description: 'Para pessoas em privação de liberdade.' },
  { id: 'PCD_AUDITIVA',                 label: 'Deficiência Auditiva / Surdos',   description: 'Para pessoas com deficiência auditiva.' },
  { id: 'ESCOLA_PRIVADA_BOLSA_INTEGRAL',label: 'Escola Privada com Bolsa',        description: 'Para quem estudou em escola privada com bolsa integral.' },
  { id: 'OUTROS_ESPECIFICO',            label: 'Outros Critérios Específicos',     description: 'Outros critérios de cota específicos não listados acima.' },
];

const STATES_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const SALARIO_MINIMO = 1518.00;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const calculateAge = (birthDate: string): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

interface ViaCEPResponse {
  localidade: string; uf: string; bairro: string; logradouro: string; erro?: boolean;
}
async function lookupCEP(raw: string): Promise<ViaCEPResponse | null> {
  const clean = raw.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data: ViaCEPResponse = await res.json();
    return data.erro ? null : data;
  } catch { return null; }
}

// ── Shared input style ────────────────────────────────────────────────────────
const inputCls = 'bg-white/50 border border-white/40 focus:border-[#38B1E4] rounded-lg px-3 py-2 text-[#3A424E] outline-none transition-all placeholder:text-gray-400 w-full';

function FieldLabel({ icon: Icon, label, error }: { icon?: React.ElementType; label: string; error?: boolean }) {
  return (
    <label className={`text-sm font-semibold flex items-center gap-2 ${error ? 'text-red-500' : 'text-[#1BBBCD]'}`}>
      {Icon && <Icon size={14} />}
      {label}
      {error && <AlertCircle size={12} className="text-red-500 animate-pulse" />}
    </label>
  );
}

export default function MatchOnboardingForm({ userId, onComplete }: MatchOnboardingFormProps) {
  const [section, setSection] = useState<'personal' | 'prefs'>('personal');

  // ── Seção 1 state ─────────────────────────────────────────────────────────
  const [fullName, setFullName]         = useState('');
  const [birthDate, setBirthDate]       = useState('');
  const [education, setEducation]       = useState('');
  const [educationYear, setEducationYear] = useState('');
  const [outsideBrazil, setOutsideBrazil] = useState(false);
  // Address (Brazil)
  const [zipCode, setZipCode]           = useState('');
  const [state, setState]               = useState('');
  const [city, setCity]                 = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet]             = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [complement, setComplement]     = useState('');
  // Address (abroad)
  const [country, setCountry]           = useState('');
  const [cepLoading, setCepLoading]     = useState(false);
  const [cepError, setCepError]         = useState<string | null>(null);

  // Income calculator state
  const [perCapitaIncome, setPerCapitaIncome] = useState<number | null>(null);
  const [useCalculator, setUseCalculator]     = useState(false);
  const [familyCountStr, setFamilyCountStr]   = useState('');
  const [memberIncomesStr, setMemberIncomesStr] = useState<string[]>([]);
  const [socialBenefitsStr, setSocialBenefitsStr] = useState('');
  const [alimonyStr, setAlimonyStr]           = useState('');

  // ── Seção 2 state ─────────────────────────────────────────────────────────
  const [enemScore, setEnemScore]           = useState('');
  const [courseInput, setCourseInput]       = useState('');
  const [courseInterest, setCourseInterest] = useState<string[]>([]);
  const [quotaTypes, setQuotaTypes]         = useState<string[]>([]);
  const [shifts, setShifts]                 = useState<string[]>([]);
  const [programPref, setProgramPref]       = useState('');
  const [universityPref, setUniversityPref] = useState('');
  const [locationPref, setLocationPref]     = useState('');
  const [statePref, setStatePref]           = useState('');

  // ── Status ────────────────────────────────────────────────────────────────
  const [errors, setErrors]               = useState<Record<string, boolean>>({});
  const [section1Saving, setSection1Saving] = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);

  // ── Income calculator derived value ───────────────────────────────────────
  const calcPerCapita = useCallback(() => {
    if (!useCalculator) return perCapitaIncome;
    const count = parseInt(familyCountStr) || 0;
    const incomes = memberIncomesStr
      .map(i => parseFloat(i.replace(',', '.')))
      .filter(n => !isNaN(n))
      .reduce((a, b) => a + b, 0);
    const benefits = parseFloat(socialBenefitsStr.replace(',', '.')) || 0;
    const alim = parseFloat(alimonyStr.replace(',', '.')) || 0;
    return count > 0 ? (incomes + benefits + alim) / count : 0;
  }, [useCalculator, familyCountStr, memberIncomesStr, socialBenefitsStr, alimonyStr, perCapitaIncome]);

  const handleFamilyCountChange = (val: string) => {
    setFamilyCountStr(val);
    const count = parseInt(val);
    if (!isNaN(count) && count > 0) {
      setMemberIncomesStr(prev => {
        const arr = [...prev];
        while (arr.length < count) arr.push('');
        return arr.slice(0, count);
      });
    } else {
      setMemberIncomesStr([]);
    }
  };

  // ── CEP ───────────────────────────────────────────────────────────────────
  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 5) formatted = raw.slice(0, 5) + '-' + raw.slice(5, 8);
    setZipCode(formatted);
    setCepError(null);
    if (raw.length === 8) handleCEPLookup(raw);
  };

  const handleCEPLookup = useCallback(async (raw: string) => {
    setCepLoading(true);
    setCepError(null);
    const result = await lookupCEP(raw);
    if (result) {
      setCity(result.localidade);
      setState(result.uf);
      setNeighborhood(result.bairro || '');
      setStreet(result.logradouro || '');
    } else {
      setCepError('CEP não encontrado');
    }
    setCepLoading(false);
  }, []);

  // ── Section 1 Validation + Save ───────────────────────────────────────────
  const validateSection1 = (): { valid: boolean; errs: Record<string, boolean> } => {
    const errs: Record<string, boolean> = {};
    const nameParts = fullName.trim().split(/\s+/);
    if (!fullName || nameParts.length < 2) errs.full_name = true;
    const age = calculateAge(birthDate);
    if (!birthDate || !age || age < 6 || age > 100) errs.birth_date = true;
    if (!education) errs.education = true;

    if (outsideBrazil) {
      if (!country) errs.country = true;
      if (!city) errs.city = true;
      if (!street) errs.street = true;
    } else {
      if (!zipCode || zipCode.replace(/\D/g, '').length < 8) errs.zip_code = true;
      if (!state) errs.state = true;
      if (!city) errs.city = true;
      if (!neighborhood) errs.neighborhood = true;
      if (!street) errs.street = true;
      if (!streetNumber) errs.street_number = true;
    }

    setErrors(errs);
    return { valid: Object.keys(errs).length === 0, errs };
  };

  const handleNextSection = async () => {
    const { valid } = validateSection1();
    if (!valid) return;
    setSection1Saving(true);
    setSubmitError(null);
    try {
      const age = calculateAge(birthDate);
      await saveUserData(userId, {
        full_name:      fullName.trim(),
        birth_date:     birthDate,
        age:            age ?? undefined,
        education:      education,
        education_year: educationYear || 'N/A',
        zip_code:       outsideBrazil ? null : zipCode.replace(/\D/g, '') || null,
        city:           city || null,
        state:          outsideBrazil ? null : (state || null),
        neighborhood:   outsideBrazil ? null : (neighborhood || null),
        street:         street || null,
        street_number:  outsideBrazil ? null : (streetNumber || null),
        complement:     outsideBrazil ? null : (complement || null),
        country:        outsideBrazil ? (country || null) : 'Brasil',
        outside_brazil: outsideBrazil,
      });

      const derived = calcPerCapita();
      if (derived !== null) {
        await saveUserIncome(userId, {
          family_count:       parseInt(familyCountStr) || null,
          social_benefits:    parseFloat(socialBenefitsStr.replace(',', '.')) || null,
          alimony:            parseFloat(alimonyStr.replace(',', '.')) || null,
          member_incomes:     memberIncomesStr.map(i => parseFloat(i.replace(',', '.'))).filter(n => !isNaN(n)),
          per_capita_income:  derived,
        });
      }

      setSection('prefs');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao salvar dados. Tente novamente.');
    } finally {
      setSection1Saving(false);
    }
  };

  // ── Final Submit ─────────────────────────────────────────────────────────
  const canSubmit = enemScore.trim() !== '';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const derived = calcPerCapita();
      await saveUserPreferences(userId, {
        enem_score:              parseFloat(enemScore),
        family_income_per_capita: derived ?? null,
        course_interest:         courseInterest.length > 0 ? courseInterest : null,
        quota_types:             quotaTypes.length > 0 ? quotaTypes : null,
        preferred_shifts:        shifts.length > 0 ? shifts : null,
        program_preference:      programPref || null,
        university_preference:   universityPref || null,
        location_preference:     locationPref || null,
        state_preference:        statePref || null,
      });
      await generateMatch(userId);
      await markOnboardingComplete();
      onComplete();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao gerar match. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addCourse = () => {
    const t = courseInput.trim();
    if (t && !courseInterest.includes(t)) setCourseInterest(p => [...p, t]);
    setCourseInput('');
  };
  const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const pillBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
      style={{
        background: active ? '#38B1E4' : 'rgba(56,177,228,0.1)',
        color:      active ? '#ffffff' : '#38B1E4',
        border:     `1px solid ${active ? '#38B1E4' : 'rgba(56,177,228,0.25)'}`,
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      {label}
    </button>
  );

  const sectionTab = (id: 'personal' | 'prefs', label: string) => (
    <button
      type="button"
      onClick={() => setSection(id)}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all"
      style={{
        background: section === id ? '#38B1E4' : 'rgba(56,177,228,0.08)',
        color:      section === id ? '#ffffff' : '#636e7c',
        fontFamily: 'Montserrat, sans-serif',
        border:     `1px solid ${section === id ? '#38B1E4' : 'rgba(56,177,228,0.15)'}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Header */}
      <div>
        <h2 className="font-bold text-[16px]" style={{ color: '#3A424E', fontFamily: 'Montserrat, sans-serif' }}>
          Complete seu perfil
        </h2>
        <p className="text-[13px] mt-0.5" style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}>
          Preencha seus dados para gerar oportunidades personalizadas.
        </p>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2">
        {sectionTab('personal', '1. Dados Pessoais')}
        {sectionTab('prefs', '2. Preferências')}
      </div>

      {/* ══ SEÇÃO 1: Dados Pessoais ══════════════════════════════════════════ */}
      {section === 'personal' && (
        <div className="flex flex-col gap-5">

          {/* Nome + Data Nascimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel icon={User} label="Nome Completo" error={errors.full_name} />
              <input
                type="text"
                value={fullName}
                onChange={e => { setFullName(e.target.value); if (errors.full_name) setErrors(p => ({...p, full_name: false})); }}
                placeholder="Seu nome completo"
                className={`${inputCls} ${errors.full_name ? 'border-red-400 bg-red-50/10' : ''}`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel icon={Calendar} label="Data de Nascimento" error={errors.birth_date} />
              <input
                type="date"
                value={birthDate}
                onChange={e => { setBirthDate(e.target.value); if (errors.birth_date) setErrors(p => ({...p, birth_date: false})); }}
                className={`${inputCls} ${errors.birth_date ? 'border-red-400 bg-red-50/10' : ''}`}
              />
            </div>
          </div>

          {/* Escolaridade + Ano */}
          <div className="border-t border-white/20 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel icon={GraduationCap} label="Escolaridade" error={errors.education} />
              <select
                value={education}
                onChange={e => {
                  const val = e.target.value;
                  setEducation(val);
                  if (val !== 'Ensino Fundamental' && val !== 'Ensino Médio Incompleto') setEducationYear('');
                  if (errors.education) setErrors(p => ({...p, education: false}));
                }}
                className={`${inputCls} h-[42px] ${errors.education ? 'border-red-400 bg-red-50/10' : ''}`}
              >
                <option value="">Selecione...</option>
                {EDUCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {(education === 'Ensino Fundamental' || education === 'Ensino Médio Incompleto') && (
              <div className="flex flex-col gap-1.5">
                <FieldLabel icon={Calendar} label="Ano" error={errors.education_year} />
                <select
                  value={educationYear}
                  onChange={e => setEducationYear(e.target.value)}
                  className={`${inputCls} h-[42px]`}
                >
                  <option value="">Selecione o ano...</option>
                  {education === 'Ensino Fundamental'
                    ? Array.from({ length: 9 }, (_, i) => (
                        <option key={i+1} value={`${i+1}º ano`}>{i+1}º ano</option>
                      ))
                    : (
                      <>
                        <option value="1º ano EM">1º ano EM</option>
                        <option value="2º ano EM">2º ano EM</option>
                        <option value="3º ano EM">3º ano EM</option>
                      </>
                    )
                  }
                </select>
              </div>
            )}
          </div>

          {/* ── Renda ─────────────────────────────────────────────────────── */}
          <div className="border-t border-white/20 pt-4">
            <h3 className="text-base font-bold flex items-center gap-2 mb-3" style={{ color: '#024F86', fontFamily: 'Montserrat, sans-serif' }}>
              <DollarSign size={16} /> Informações de Renda
            </h3>

            <div className="flex flex-col gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-sm font-medium" style={{ color: '#3A424E', fontFamily: 'Montserrat, sans-serif' }}>
                    Renda Per Capita:{' '}
                  </span>
                  <span className="text-base font-bold" style={{ color: '#024F86', fontFamily: 'Montserrat, sans-serif' }}>
                    {calcPerCapita() != null ? formatCurrency(calcPerCapita()!) : 'Não informada'}
                  </span>
                  {calcPerCapita() != null && calcPerCapita()! > 0 && (
                    <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {(calcPerCapita()! / SALARIO_MINIMO).toFixed(2)} SM
                    </span>
                  )}
                </div>
                {!useCalculator && (
                  <button
                    type="button"
                    onClick={() => setUseCalculator(true)}
                    className="text-xs bg-[#E0F2FE] text-[#024F86] px-3 py-1.5 rounded-lg font-medium hover:bg-[#d0ebfd] transition-colors flex items-center gap-1"
                  >
                    <Calculator size={12} /> Calcular Renda
                  </button>
                )}
              </div>

              {useCalculator && (
                <div className="space-y-3 border-t pt-3 border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel icon={Users} label="Pessoas na casa" />
                      <input
                        type="number"
                        value={familyCountStr}
                        onChange={e => handleFamilyCountChange(e.target.value)}
                        placeholder="Quantas pessoas?"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel icon={DollarSign} label="Benefícios Sociais (Bolsa Família, etc)" />
                      <input
                        type="number"
                        value={socialBenefitsStr}
                        onChange={e => setSocialBenefitsStr(e.target.value)}
                        placeholder="R$ 0,00"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel icon={DollarSign} label="Pensão Alimentícia" />
                      <input
                        type="number"
                        value={alimonyStr}
                        onChange={e => setAlimonyStr(e.target.value)}
                        placeholder="R$ 0,00"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {memberIncomesStr.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Renda por pessoa (sem contar benefícios/pensão)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {memberIncomesStr.map((inc, i) => (
                          <div key={i} className="bg-white p-2 rounded-lg border border-gray-200">
                            <label className="text-xs text-gray-500 mb-1 block" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                              Pessoa {i + 1}
                            </label>
                            <input
                              type="number"
                              value={inc}
                              onChange={e => {
                                const arr = [...memberIncomesStr];
                                arr[i] = e.target.value;
                                setMemberIncomesStr(arr);
                              }}
                              className="w-full text-sm outline-none text-[#3A424E] placeholder:text-gray-300"
                              placeholder="R$ 0,00"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setUseCalculator(false)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <X size={12} /> Ocultar Calculadora (Manter Valor)
                  </button>
                </div>
              )}

              {!useCalculator && (
                <div className="flex flex-col gap-1.5">
                  <FieldLabel icon={DollarSign} label="Editar Valor Permanentemente (Manual)" />
                  <input
                    type="number"
                    value={perCapitaIncome ?? ''}
                    onChange={e => setPerCapitaIncome(parseFloat(e.target.value) || null)}
                    placeholder="R$ 0,00"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Endereço ──────────────────────────────────────────────────── */}
          <div className="border-t border-white/20 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: '#024F86', fontFamily: 'Montserrat, sans-serif' }}>
                <Home size={16} /> Endereço
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold" style={{ color: '#1BBBCD', fontFamily: 'Montserrat, sans-serif' }}>
                <input
                  type="checkbox"
                  checked={outsideBrazil}
                  onChange={e => setOutsideBrazil(e.target.checked)}
                  className="w-4 h-4 accent-[#38B1E4] rounded cursor-pointer"
                />
                <Globe size={14} /> Não moro no Brasil
              </label>
            </div>

            {outsideBrazil ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel icon={Globe} label="País" error={errors.country} />
                  <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Ex: Estados Unidos"
                    className={`${inputCls} ${errors.country ? 'border-red-400 bg-red-50/10' : ''}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel icon={Building} label="Cidade" error={errors.city} />
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Nova Iorque"
                    className={`${inputCls} ${errors.city ? 'border-red-400 bg-red-50/10' : ''}`} />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <FieldLabel icon={Home} label="Endereço Completo" error={errors.street} />
                  <input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="Rua, número, complemento..."
                    className={`${inputCls} ${errors.street ? 'border-red-400 bg-red-50/10' : ''}`} />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* CEP */}
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <FieldLabel icon={MapPin} label="CEP" error={errors.zip_code} />
                    <div className="relative">
                      <input
                        type="text"
                        value={zipCode}
                        onChange={handleCEPChange}
                        placeholder="00000-000"
                        maxLength={9}
                        className={`${inputCls} pr-10 ${errors.zip_code ? 'border-red-400 bg-red-50/10' : ''}`}
                      />
                      {cepLoading
                        ? <Loader2 size={16} className="animate-spin text-[#38B1E4] absolute right-3 top-1/2 -translate-y-1/2" />
                        : <button
                            type="button"
                            onClick={() => handleCEPLookup(zipCode)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#38B1E4] hover:text-[#2a9ac9] transition-colors"
                          >
                            <Search size={16} />
                          </button>
                      }
                    </div>
                    {cepError && <p className="text-red-500 text-xs">{cepError}</p>}
                  </div>

                  {/* Estado */}
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel icon={Building} label="Estado" error={errors.state} />
                    <input type="text" value={state} onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="UF" maxLength={2}
                      className={`${inputCls} ${errors.state ? 'border-red-400 bg-red-50/10' : ''}`} />
                  </div>

                  {/* Cidade */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <FieldLabel icon={MapPin} label="Cidade" error={errors.city} />
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Sua cidade"
                      className={`${inputCls} ${errors.city ? 'border-red-400 bg-red-50/10' : ''}`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  {/* Bairro */}
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <FieldLabel icon={MapPin} label="Bairro" error={errors.neighborhood} />
                    <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Seu bairro"
                      className={`${inputCls} ${errors.neighborhood ? 'border-red-400 bg-red-50/10' : ''}`} />
                  </div>

                  {/* Rua */}
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <FieldLabel icon={Home} label="Rua" error={errors.street} />
                    <input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="Nome da rua"
                      className={`${inputCls} ${errors.street ? 'border-red-400 bg-red-50/10' : ''}`} />
                  </div>

                  {/* Número */}
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel icon={Hash} label="Número" error={errors.street_number} />
                    <input type="text" value={streetNumber} onChange={e => setStreetNumber(e.target.value)} placeholder="Nº"
                      className={`${inputCls} ${errors.street_number ? 'border-red-400 bg-red-50/10' : ''}`} />
                  </div>

                  {/* Complemento */}
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel icon={Building} label="Complemento" />
                    <input type="text" value={complement} onChange={e => setComplement(e.target.value)} placeholder="Apto, bloco..."
                      className={inputCls} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {submitError && (
            <div className="px-4 py-3 rounded-xl text-[13px]" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', fontFamily: 'Montserrat, sans-serif' }}>
              {submitError}
            </div>
          )}
          {Object.keys(errors).length > 0 && (
            <div className="px-4 py-3 rounded-xl text-[13px]" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', fontFamily: 'Montserrat, sans-serif' }}>
              Corrija os campos destacados antes de continuar.
            </div>
          )}

          <button
            type="button"
            onClick={handleNextSection}
            disabled={section1Saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)', fontFamily: 'Montserrat, sans-serif' }}
          >
            {section1Saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {section1Saving ? 'Salvando...' : 'Próximo: Preferências →'}
          </button>
        </div>
      )}

      {/* ══ SEÇÃO 2: Preferências ════════════════════════════════════════════ */}
      {section === 'prefs' && (
        <div className="flex flex-col gap-5">

          {/* ENEM Score */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel icon={GraduationCap} label="Nota do ENEM *" />
            <input
              type="number"
              min={0} max={1000} step={0.01}
              value={enemScore}
              onChange={e => setEnemScore(e.target.value)}
              placeholder="Ex: 650.5"
              className={inputCls}
            />
            <p className="text-[11px]" style={{ color: '#9ca3af', fontFamily: 'Montserrat, sans-serif' }}>
              Nota média (0 a 1000). Campo obrigatório para gerar o Match.
            </p>
          </div>

          {/* Cursos de Interesse */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel icon={GraduationCap} label="Cursos de interesse" />
            <div className="flex gap-2">
              <input
                type="text"
                value={courseInput}
                onChange={e => setCourseInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCourse(); } }}
                placeholder="Ex: Medicina, Direito..."
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={addCourse}
                className="px-3 py-2 rounded-lg text-[13px] font-bold text-white"
                style={{ background: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
              >
                +
              </button>
            </div>
            {courseInterest.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {courseInterest.map(c => (
                  <span
                    key={c}
                    onClick={() => setCourseInterest(p => p.filter(x => x !== c))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold cursor-pointer"
                    style={{ background: '#E0F2FE', color: '#024F86', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {c} <X size={10} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cotas */}
          <div className="flex flex-col gap-2 border-t border-white/20 pt-4">
            <FieldLabel label="Cotas aplicáveis" />
            <div className="flex flex-col gap-2">
              {QUOTA_OPTIONS.map(({ id, label, description }) => (
                <label
                  key={id}
                  className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={quotaTypes.includes(id)}
                    onChange={() => toggleArr(quotaTypes, id, setQuotaTypes)}
                    className="mt-0.5 w-4 h-4 accent-[#38B1E4] flex-shrink-0"
                  />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: '#3A424E', fontFamily: 'Montserrat, sans-serif' }}>
                      {label}
                    </p>
                    <p className="text-[11px]" style={{ color: '#9ca3af', fontFamily: 'Montserrat, sans-serif' }}>
                      {description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Turnos */}
          <div className="flex flex-col gap-2 border-t border-white/20 pt-4">
            <FieldLabel label="Turnos preferidos" />
            <div className="flex flex-wrap gap-2">
              {SHIFTS_OPTIONS.map(s => pillBtn(s, shifts.includes(s), () => toggleArr(shifts, s, setShifts)))}
            </div>
          </div>

          {/* Programa preferido */}
          <div className="flex flex-col gap-2 border-t border-white/20 pt-4">
            <FieldLabel label="Programa preferido" />
            <div className="flex gap-2">
              {PROGRAM_OPTIONS.map(({ label, value }) => pillBtn(label, programPref === value, () => setProgramPref(programPref === value ? '' : value)))}
            </div>
          </div>

          {/* Tipo de universidade */}
          <div className="flex flex-col gap-2 border-t border-white/20 pt-4">
            <FieldLabel label="Tipo de universidade" />
            <div className="flex gap-2">
              {UNIVERSITY_OPTIONS.map(({ label, value }) => pillBtn(label, universityPref === value, () => setUniversityPref(universityPref === value ? '' : value)))}
            </div>
          </div>

          {/* Localização + Estado de preferência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/20 pt-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel icon={MapPin} label="Cidade de preferência" />
              <input
                type="text"
                value={locationPref}
                onChange={e => setLocationPref(e.target.value)}
                placeholder="Ex: São Paulo"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel icon={MapPin} label="Estado de preferência" />
              <select value={statePref} onChange={e => setStatePref(e.target.value)} className={inputCls}>
                <option value="">Qualquer estado</option>
                {STATES_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="px-4 py-3 rounded-xl text-[13px]" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', fontFamily: 'Montserrat, sans-serif' }}>
              {submitError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)', fontFamily: 'Montserrat, sans-serif' }}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {submitting ? 'Gerando seu Match...' : 'Gerar Match'}
          </button>

          {!canSubmit && (
            <p className="text-center text-[12px]" style={{ color: '#9ca3af', fontFamily: 'Montserrat, sans-serif' }}>
              Preencha a nota do ENEM para continuar
            </p>
          )}
        </div>
      )}
    </div>
  );
}
