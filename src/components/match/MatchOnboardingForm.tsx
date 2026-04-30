'use client';

// MatchOnboardingForm — Sprint 4.5 (BUG-004)
// Unified 3-step sequential onboarding flow.
// Step 1: Identificação (Profile + Address)
// Step 2: Desempenho & Renda (ENEM Scores + Income Calculator)
// Step 3: Interesses & Filtros (Course Interests + Match Filters)

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  User, MapPin, GraduationCap, Calendar, Search, Home, Hash, Building,
  AlertCircle, DollarSign, Users, Calculator, X, Globe, Loader2, Sparkles,
  ChevronRight, ChevronLeft, Check, BookOpen, Briefcase, Info, Mail, Phone,
  CheckCircle
} from 'lucide-react';
import { 
  saveUserData, 
  saveUserIncome, 
  saveUserPreferences, 
  saveUserEnemScore,
  markOnboardingComplete 
} from '@/services/profileService';
import { generateMatchAsync, getMatchStatus } from '@/services/matchService';

interface MatchOnboardingFormProps {
  userId: string;
  onComplete: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const EDUCATION_OPTIONS = [
  'Ensino Fundamental',
  'Ensino Médio Incompleto',
  'Ensino Médio Completo',
  'Ensino Superior Incompleto',
  'Ensino Superior Completo',
  'Pós-Gradução',
];

const SHIFTS_OPTIONS = ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'EAD'];

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

const QUOTA_OPTIONS = [
  { id: 'AMPLA_CONCORRENCIA', label: 'Ampla Concorrência', description: 'Vagas sem critérios específicos de cota.' },
  { id: 'ESCOLA_PUBLICA', label: 'Escola Pública', description: 'Para quem cursou todo o ensino médio em escola pública.' },
  { id: 'BAIXA_RENDA', label: 'Baixa Renda', description: 'Para estudantes de baixa renda familiar.' },
  { id: 'PPI', label: 'PPI (Pretos, Pardos e Indígenas)', description: 'Para estudantes autodeclarados pretos, pardos ou indígenas.' },
  { id: 'PCD', label: 'Pessoa com Deficiência (PCD)', description: 'Para pessoas com deficiência.' },
  { id: 'TRANS', label: 'Trans / Travesti', description: 'Para pessoas trans ou travestis.' },
  { id: 'QUILOMBOLAS', label: 'Quilombolas', description: 'Para estudantes pertencentes a comunidades quilombolas.' },
];

const STATES_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const SALARIO_MINIMO = 1518.00;

// ── Helpers ──────────────────────────────────────────────────────────────────

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

async function lookupCEP(raw: string) {
  const clean = raw.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.erro ? null : data;
  } catch { return null; }
}

// ── Components ───────────────────────────────────────────────────────────────

