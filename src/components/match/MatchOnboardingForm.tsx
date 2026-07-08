'use client';

// MatchOnboardingForm — Sprint 4.5 (BUG-004)
// Unified 3-step sequential onboarding flow.
// Step 1: Identificação (Profile + Address)
// Step 2: Desempenho & Renda (ENEM Scores + Income Calculator)
// Step 3: Interesses & Filtros (Course Interests + Match Filters)

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  User, MapPin, GraduationCap, Calendar, Search, Home, Hash, Building,
  AlertCircle, DollarSign, Users, Calculator, X, Globe, Loader2, Sparkles,
  ChevronRight, ChevronLeft, Check, BookOpen, Briefcase, Info, Mail, Phone,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  saveUserData, 
  saveUserIncome, 
  saveUserPreferences, 
  saveUserEnemScore,
  markOnboardingComplete,
  getUserOnboardingData
} from '@/services/profileService';
import { generateMatchAsync, getMatchStatus } from '@/services/matchService';
import { fetchAvailableCategories, type AvailableCategory } from '@/lib/availableCategories';

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

// Fallback estático caso o fetch de categorias disponíveis falhe
const STATIC_PROGRAM_OPTIONS = [
  { label: 'Sisu', value: 'sisu' },
  { label: 'Prouni', value: 'prouni' },
  { label: 'Programa de Bolsa', value: 'programa de bolsa' },
];

