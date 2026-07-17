'use client';

import { useState, useMemo, useEffect } from 'react';
import { DollarSign, Users, CheckCircle, AlertCircle, Calculator } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const SALARIO_MINIMO = 1518.00;

export interface IncomeCalculatorValue {
    family_count: number | null;
    social_benefits: number;
    alimony: number;
    member_incomes: number[];
    per_capita_income: number;
}

interface IncomeCalculatorFieldProps {
    /** Called whenever the calculated value changes. Receives per_capita_income as a number string for form compatibility. */
    onChange: (value: string) => void;
    /** Initial serialized value (JSON string or plain number string) */
    value?: string;
    hasError?: boolean;
    required?: boolean;
    label?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function parseInitialValue(value?: string): Partial<IncomeCalculatorValue> {
    if (!value) return {};
    try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
        if (typeof parsed === 'number') return { per_capita_income: parsed };
    } catch {
        const num = parseFloat(value);
        if (!isNaN(num)) return { per_capita_income: num };
    }
    return {};
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function IncomeCalculatorField({
    onChange,
    value,
    hasError,
    required,
    label,
}: IncomeCalculatorFieldProps) {
    const initial = parseInitialValue(value);

    const [familyCount, setFamilyCount] = useState(initial.family_count?.toString() ?? '');
    const [socialBenefits, setSocialBenefits] = useState(initial.social_benefits?.toString() ?? '');
    const [alimony, setAlimony] = useState(initial.alimony?.toString() ?? '');
    const [memberIncomes, setMemberIncomes] = useState<string[]>(
        initial.member_incomes?.map(String) ?? []
    );

    // ── Derived per capita ────────────────────────────────────────────────────
    const perCapitaIncome = useMemo(() => {
        const count = parseInt(familyCount) || 0;
        const incomesTotal = memberIncomes
            .map(i => parseFloat(i.replace(',', '.')))
            .filter(n => !isNaN(n))
            .reduce((a, b) => a + b, 0);
        const benefits = parseFloat(socialBenefits.replace(',', '.')) || 0;
        const alim = parseFloat(alimony.replace(',', '.')) || 0;
        return count > 0 ? (incomesTotal + benefits + alim) / count : 0;
    }, [familyCount, memberIncomes, socialBenefits, alimony]);

    const smFraction = SALARIO_MINIMO > 0 ? perCapitaIncome / SALARIO_MINIMO : 0;

    // Notify parent on change
    useEffect(() => {
        const count = parseInt(familyCount) || 0;
        if (count > 0) {
            const fullValue: IncomeCalculatorValue = {
                family_count: count,
                social_benefits: parseFloat(socialBenefits) || 0,
                alimony: parseFloat(alimony) || 0,
                member_incomes: memberIncomes.map(i => parseFloat(i) || 0),
                per_capita_income: perCapitaIncome,
            };
            // Serialize as JSON so the form captures all data; the per_capita field is the primary criterion value
            onChange(JSON.stringify(fullValue));
        }
    }, [familyCount, socialBenefits, alimony, memberIncomes, perCapitaIncome]);

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

    const borderCls = hasError
        ? 'border-red-400 ring-2 ring-red-100'
        : 'border-gray-200 focus-within:border-[#38B1E4] focus-within:ring-2 focus-within:ring-[#38B1E4]/20';

    const inputCls = `w-full outline-none bg-white/60 text-[#3A424E] text-sm py-2 px-3 rounded-xl border-2 border-gray-200
        focus:border-[#38B1E4] focus:ring-2 focus:ring-[#38B1E4]/20 transition-all duration-200`;

    return (
        <div className={`relative rounded-2xl border-2 bg-white/60 backdrop-blur-sm p-4 space-y-4 transition-all duration-200 ${borderCls}`}>
            {/* Header */}
            <div className="flex items-center gap-2">
                <Calculator size={16} className="text-[#024F86] shrink-0" />
                <span className="text-sm font-bold text-[#024F86] uppercase tracking-wide">
                    {label ?? 'Calculadora de Renda Per Capita'}
                </span>
                {required && <span className="text-red-400 text-sm">*</span>}
            </div>

            {/* Nº de familiares + Benefícios */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-[#636E7C] uppercase">
                        <Users size={11} /> Nº de Pessoas na Família
                        {required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={20}
                        className={inputCls + (hasError && !familyCount ? ' border-red-400 ring-2 ring-red-100' : '')}
                        placeholder="Ex: 3"
                        value={familyCount}
                        onChange={e => handleFamilyCountChange(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-[#636E7C] uppercase">
                        <DollarSign size={11} /> Benefícios (Bruto)
                    </label>
                    <input
                        type="number"
                        min={0}
                        className={inputCls}
                        placeholder="R$ 0,00"
                        value={socialBenefits}
                        onChange={e => setSocialBenefits(e.target.value)}
                    />
                </div>
            </div>

            {/* Pensão alimentícia (alimony) */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#636E7C] uppercase">
                    Pensão Alimentícia / Outros rendimentos
                </label>
                <input
                    type="number"
                    min={0}
                    className={inputCls}
                    placeholder="R$ 0,00"
                    value={alimony}
                    onChange={e => setAlimony(e.target.value)}
                />
            </div>

            {/* Member incomes — rendered when familyCount is filled */}
            {memberIncomes.length > 0 && (
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#636E7C] uppercase">
                        Renda Individual de Cada Membro
                    </label>
                    <div className={`grid gap-2 ${memberIncomes.length <= 2 ? 'grid-cols-2' : memberIncomes.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                        {memberIncomes.map((inc, i) => (
                            <div key={i} className="space-y-0.5">
                                <span className="text-[10px] text-[#636E7C]">Pessoa {i + 1}</span>
                                <input
                                    type="number"
                                    min={0}
                                    placeholder="R$ 0,00"
                                    className="w-full bg-white border-2 border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#38B1E4] transition-colors"
                                    value={inc}
                                    onChange={e => {
                                        const arr = [...memberIncomes];
                                        arr[i] = e.target.value;
                                        setMemberIncomes(arr);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Result card */}
            {familyCount && perCapitaIncome > 0 && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#024F86] to-[#38B1E4] rounded-2xl text-white shadow-lg animate-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold opacity-80 uppercase">Renda Per Capita Calculada</span>
                        <span className="text-xl font-black">{formatCurrency(perCapitaIncome)}</span>
                        <span className="text-[10px] opacity-70">
                            ≈ {smFraction.toFixed(2)} salário(s) mínimo(s)
                        </span>
                    </div>
                    <CheckCircle size={24} className="opacity-40 shrink-0" />
                </div>
            )}

            {/* Error hint */}
            {hasError && !familyCount && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Informe o número de pessoas na família para calcular a renda.
                </p>
            )}
        </div>
    );
}