function FieldLabel({ icon: Icon, label, error, required, htmlFor }: { icon?: React.ElementType; label: string; error?: boolean; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-[12px] font-bold flex items-center gap-1.5 mb-1.5 uppercase tracking-wider ${error ? 'text-red-500' : 'text-[#636E7C]'}`}>
      {Icon && <Icon size={14} className={error ? 'text-red-500' : 'text-[#1BBBCD]'} />}
      {label}
      {required && <span className="text-[#38B1E4]">*</span>}
      {error && <AlertCircle size={12} className="text-red-500 animate-pulse ml-auto" />}
    </label>
  );
}

const inputCls = 'bg-white/40 border border-white/60 focus:border-[#38B1E4] focus:bg-white rounded-xl px-4 py-2.5 text-[#3A424E] outline-none transition-all placeholder:text-gray-400 w-full text-[14px] shadow-sm';

export default function MatchOnboardingForm({ userId, onComplete }: MatchOnboardingFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1 State (Identificação) ──────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [education, setEducation] = useState('');
  const [educationYear, setEducationYear] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address
  const [outsideBrazil, setOutsideBrazil] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [country, setCountry] = useState('Brasil');
  
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // ── Step 2 State (Desempenho & Renda) ──────────────────────────────────────
  // ENEM
  const [enemScore, setEnemScore] = useState('');
  const [enemYear, setEnemYear] = useState(new Date().getFullYear().toString());
  const [notaLing, setNotaLing] = useState('');
  const [notaHum, setNotaHum] = useState('');
  const [notaNat, setNotaNat] = useState('');
  const [notaMat, setNotaMat] = useState('');
  const [notaRed, setNotaRed] = useState('');

  // Income Calculator
  const [useCalculator, setUseCalculator] = useState(true);
  const [familyCount, setFamilyCount] = useState('');
  const [socialBenefits, setSocialBenefits] = useState('');
  const [alimony, setAlimony] = useState('');
  const [memberIncomes, setMemberIncomes] = useState<string[]>([]);
  const [manualPerCapita, setManualPerCapita] = useState<number | null>(null);

  // Auto-calculate ENEM Average
  useEffect(() => {
    const scores = [notaLing, notaHum, notaNat, notaMat, notaRed]
      .map(s => parseFloat(s))
      .filter(n => !isNaN(n));
    
    if (scores.length === 5) {
      const avg = scores.reduce((a, b) => a + b, 0) / 5;
      setEnemScore(avg.toFixed(1));
    } else if (scores.length > 0) {
      // Clear manual score if they started typing components
      setEnemScore('');
    }
  }, [notaLing, notaHum, notaNat, notaMat, notaRed]);

  // ── Step 3 State (Interesses & Filtros) ────────────────────────────────────
  const [courseInput, setCourseInput] = useState('');
  const [courseInterest, setCourseInterest] = useState<string[]>([]);
  const [quotaTypes, setQuotaTypes] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [programPref, setProgramPref] = useState('indiferente');
  const [universityPref, setUniversityPref] = useState('indiferente');
  const [locationPref, setLocationPref] = useState('');
  const [statePref, setStatePref] = useState('');

  // ── UI Status ──────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ── Derived Values ─────────────────────────────────────────────────────────
  const perCapitaIncome = useMemo(() => {
    if (!useCalculator) return manualPerCapita;
    const count = parseInt(familyCount) || 0;
    const incomesTotal = memberIncomes
      .map(i => parseFloat(i.replace(',', '.')))
      .filter(n => !isNaN(n))
      .reduce((a, b) => a + b, 0);
    const benefits = parseFloat(socialBenefits.replace(',', '.')) || 0;
    const alim = parseFloat(alimony.replace(',', '.')) || 0;
    return count > 0 ? (incomesTotal + benefits + alim) / count : 0;
  }, [useCalculator, familyCount, memberIncomes, socialBenefits, alimony, manualPerCapita]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setZipCode(val);
    if (val.length === 8) {
      setCepLoading(true);
      setCepError(null);
      const data = await lookupCEP(val);
      if (data) {
        setCity(data.localidade);
        setState(data.uf);
        setNeighborhood(data.bairro || '');
        setStreet(data.logradouro || '');
      } else {
        setCepError('CEP não encontrado');
      }
      setCepLoading(false);
    }
  };

  const handleFamilyCountChange = (val: string) => {
    setFamilyCount(val);
    const count = parseInt(val);
    if (!isNaN(count) && count > 0) {
      setMemberIncomes(prev => {
        const arr = [...prev];
        while (arr.length < count) arr.push('');
        return arr.slice(0, count);
      });
    } else {
      setMemberIncomes([]);
    }
  };

  const validateStep = () => {
    const errs: Record<string, boolean> = {};
    if (step === 1) {
      if (!fullName.trim() || fullName.trim().split(' ').length < 2) errs.fullName = true;
      if (!birthDate) errs.birthDate = true;
      if (!education) errs.education = true;
      if (!outsideBrazil) {
        if (zipCode.length < 8) errs.zipCode = true;
        if (!city) errs.city = true;
        if (!state) errs.state = true;
        if (!street) errs.street = true;
        if (!streetNumber) errs.streetNumber = true;
      } else {
        if (!country) errs.country = true;
        if (!city) errs.city = true;
      }
    } else if (step === 2) {
      if (!enemScore || parseFloat(enemScore) < 0 || parseFloat(enemScore) > 1000) errs.enemScore = true;
      if (perCapitaIncome === null) errs.income = true;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep(prev => (prev < 3 ? (prev + 1 as any) : 3));
  };

  const prevStep = () => setStep(prev => (prev > 1 ? (prev - 1 as any) : 1));

  const handleFinalSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setGlobalError(null);

    try {
      // 1. Save User Profile
      await saveUserData(userId, {
        full_name: fullName,
        birth_date: birthDate,
        age: calculateAge(birthDate) || undefined,
        education,
        education_year: educationYear || 'N/A',
        zip_code: outsideBrazil ? null : zipCode,
        city,
        state: outsideBrazil ? null : state,
        neighborhood: outsideBrazil ? null : neighborhood,
        street,
        street_number: outsideBrazil ? null : streetNumber,
        complement,
        country: outsideBrazil ? country : 'Brasil',
        outside_brazil: outsideBrazil,
      });

      // 2. Save Income
      await saveUserIncome(userId, {
        family_count: parseInt(familyCount) || null,
        social_benefits: parseFloat(socialBenefits) || 0,
        alimony: parseFloat(alimony) || 0,
        member_incomes: memberIncomes.map(i => parseFloat(i) || 0),
        per_capita_income: perCapitaIncome || 0,
      });

      // 3. Save ENEM Scores
      await saveUserEnemScore(userId, {
        year: parseInt(enemYear),
        nota_linguagens: parseFloat(notaLing) || null,
        nota_ciencias_humanas: parseFloat(notaHum) || null,
        nota_ciencias_natureza: parseFloat(notaNat) || null,
        nota_matematica: parseFloat(notaMat) || null,
        nota_redacao: parseFloat(notaRed) || null,
      });

      // 4. Save Preferences
      await saveUserPreferences(userId, {
        enem_score: parseFloat(enemScore),
        family_income_per_capita: perCapitaIncome,
        course_interest: courseInterest.length > 0 ? courseInterest : null,
        quota_types: quotaTypes.length > 0 ? quotaTypes : null,
        preferred_shifts: shifts.length > 0 ? shifts : null,
        program_preference: programPref,
        university_preference: universityPref,
        location_preference: locationPref || null,
        state_preference: statePref || null,
      });

      // 5. Generate Match and Complete (Async Flow)
      await generateMatchAsync();
      
      // Polling for completion
      let status = 'processing';
      let retryCount = 0;
      const maxRetries = 30; // 60 seconds max polling

      while (status === 'processing' && retryCount < maxRetries) {
        await new Promise(r => setTimeout(r, 2000));
        status = await getMatchStatus(userId);
        retryCount++;
        if (status === 'error') throw new Error('O motor de match encontrou um erro. Tente novamente em alguns instantes.');
      }

      if (status === 'processing') {
        throw new Error('O processamento está demorando mais que o esperado. Seus matches aparecerão em breve no catálogo.');
      }

      await markOnboardingComplete();
      onComplete();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Erro ao processar dados.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render Helpers ─────────────────────────────────────────────────────────

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-2">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] transition-all duration-300 ${
              step === s 
                ? 'bg-[#38B1E4] text-white shadow-[0_0_15px_rgba(56,177,228,0.4)] scale-110' 
                : step > s 
                  ? 'bg-[#1BBBCD] text-white' 
                  : 'bg-white/50 text-[#636E7C] border border-white/60'
            }`}
          >
            {step > s ? <Check size={20} /> : s}
          </div>
          {s < 3 && (
            <div className={`h-[2px] flex-1 mx-2 rounded-full transition-all duration-500 ${step > s ? 'bg-[#1BBBCD]' : 'bg-white/30'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col max-w-2xl mx-auto w-full animate-in fade-in duration-700">
      <StepIndicator />

      <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden relative group">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#38B1E4]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#024F86]/10 rounded-full blur-3xl" />

        {/* STEP 1: IDENTIFICAÇÃO */}
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <header className="mb-8">
              <h2 className="text-2xl font-black text-[#024F86] flex items-center gap-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <User className="text-[#38B1E4]" /> Identificação
              </h2>
              <p className="text-[#636E7C] text-[14px] mt-1">Conte-nos um pouco sobre você para começarmos.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <FieldLabel label="Nome Completo" icon={User} required error={errors.fullName} htmlFor="fullName" />
                <input 
                  id="fullName"
                  className={inputCls} 
                  placeholder="Ex: Maria Oliveira Santos"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel label="Data de Nascimento" icon={Calendar} required error={errors.birthDate} htmlFor="birthDate" />
                <input 
                  id="birthDate"
                  type="date" 
                  className={inputCls} 
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel label="Escolaridade" icon={GraduationCap} required error={errors.education} htmlFor="education" />
                <select id="education" className={inputCls} value={education} onChange={e => setEducation(e.target.value)}>
                  <option value="">Selecione...</option>
                  {EDUCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#024F86] uppercase tracking-tighter text-[14px]">Endereço de Residência</h3>
                <button 
                  onClick={() => setOutsideBrazil(!outsideBrazil)}
                  className="text-[12px] flex items-center gap-1.5 font-bold text-[#38B1E4] hover:underline"
                >
                  <Globe size={14} /> {outsideBrazil ? 'Moro no Brasil' : 'Moro no Exterior'}
                </button>
              </div>

              {!outsideBrazil ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <FieldLabel label="CEP" icon={Search} error={errors.zipCode} />
                    <div className="relative">
                      <input 
                        className={inputCls} 
                        placeholder="00000-000"
                        value={zipCode}
                        onChange={handleCEPChange}
                        maxLength={8}
                      />
                      {cepLoading && <Loader2 size={16} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#38B1E4]" />}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <FieldLabel label="UF" error={errors.state} />
                    <input className={inputCls} value={state} readOnly />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel label="Cidade" error={errors.city} />
                    <input className={inputCls} value={city} readOnly />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel label="Rua" error={errors.street} htmlFor="street" />
                    <input id="street" className={inputCls} value={street} onChange={e => setStreet(e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <FieldLabel label="Nº" error={errors.streetNumber} htmlFor="streetNumber" />
                    <input id="streetNumber" className={inputCls} value={streetNumber} onChange={e => setStreetNumber(e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <FieldLabel label="Compl." />
                    <input className={inputCls} value={complement} onChange={e => setComplement(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                    <FieldLabel label="País" icon={Globe} error={errors.country} />
                    <input className={inputCls} value={country} onChange={e => setCountry(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel label="Cidade" error={errors.city} />
                    <input className={inputCls} value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: DESEMPENHO & RENDA */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <header className="mb-8">
              <h2 className="text-2xl font-black text-[#024F86] flex items-center gap-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <Sparkles className="text-[#38B1E4]" /> Desempenho & Renda
              </h2>
              <p className="text-[#636E7C] text-[14px] mt-1">Esses dados são cruciais para o cálculo do seu Match.</p>
            </header>

            <div className="bg-[#E0F2FE]/30 rounded-2xl p-5 border border-[#38B1E4]/20">
              <h3 className="font-bold text-[#024F86] mb-4 flex items-center gap-2 uppercase text-[13px]">
                <GraduationCap size={16} /> Resultados do ENEM
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {enemScore ? (
                  <div className="col-span-2 md:col-span-1 animate-in zoom-in-95 duration-300">
                    <FieldLabel label="Média Geral Calculada" icon={CheckCircle} />
                    <div className="bg-white/80 border-2 border-[#38B1E4] rounded-xl px-4 py-2 flex items-center justify-center text-[#024F86] font-black text-[22px] shadow-sm">
                      {enemScore}
                    </div>
                  </div>
                ) : (
                  <div className="col-span-2 md:col-span-1">
                    <FieldLabel label="Média Geral" required error={errors.enemScore} />
                    <div className="bg-white/40 border border-dashed border-gray-300 rounded-xl px-4 py-2.5 text-[12px] text-gray-400 flex items-center justify-center text-center">
                      Preencha as 5 notas abaixo para calcular
                    </div>
                  </div>
                )}
                
                <div>
                  <FieldLabel label="Ano" />
                  <select className={inputCls} value={enemYear} onChange={e => setEnemYear(e.target.value)}>
                    {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                
                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                  {[
                    { label: 'Ling.', val: notaLing, set: setNotaLing },
                    { label: 'Humanas', val: notaHum, set: setNotaHum },
                    { label: 'Natureza', val: notaNat, set: setNotaNat },
                    { label: 'Matem.', val: notaMat, set: setNotaMat },
                    { label: 'Redação', val: notaRed, set: setNotaRed },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-[10px] font-bold text-[#636E7C] mb-1 block uppercase">{f.label}</label>
                      <input 
                        type="number" 
                        className="w-full bg-white/60 border border-white/80 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#38B1E4] transition-all" 
                        placeholder="0.0"
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100">
               <h3 className="font-bold text-[#024F86] mb-4 flex items-center justify-between gap-2 uppercase text-[13px]">
                <div className="flex items-center gap-2"><DollarSign size={16} /> Renda Per Capita</div>
              </h3>

              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Nº de Familiares" icon={Users} />
                    <input type="number" className={inputCls} placeholder="Ex: 4" value={familyCount} onChange={e => handleFamilyCountChange(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel label="Benefícios (Bruto)" icon={DollarSign} />
                    <input type="number" className={inputCls} placeholder="R$ 0,00" value={socialBenefits} onChange={e => setSocialBenefits(e.target.value)} />
                  </div>
                </div>
                
                {memberIncomes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#636E7C] uppercase">Rendas Individuais</label>
                    <div className="grid grid-cols-3 gap-2">
                      {memberIncomes.map((inc, i) => (
                        <input 
                          key={i} 
                          type="number" 
                          placeholder={`Pessoa ${i+1}`}
                          className="bg-white border rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#38B1E4]" 
                          value={inc}
                          onChange={e => {
                            const arr = [...memberIncomes];
                            arr[i] = e.target.value;
                            setMemberIncomes(arr);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {familyCount && perCapitaIncome > 0 && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#024F86] to-[#38B1E4] rounded-2xl text-white shadow-lg animate-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold opacity-80 uppercase">Renda Per Capita Calculada</span>
                      <span className="text-[20px] font-black">{formatCurrency(perCapitaIncome)}</span>
                    </div>
                    <CheckCircle size={24} className="opacity-40" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INTERESSES & FILTROS */}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <header className="mb-8">
              <h2 className="text-2xl font-black text-[#024F86] flex items-center gap-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <BookOpen className="text-[#38B1E4]" /> Interesses & Filtros
              </h2>
              <p className="text-[#636E7C] text-[14px] mt-1">Finalize com suas preferências de estudo.</p>
            </header>

            <div className="space-y-5">
              {/* Cursos */}
              <div>
                <FieldLabel label="Cursos de Interesse" icon={Search} />
                <div className="flex gap-2">
                  <input 
                    className={`${inputCls} flex-1`} 
                    placeholder="Ex: Medicina, TI..."
                    value={courseInput}
                    onChange={e => setCourseInput(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter') { 
                      const t = courseInput.trim();
                      if(t && !courseInterest.includes(t)) setCourseInterest([...courseInterest, t]);
                      setCourseInput('');
                    }}}
                  />
                  <button 
                    onClick={() => {
                      const t = courseInput.trim();
                      if(t && !courseInterest.includes(t)) setCourseInterest([...courseInterest, t]);
                      setCourseInput('');
                    }}
                    className="bg-[#38B1E4] text-white px-4 rounded-xl font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {courseInterest.map(c => (
                    <span key={c} className="bg-[#E0F2FE] text-[#024F86] px-3 py-1 rounded-full text-[12px] font-bold flex items-center gap-2">
                      {c} <X size={12} className="cursor-pointer" onClick={() => setCourseInterest(courseInterest.filter(x => x !== c))} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Filtros Rápidos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/20">
                <div>
                  <FieldLabel label="Turnos Preferidos" icon={Briefcase} />
                  <div className="flex flex-wrap gap-2">
                    {SHIFTS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          if (shifts.includes(s)) setShifts(shifts.filter(x => x !== s));
                          else setShifts([...shifts, s]);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                          shifts.includes(s) ? 'bg-[#38B1E4] text-white border-[#38B1E4]' : 'bg-white/40 text-[#636E7C] border-white/60'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel label="Programa / Univ." icon={Building} />
                  <div className="flex flex-col gap-2">
                    <select className={inputCls} value={programPref} onChange={e => setProgramPref(e.target.value)}>
                      {PROGRAM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className={inputCls} value={universityPref} onChange={e => setUniversityPref(e.target.value)}>
                      {UNIVERSITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Cotas */}
              <div className="pt-4 border-t border-white/20">
                <FieldLabel label="Modalidades de Cota" icon={Users} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {QUOTA_OPTIONS.map(q => (
                    <label key={q.id} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${quotaTypes.includes(q.id) ? 'bg-[#E0F2FE] border-[#38B1E4]/50' : 'bg-white/30 border-transparent'}`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-[#38B1E4]"
                        checked={quotaTypes.includes(q.id)}
                        onChange={() => {
                          if (quotaTypes.includes(q.id)) setQuotaTypes(quotaTypes.filter(x => x !== q.id));
                          else setQuotaTypes([...quotaTypes, q.id]);
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-[#3A424E]">{q.label}</span>
                        <span className="text-[10px] text-[#636E7C] leading-tight">{q.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Error */}
        {globalError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-[13px] animate-in slide-in-from-bottom-2">
            <AlertCircle size={20} /> {globalError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mt-10">
          {step > 1 && (
            <button 
              onClick={prevStep}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[15px] font-bold text-[#636E7C] bg-white/40 border border-white/60 hover:bg-white/60 transition-all"
            >
              <ChevronLeft size={20} /> Voltar
            </button>
          )}
          
          {step < 3 ? (
            <button 
              onClick={nextStep}
              className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[15px] font-bold text-white bg-[#38B1E4] shadow-[0_10px_20px_rgba(56,177,228,0.3)] hover:shadow-[0_15px_25px_rgba(56,177,228,0.4)] transition-all active:scale-[0.98]"
            >
              Continuar <ChevronRight size={20} />
            </button>
          ) : (
            <button 
              onClick={handleFinalSubmit}
              disabled={loading}
              className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[15px] font-bold text-white bg-gradient-to-r from-[#1BBBCD] to-[#024F86] shadow-[0_10px_20px_rgba(2,79,134,0.3)] hover:shadow-[0_15px_25px_rgba(2,79,134,0.4)] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
              {loading ? 'Calculando seu Match...' : 'Finalizar e Ver Matches'}
            </button>
          )}
        </div>
      </div>

      <p className="text-center mt-6 text-[12px] text-[#636E7C]/60 font-medium">
        Seus dados estão protegidos e serão usados apenas para personalizar sua experiência.
      </p>
    </div>
  );
}