const QUOTA_OPTIONS = [
  { id: 'AMPLA_CONCORRENCIA', label: 'Ampla Concorrência', description: 'Vagas sem critérios específicos de cota.' },
  { id: 'ESCOLA_PUBLICA', label: 'Escola Pública', description: 'Para quem cursou todo o ensino médio em escola pública.' },
  { id: 'PPI', label: 'PPI (Pretos, Pardos e Indígenas)', description: 'Para estudantes autodeclarados pretos, pardos ou indígenas.' },
  { id: 'PCD', label: 'Pessoa com Deficiência (PCD)', description: 'Para pessoas com deficiência.' },
  { id: 'INDIGENAS', label: 'Indígenas', description: 'Para estudantes autodeclarados indígenas.' },
  { id: 'TRANS', label: 'Trans / Travesti', description: 'Para pessoas trans ou travestis.' },
  { id: 'QUILOMBOLAS', label: 'Quilombolas', description: 'Para estudantes pertencentes a comunidades quilombolas.' },
  { id: 'REFUGIADOS', label: 'Refugiados / Asilados', description: 'Para estudantes na condição de refugiados, apátridas ou asilados políticos.' },
  { id: 'MILITAR', label: 'Militar / Policial', description: 'Para integrantes ou dependentes de militares e forças de segurança.' },
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

type YearScores = { ling: string; hum: string; nat: string; mat: string; red: string };

const sendSystemIntent = (type: 'step_change' | 'validation_error', metadata: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cloudinha-intent', { detail: { intent_type: 'system_intent', type, metadata } }));
};

export default function MatchOnboardingForm({ userId, onComplete }: MatchOnboardingFormProps) {
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // System intent tracking
  const hasSentAddressIntent = useRef(false);
  const hasSentIncomeIntent = useRef(false);

  const triggerAddressIntent = () => {
    if (!hasSentAddressIntent.current) {
      hasSentAddressIntent.current = true;
      sendSystemIntent('step_change', {
        current_step: 2,
        step_name: 'Endereço',
        form_type: 'match_onboarding'
      });
    }
  };

  const triggerIncomeIntent = () => {
    if (!hasSentIncomeIntent.current) {
      hasSentIncomeIntent.current = true;
      sendSystemIntent('step_change', {
        current_step: 3,
        step_name: 'Renda Familiar',
        form_type: 'match_onboarding'
      });
    }
  };

  // Trigger step change intents
  useEffect(() => {
    if (isLoadingData) return;
    if (step === 1) {
      sendSystemIntent('step_change', {
        current_step: 1,
        step_name: 'Dados Pessoais',
        form_type: 'match_onboarding'
      });
    } else if (step === 2) {
      sendSystemIntent('step_change', {
        current_step: 4,
        step_name: 'Notas do ENEM',
        form_type: 'match_onboarding'
      });
    } else if (step === 3) {
      sendSystemIntent('step_change', {
        current_step: 5,
        step_name: 'Interesses e Filtros',
        form_type: 'match_onboarding'
      });
    }
  }, [step, isLoadingData]);

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
  // ENEM — scores keyed by year so each tab is independent
  const [enemYear, setEnemYear] = useState('2026');
  const [scoresByYear, setScoresByYear] = useState<Record<string, YearScores>>({});
  const [treineiroPorAno, setTreineiroPorAno] = useState<Record<string, boolean>>({});

  const currentScores: YearScores = scoresByYear[enemYear] ?? { ling: '', hum: '', nat: '', mat: '', red: '' };
  const [enemScoreError, setEnemScoreError] = useState<string | null>(null);
  const updateScore = (field: keyof YearScores, val: string) => {
    // Allow empty string for clearing
    if (val === '') {
      setEnemScoreError(null);
      setScoresByYear(prev => ({ ...prev, [enemYear]: { ...currentScores, [field]: '' } }));
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num > 1000) {
      setEnemScoreError(`A nota de cada área do ENEM varia entre 0 e 1000 pontos.`);
      sendSystemIntent('validation_error', {
        field: `Nota do ENEM (${field})`,
        error_message: `O valor ${val} excede o máximo de 1000 pontos. As notas do ENEM variam de 0 a 1000 por área de conhecimento.`,
        form_type: 'match_onboarding'
      });
      return;
    }
    if (!isNaN(num) && num < 0) {
      setEnemScoreError(`A nota não pode ser negativa.`);
      return;
    }
    setEnemScoreError(null);
    setScoresByYear(prev => ({ ...prev, [enemYear]: { ...currentScores, [field]: val } }));
  };

  // Income Calculator
  const [useCalculator, setUseCalculator] = useState(true);
  const [familyCount, setFamilyCount] = useState('');
  const [socialBenefits, setSocialBenefits] = useState('');
  const [alimony, setAlimony] = useState('');
  const [memberIncomes, setMemberIncomes] = useState<string[]>([]);
  const [manualPerCapita, setManualPerCapita] = useState<number | null>(null);


  // ── Step 3 State (Interesses & Filtros) ────────────────────────────────────
  const [courseInput, setCourseInput] = useState('');
  const [courseInterest, setCourseInterest] = useState<string[]>([]);
  const [quotaTypes, setQuotaTypes] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [programPref, setProgramPref] = useState('indiferente');
  const [universityPref, setUniversityPref] = useState('indiferente');
  const [locationPref, setLocationPref] = useState('');
  const [statePref, setStatePref] = useState('');

  // ── Course Autocomplete ────────────────────────────────────────────────────
  const [courseResults, setCourseResults] = useState<string[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);
  const courseInputRef = useRef<HTMLDivElement>(null);

  // ── Programas disponíveis (apenas ciclos ativos no catálogo; ordem Sisu > Prouni > parceiros) ──
  const [programOptions, setProgramOptions] = useState<{ label: string; value: string }[]>(STATIC_PROGRAM_OPTIONS);

  useEffect(() => {
    let cancelled = false;
    fetchAvailableCategories()
      .then((cats: AvailableCategory[]) => {
        if (!cancelled && cats.length > 0) {
          setProgramOptions(cats.map(c => ({ label: c.label, value: c.value })));
        }
      })
      .catch(() => { /* mantém fallback estático */ });
    return () => { cancelled = true; };
  }, []);

  // ── City Autocomplete (tabela cities, filtrada pela UF selecionada) ────────
  const [cityResults, setCityResults] = useState<{ name: string; state: string }[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const cityInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locationPref.length < 2 || !showCitySuggestions) {
      setCityResults([]);
      return;
    }
    setCitiesLoading(true);
    const timer = setTimeout(async () => {
      let q = supabase
        .from('cities')
        .select('name, state')
        .ilike('name', `%${locationPref}%`)
        .order('name')
        .limit(8);
      if (statePref) q = q.eq('state', statePref);
      const { data } = await q;
      setCityResults((data || []) as { name: string; state: string }[]);
      setCitiesLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationPref, statePref, showCitySuggestions]);

  // Close city dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(e.target as Node)) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);


  // Course search debounce
  useEffect(() => {
    if (courseInput.length < 2) {
      setCourseResults([]);
      setShowCourseSuggestions(false);
      return;
    }
    setCoursesLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('courses')
        .select('course_name')
        .ilike('course_name', `%${courseInput}%`)
        .limit(10);
      const names = [...new Set((data || []).map((r: any) => r.course_name).filter(Boolean))] as string[];
      setCourseResults(names);
      setShowCourseSuggestions(names.length > 0);
      setCoursesLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [courseInput]);

  // Close course dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (courseInputRef.current && !courseInputRef.current.contains(e.target as Node)) {
        setShowCourseSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Load Existing User Data ────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingData(true);
        const data = await getUserOnboardingData(userId);
        
        if (data.profile) {
          setFullName(data.profile.full_name || '');
          setBirthDate(data.profile.birth_date || '');
          setCpf(data.profile.cpf || '');
          setEducation(data.profile.education || '');
          setEducationYear(data.profile.education_year || '');
          setOutsideBrazil(data.profile.outside_brazil || false);
          setZipCode(data.profile.zip_code || '');
          setCity(data.profile.city || '');
          setState(data.profile.state || '');
          setNeighborhood(data.profile.neighborhood || '');
          setStreet(data.profile.street || '');
          setStreetNumber(data.profile.street_number || '');
          setComplement(data.profile.complement || '');
          setCountry(data.profile.country || 'Brasil');
        }

        if (data.income) {
          setFamilyCount(data.income.family_count?.toString() || '');
          setSocialBenefits(data.income.social_benefits?.toString() || '');
          setAlimony(data.income.alimony?.toString() || '');
          if (data.income.member_incomes && data.income.member_incomes.length > 0) {
            setMemberIncomes(data.income.member_incomes.map((i: any) => i.toString()));
          }
          if (data.income.per_capita_income != null) {
            setManualPerCapita(data.income.per_capita_income);
            if (!data.income.member_incomes || data.income.member_incomes.length === 0) {
              setUseCalculator(false);
            }
          }
        }

        if (data.preferences) {
          if (data.preferences.course_interest && data.preferences.course_interest.length > 0) {
            setCourseInterest(data.preferences.course_interest);
          }
          if (data.preferences.quota_types && data.preferences.quota_types.length > 0) {
            setQuotaTypes(data.preferences.quota_types);
          }
          if (data.preferences.preferred_shifts && data.preferences.preferred_shifts.length > 0) {
            setShifts(data.preferences.preferred_shifts);
          }
          setProgramPref(data.preferences.program_preference || 'indiferente');
          setUniversityPref(data.preferences.university_preference || 'indiferente');
          setLocationPref(data.preferences.location_preference || '');
          setStatePref(data.preferences.state_preference || '');
        }

        if (data.enemScores && data.enemScores.length > 0) {
          const scores: Record<string, YearScores> = {};
          const treineiros: Record<string, boolean> = {};
          let latestYear = '2025';
          data.enemScores.forEach((s: any) => {
            scores[s.year.toString()] = {
              ling: s.nota_linguagens?.toString() || '',
              hum: s.nota_ciencias_humanas?.toString() || '',
              nat: s.nota_ciencias_natureza?.toString() || '',
              mat: s.nota_matematica?.toString() || '',
              red: s.nota_redacao?.toString() || ''
            };
            treineiros[s.year.toString()] = s.is_treineiro || false;
            if (s.year.toString() > latestYear) {
              latestYear = s.year.toString();
            }
          });
          setScoresByYear(scores);
          setTreineiroPorAno(treineiros);
          setEnemYear(latestYear);
        }
      } catch (err) {
        console.error('Error loading onboarding data:', err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, [userId]);

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
    const errorDetails: { field: string; error_message: string }[] = [];

    if (step === 1) {
      if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
        errs.fullName = true;
        errorDetails.push({ field: 'Nome Completo', error_message: 'Por favor, digite seu nome completo (nome e sobrenome).' });
      }
      if (!birthDate) {
        errs.birthDate = true;
        errorDetails.push({ field: 'Data de Nascimento', error_message: 'A data de nascimento é obrigatória.' });
      }
      if (!education) {
        errs.education = true;
        errorDetails.push({ field: 'Escolaridade', error_message: 'Selecione o seu nível de escolaridade.' });
      }
      const requiresYear = education === 'Ensino Fundamental' || education === 'Ensino Médio Incompleto' || education === 'Ensino Superior Incompleto';
      if (requiresYear && !educationYear) {
        errs.educationYear = true;
        const label = education === 'Ensino Superior Incompleto' ? 'Semestre' : 'Ano Escolar';
        errorDetails.push({ field: label, error_message: `Selecione o ${label} atual.` });
      }
      if (!outsideBrazil) {
        if (zipCode.length < 8) {
          errs.zipCode = true;
          errorDetails.push({ field: 'CEP', error_message: 'O CEP informado é inválido ou está incompleto.' });
        }
        if (!city) {
          errs.city = true;
          errorDetails.push({ field: 'Cidade', error_message: 'A cidade é obrigatória no endereço.' });
        }
        if (!state) {
          errs.state = true;
          errorDetails.push({ field: 'UF', error_message: 'O estado (UF) é obrigatório.' });
        }
        if (!street) {
          errs.street = true;
          errorDetails.push({ field: 'Rua', error_message: 'O nome da rua é obrigatório.' });
        }
        if (!streetNumber) {
          errs.streetNumber = true;
          errorDetails.push({ field: 'Número', error_message: 'O número da residência é obrigatório.' });
        }
      } else {
        if (!country) {
          errs.country = true;
          errorDetails.push({ field: 'País', error_message: 'O país de residência é obrigatório.' });
        }
        if (!city) {
          errs.city = true;
          errorDetails.push({ field: 'Cidade', error_message: 'A cidade é obrigatória no endereço.' });
        }
      }
    } else if (step === 2) {
      const hasAnyScore = Object.values(scoresByYear).some(s =>
        [s.ling, s.hum, s.nat, s.mat, s.red].some(v => v !== '')
      );
      if (!hasAnyScore) {
        errs.enemScore = true;
        errorDetails.push({ field: 'Notas do ENEM', error_message: 'Por favor, insira pelo menos uma nota do ENEM para que possamos calcular seu match.' });
      }

      // Validate ENEM score range (0-1000)
      for (const [year, scores] of Object.entries(scoresByYear)) {
        const fields = { ling: 'Linguagens', hum: 'Humanas', nat: 'Natureza', mat: 'Matemática', red: 'Redação' } as const;
        for (const [key, label] of Object.entries(fields)) {
          const val = parseFloat(scores[key as keyof YearScores]);
          if (!isNaN(val) && (val < 0 || val > 1000)) {
            errs.enemScore = true;
            errorDetails.push({ field: `Nota ${label} (${year})`, error_message: `A nota de ${label} deve estar entre 0 e 1000 pontos. Valor informado: ${val}.` });
          }
        }
      }
      
      // Income is mandatory
      const isIncomeFilled = useCalculator 
        ? (familyCount && parseInt(familyCount) > 0)
        : (manualPerCapita !== null);
        
      if (!isIncomeFilled) {
        errs.income = true;
        errorDetails.push({ field: 'Renda Per Capita', error_message: 'A informação de renda familiar é obrigatória.' });
      }
    }

    setErrors(errs);

    if (errorDetails.length > 0) {
      sendSystemIntent('validation_error', {
        field: errorDetails[0].field,
        error_message: errorDetails[0].error_message,
        form_type: 'match_onboarding'
      });
    }

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
        cpf: cpf || null,
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

      // 3. Save ENEM Scores for each year that has data
      await Promise.allSettled(
        Object.entries(scoresByYear)
          .filter(([, s]) => [s.ling, s.hum, s.nat, s.mat, s.red].some(v => v !== ''))
          .map(([year, s]) =>
            saveUserEnemScore(userId, {
              year: parseInt(year),
              nota_linguagens: parseFloat(s.ling) || null,
              nota_ciencias_humanas: parseFloat(s.hum) || null,
              nota_ciencias_natureza: parseFloat(s.nat) || null,
              nota_matematica: parseFloat(s.mat) || null,
              nota_redacao: parseFloat(s.red) || null,
              is_treineiro: treineiroPorAno[year] ?? false,
            })
          )
      );

      // Best average across all filled years (for preferences)
      const bestEnemScore = Object.values(scoresByYear).reduce((best, s) => {
        const vals = [s.ling, s.hum, s.nat, s.mat, s.red].map(parseFloat).filter(n => !isNaN(n));
        if (vals.length === 5) {
          const avg = vals.reduce((a, b) => a + b, 0) / 5;
          return avg > best ? avg : best;
        }
        return best;
      }, 0);

      // Get cached location if present
      let cachedLat: number | null = null;
      let cachedLng: number | null = null;
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('nubo_user_location');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
              cachedLat = parsed.lat;
              cachedLng = parsed.lng;
            }
          } catch (e) {
            // ignore malformed cache
          }
        }
      }

      // 4. Save Preferences
      await saveUserPreferences(userId, {
        enem_score: bestEnemScore,
        family_income_per_capita: perCapitaIncome,
        course_interest: courseInterest.length > 0 ? courseInterest : null,
        quota_types: quotaTypes.length > 0 ? quotaTypes : null,
        preferred_shifts: shifts.length > 0 ? shifts : null,
        program_preference: programPref,
        university_preference: universityPref,
        location_preference: locationPref || null,
        state_preference: statePref || null,
        device_latitude: cachedLat,
        device_longitude: cachedLng,
      });

      // 5. Generate Match and Complete (Async Flow)
      await generateMatchAsync();
      
      // Polling for completion
      let status = await getMatchStatus(userId);
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

  if (isLoadingData) {
    return (
      <div className="flex flex-col max-w-2xl mx-auto w-full items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#38B1E4] mb-4" size={48} />
        <p className="text-[#636E7C] font-semibold animate-pulse">Carregando seus dados...</p>
      </div>
    );
  }

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
                <FieldLabel label="CPF (Opcional)" icon={Hash} htmlFor="cpf" />
                <input 
                  id="cpf"
                  className={inputCls} 
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel label="Escolaridade" icon={GraduationCap} required error={errors.education} htmlFor="education" />
                <select id="education" className={inputCls} value={education} onChange={e => { setEducation(e.target.value); setEducationYear(''); }}>
                  <option value="">Selecione...</option>
                  {EDUCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              {(education === 'Ensino Fundamental' || education === 'Ensino Médio Incompleto') && (
                <div className="md:col-span-2">
                  <FieldLabel label="Ano Escolar" icon={GraduationCap} required error={errors.educationYear} htmlFor="educationYear" />
                  <select id="educationYear" className={inputCls} value={educationYear} onChange={e => setEducationYear(e.target.value)}>
                    <option value="">Selecione o ano...</option>
                    {['1º Ano','2º Ano','3º Ano','4º Ano','5º Ano','6º Ano','7º Ano','8º Ano','9º Ano'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              )}
              {education === 'Ensino Superior Incompleto' && (
                <div className="md:col-span-2">
                  <FieldLabel label="Semestre" icon={GraduationCap} required error={errors.educationYear} htmlFor="educationYear" />
                  <select id="educationYear" className={inputCls} value={educationYear} onChange={e => setEducationYear(e.target.value)}>
                    <option value="">Selecione o semestre...</option>
                    {['1º Semestre','2º Semestre','3º Semestre','4º Semestre','5º Semestre','6º Semestre','7º Semestre','8º Semestre','9º Semestre','10º Semestre'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              )}
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
                        onFocus={triggerAddressIntent}
                        maxLength={8}
                      />
                      {cepLoading && <Loader2 size={16} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#38B1E4]" />}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <FieldLabel label="UF" error={errors.state} />
                    <input className={inputCls} value={state} readOnly onFocus={triggerAddressIntent} />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel label="Cidade" error={errors.city} />
                    <input className={inputCls} value={city} readOnly onFocus={triggerAddressIntent} />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel label="Rua" error={errors.street} htmlFor="street" />
                    <input id="street" className={inputCls} value={street} onChange={e => setStreet(e.target.value)} onFocus={triggerAddressIntent} />
                  </div>
                  <div className="col-span-1">
                    <FieldLabel label="Nº" error={errors.streetNumber} htmlFor="streetNumber" />
                    <input id="streetNumber" className={inputCls} value={streetNumber} onChange={e => setStreetNumber(e.target.value)} onFocus={triggerAddressIntent} />
                  </div>
                  <div className="col-span-1">
                    <FieldLabel label="Compl." />
                    <input className={inputCls} value={complement} onChange={e => setComplement(e.target.value)} onFocus={triggerAddressIntent} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                    <FieldLabel label="País" icon={Globe} error={errors.country} />
                    <input className={inputCls} value={country} onChange={e => setCountry(e.target.value)} onFocus={triggerAddressIntent} />
                  </div>
                  <div>
                    <FieldLabel label="Cidade" error={errors.city} />
                    <input className={inputCls} value={city} onChange={e => setCity(e.target.value)} onFocus={triggerAddressIntent} />
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
              <div className="space-y-4">
                <div>
                  <FieldLabel label="Ano" />
                  <div className="flex gap-2">
                    {[2026, 2025, 2024, 2023].map(y => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setEnemYear(y.toString())}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-all ${
                          enemYear === y.toString()
                            ? 'bg-[#38B1E4] text-white border-[#38B1E4] shadow-[0_4px_12px_rgba(56,177,228,0.3)]'
                            : 'bg-white/40 text-[#636E7C] border-white/60 hover:bg-white/60'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {enemYear === '2026' && (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      checked={treineiroPorAno[enemYear] ?? false}
                      onChange={e => {
                        setTreineiroPorAno(prev => ({
                          ...prev,
                          [enemYear]: e.target.checked
                        }));
                      }}
                      className="w-4 h-4 accent-[#38B1E4] rounded cursor-pointer"
                    />
                    <span className="text-[13px] font-semibold text-[#024F86]">
                      Nota de Treineiro / Simulado
                    </span>
                  </label>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {([
                    { label: 'Ling.', field: 'ling' },
                    { label: 'Humanas', field: 'hum' },
                    { label: 'Natureza', field: 'nat' },
                    { label: 'Matem.', field: 'mat' },
                    { label: 'Redação', field: 'red' },
                  ] as { label: string; field: keyof YearScores }[]).map(f => (
                    <div key={f.field}>
                      <label className="text-[10px] font-bold text-[#636E7C] mb-1 block uppercase">{f.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        className={`w-full bg-white/60 border rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#38B1E4] transition-all ${
                          currentScores[f.field] && (parseFloat(currentScores[f.field]) > 1000 || parseFloat(currentScores[f.field]) < 0)
                            ? 'border-red-400 bg-red-50/50'
                            : 'border-white/80'
                        }`}
                        placeholder="0-1000"
                        value={currentScores[f.field]}
                        onChange={e => updateScore(f.field, e.target.value)}
                      />
                      {currentScores[f.field] && parseFloat(currentScores[f.field]) > 1000 && (
                        <span className="text-[9px] text-red-500 mt-0.5 block">Máx: 1000</span>
                      )}
                    </div>
                  ))}
                </div>
                {enemScoreError && (
                  <div className="mt-3 flex items-center gap-2 text-red-500 text-[12px] bg-red-50/80 rounded-lg px-3 py-2 border border-red-200">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{enemScoreError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100">
               <h3 className="font-bold text-[#024F86] mb-4 flex items-center justify-between gap-2 uppercase text-[13px]">
                <div className="flex items-center gap-2"><DollarSign size={16} /> Renda Per Capita</div>
              </h3>

              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Nº de Familiares" icon={Users} required error={errors.income} />
                    <input type="number" className={`${inputCls} ${errors.income ? 'border-red-500' : ''}`} placeholder="Ex: 1" value={familyCount} onChange={e => { handleFamilyCountChange(e.target.value); if (errors.income) setErrors(prev => ({ ...prev, income: false })); }} onFocus={triggerIncomeIntent} />
                  </div>
                  <div>
                    <FieldLabel label="Benefícios (Bruto)" icon={DollarSign} />
                    <input type="number" className={inputCls} placeholder="R$ 0,00" value={socialBenefits} onChange={e => setSocialBenefits(e.target.value)} onFocus={triggerIncomeIntent} />
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
                          onFocus={triggerIncomeIntent}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {familyCount && perCapitaIncome !== null && perCapitaIncome > 0 && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#024F86] to-[#38B1E4] rounded-2xl text-white shadow-lg animate-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold opacity-80 uppercase">Renda Per Capita Calculada</span>
                      <span className="text-[20px] font-black">{formatCurrency(perCapitaIncome || 0)}</span>
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
                <div ref={courseInputRef} className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        className={`${inputCls} pr-8`}
                        placeholder="Digite para buscar (ex: Medicina)..."
                        value={courseInput}
                        onChange={e => { setCourseInput(e.target.value); setShowCourseSuggestions(true); }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const t = courseInput.trim();
                            if (t && !courseInterest.includes(t)) setCourseInterest([...courseInterest, t]);
                            setCourseInput('');
                            setShowCourseSuggestions(false);
                          }
                        }}
                        onFocus={() => courseInput.length >= 2 && setShowCourseSuggestions(true)}
                      />
                      {coursesLoading && (
                        <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#38B1E4]" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const t = courseInput.trim();
                        if (t && !courseInterest.includes(t)) setCourseInterest([...courseInterest, t]);
                        setCourseInput('');
                        setShowCourseSuggestions(false);
                      }}
                      className="bg-[#38B1E4] text-white px-4 rounded-xl font-bold"
                    >
                      +
                    </button>
                  </div>

                  {showCourseSuggestions && courseResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-12 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-56 overflow-y-auto">
                      {courseResults.map(name => (
                        <button
                          key={name}
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-[13px] text-[#3A424E] hover:bg-[#E0F2FE] transition-colors"
                          onMouseDown={e => {
                            e.preventDefault();
                            if (!courseInterest.includes(name)) setCourseInterest([...courseInterest, name]);
                            setCourseInput('');
                            setShowCourseSuggestions(false);
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
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
                  <FieldLabel label="Programa" icon={Building} />
                  <select className={inputCls} value={programPref} onChange={e => setProgramPref(e.target.value)}>
                    <option value="indiferente">Indiferente</option>
                    {programOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Localização de Preferência */}
              <div className="pt-4 border-t border-white/20">
                <FieldLabel label="Localização de Preferência" icon={MapPin} />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className={inputCls}
                    value={statePref}
                    onChange={e => { setStatePref(e.target.value); setLocationPref(''); setCityResults([]); }}
                  >
                    <option value="">UF (qualquer)</option>
                    {STATES_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                  <div ref={cityInputRef} className="relative">
                    <input
                      className={inputCls}
                      placeholder="Cidade (opcional)"
                      value={locationPref}
                      onChange={e => { setLocationPref(e.target.value); setShowCitySuggestions(true); }}
                      onFocus={() => locationPref.length >= 2 && setShowCitySuggestions(true)}
                    />
                    {citiesLoading && (
                      <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#38B1E4]" />
                    )}
                    {showCitySuggestions && cityResults.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-56 overflow-y-auto">
                        {cityResults.map(c => (
                          <button
                            key={`${c.name}-${c.state}`}
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-[13px] text-[#3A424E] hover:bg-[#E0F2FE] transition-colors"
                            onMouseDown={e => {
                              e.preventDefault();
                              setLocationPref(c.name);
                              if (!statePref) setStatePref(c.state);
                              setShowCitySuggestions(false);
                            }}
                          >
                            {c.name}{!statePref ? ` — ${c.state}` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[#636E7C] mt-1.5">Usamos para priorizar oportunidades perto de você no cálculo do Match.</p>
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
