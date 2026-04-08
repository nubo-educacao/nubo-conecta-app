"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const COUNTRIES = [
  { code: 'BR', name: 'Brasil', dialCode: '+55', mask: '(DD) 99999-9999', flag: '🇧🇷' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', mask: '123 456 789', flag: '🇵🇹' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', mask: '(DDD) 123-4567', flag: '🇺🇸' },
  { code: 'ES', name: 'Espanha', dialCode: '+34', mask: '123 456 789', flag: '🇪🇸' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', mask: '11 1234-5678', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', mask: '9 1234 5678', flag: '🇨🇱' },
  { code: 'CO', name: 'Colômbia', dialCode: '+57', mask: '312 345-6789', flag: '🇨🇴' },
  { code: 'MX', name: 'México', dialCode: '+52', mask: '12 3456 7890', flag: '🇲🇽' },
  { code: 'CA', name: 'Canadá', dialCode: '+1', mask: '(DDD) 123-4567', flag: '🇨🇦' },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', mask: '1234 567890', flag: '🇬🇧' },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', mask: '123 456789', flag: '🇩🇪' },
  { code: 'FR', name: 'França', dialCode: '+33', mask: '06 12 34 56 78', flag: '🇫🇷' },
  { code: 'IT', name: 'Itália', dialCode: '+39', mask: '312 345 6789', flag: '🇮🇹' },
];

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const formatPhone = (value: string, countryCode: string) => {
    const numbers = value.replace(/\D/g, '');

    if (countryCode === 'BR') {
      const limited = numbers.slice(0, 11);
      if (limited.length <= 2) return limited;
      if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
    
    if (countryCode === 'US' || countryCode === 'CA') {
      const limited = numbers.slice(0, 10);
      if (limited.length <= 3) return limited;
      if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
    
    return numbers.slice(0, 15);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value, selectedCountry.code));
    setError(null);
  };

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
    setSelectedCountry(country);
    setPhone('');
    setError(null);
  };

  const handleSendCode = async () => {
    if (!acceptedTerms) {
      setError('Você precisa aceitar os termos para continuar.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = `${selectedCountry.dialCode}${cleanPhone}`;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;
      setStep('OTP');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao enviar código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otp.length !== 6) {
      setError('O código deve ter 6 dígitos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = `${selectedCountry.dialCode}${cleanPhone}`;

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms', // Padrão WhatsApp OTP verificado via SMS type no Supabase
      });

      if (error) throw error;
      // AuthContext will handle closing the modal
    } catch (err: any) {
      console.error(err);
      setError('Código inválido ou expirado. Verifique e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Hybrid Modal Card - Bottom Sheet on Mobile, Centered Modal on Desktop */}
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className={cn(
          "relative w-full sm:max-w-[342px] bg-white shadow-2xl transform transition-all",
          "rounded-t-[32px] sm:rounded-[24px]", // Mobile sheet corners vs Desktop modal corners
          "p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-6" // Safe area adjustments for iOS
        )}
      >
        {/* Mobile Drag Indicator / Decorator */}
        <div className="w-full flex justify-center mb-6 sm:hidden">
          <div className="w-12 h-1.5 bg-nubo-line rounded-full" />
        </div>

        {/* Close Button - Desktop Only (Mobile uses swipe down conceptually or tap outside) */}
        <button
          onClick={onClose}
          className="hidden sm:block absolute top-6 right-6 text-nubo-nav-inactive hover:text-nubo-text-head transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <h2 className="font-sans font-bold text-[18px] leading-[24px] text-nubo-primary text-center">
            {step === 'PHONE' ? 'Entre no Nubo' : 'Verifique seu número'}
          </h2>
          <p className="font-sans font-medium text-[14px] leading-[17.5px] text-nubo-nav-inactive text-center w-full max-w-[270px]">
            {step === 'PHONE'
              ? 'Entre sem senha. Rápido e seguro.'
              : `Enviamos um código para ${phone}`
            }
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4">
          {step === 'PHONE' ? (
            <>
              {/* Phone Input */}
              <div className="relative group">
                <div className={cn(
                  "relative w-full bg-white border border-nubo-primary rounded-[8px]",
                  "px-3 py-2 flex items-center gap-2 h-[45px]",
                  "focus-within:ring-1 focus-within:ring-nubo-primary",
                  "transition-all"
                )}>
                  {/* Country Selector */}
                  <div 
                    className="relative flex items-center gap-1 shrink-0 cursor-pointer pl-1"
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-nubo-line bg-neutral-50 shrink-0 overflow-hidden relative">
                      <img 
                        src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                        alt={selectedCountry.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-sans font-semibold text-[15px] text-nubo-text-head pt-0.5">{selectedCountry.dialCode}</span>
                    <ChevronDown size={14} className="text-nubo-nav-inactive ml-0.5" />

                    {/* Custom Dropdown */}
                    <AnimatePresence>
                      {isCountryDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCountryDropdownOpen(false);
                            }}
                          />
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-[-12px] mt-3 w-[260px] bg-white border border-nubo-line rounded-xl shadow-xl z-20 py-2 max-h-[260px] overflow-y-auto"
                          >
                            {COUNTRIES.map(c => (
                              <button
                                key={c.code}
                                type="button"
                                className={cn(
                                  "w-full text-left px-4 py-[10px] hover:bg-neutral-50 flex items-center gap-3 transition-colors",
                                  selectedCountry.code === c.code && "bg-nubo-primary/5"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCountryChange(c.code);
                                  setIsCountryDropdownOpen(false);
                                }}
                              >
                                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-nubo-line bg-neutral-50 shrink-0 overflow-hidden relative">
                                  <img 
                                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                                    alt={c.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className={cn(
                                    "font-sans font-semibold text-[14px] leading-tight",
                                    selectedCountry.code === c.code ? "text-nubo-primary" : "text-nubo-text-head"
                                  )}>
                                    {c.name}
                                  </span>
                                  <span className="font-sans text-[12px] text-nubo-nav-inactive leading-tight mt-[2px]">
                                    {c.dialCode}
                                  </span>
                                </div>
                                {selectedCountry.code === c.code && (
                                  <Check size={16} className="text-nubo-primary ml-auto shrink-0" />
                                )}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="h-5 w-[1px] bg-nubo-line mx-1 shrink-0"></div>

                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder={selectedCountry.mask}
                    className="w-full bg-transparent border-none p-0 font-sans font-semibold text-[15px] pt-0.5 text-nubo-text-head placeholder:text-nubo-nav-inactive/60 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              {/* Terms Checkbox - Using Tailwind Tokens */}
              <div className="flex items-start gap-2 px-1">
                <div className="relative flex items-center pt-1">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-nubo-primary bg-white transition-all checked:bg-nubo-primary checked:border-nubo-primary"
                  />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ml-[0.5px] mt-[2px] opacity-0 peer-checked:opacity-100 transition-opacity">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                </div>
                <label htmlFor="terms" className="text-[12px] font-sans font-medium text-nubo-nav-inactive leading-tight select-none cursor-pointer pt-0.5">
                  Li e concordo com os <a href="/termos" className="text-nubo-primary hover:underline">Termos de Uso</a> e <a href="/privacidade" className="text-nubo-primary hover:underline">Política de Privacidade</a>.
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-500 text-xs text-center font-sans font-medium">
                  {error}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleSendCode}
                disabled={isLoading || !phone || !acceptedTerms}
                className={cn(
                  "w-full flex items-center justify-center gap-[10px]",
                  "bg-white border border-nubo-primary rounded-[8px]",
                  "py-2 px-[10px] h-[38px]",
                  "hover:bg-nubo-primary/5 active:bg-nubo-primary/10",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:border-nubo-line",
                  "transition-all duration-200 group mt-1"
                )}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin text-nubo-primary" size={20} />
                ) : (
                  <div className="relative w-[20px] h-[20px]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382C17.119 14.205 15.385 13.351 15.061 13.234C14.736 13.117 14.5 13.058 14.264 13.411C14.029 13.765 13.351 14.56 13.145 14.795C12.939 15.03 12.732 15.059 12.379 14.882C12.0284 14.7061 10.8932 14.3339 9.549 13.135C8.497 12.197 7.786 11.039 7.58 10.686C7.374 10.332 7.558 10.141 7.734 9.966C7.893 9.808 8.087 9.559 8.264 9.353C8.441 9.147 8.5 8.999 8.618 8.764C8.736 8.529 8.677 8.323 8.588 8.146C8.5 7.97 7.793 6.234 7.5 5.528C7.214 4.841 6.925 4.934 6.703 4.924C6.496 4.914 6.26 4.905 6.024 4.905C5.789 4.905 5.405 4.993 5.081 5.346C4.757 5.7 3.843 6.554 3.843 8.291C3.843 10.028 5.11 11.706 5.287 11.942C5.464 12.177 7.784 15.753 11.455 17.34C13.626 18.279 14.484 18.106 15.192 18.041C16.142 17.954 17.653 17.148 17.969 16.259C18.286 15.369 18.286 14.606 18.196 14.453C18.109 14.301 17.873 14.205 17.472 14.382ZM12.076 21.849C10.273 21.849 8.591 21.373 7.126 20.534L6.812 20.347L3 21.347L4.053 17.653L3.845 17.323C2.909 15.834 2.414 14.076 2.414 12.271C2.414 6.958 6.744 2.636 12.08 2.636C14.662 2.637 17.086 3.642 18.911 5.464C20.735 7.286 21.739 9.709 21.739 12.274C21.739 17.585 17.408 21.849 12.076 21.849Z" fill="currentColor" className="text-nubo-primary" />
                    </svg>
                  </div>
                )}
                <span className="font-sans font-bold text-[14px] text-nubo-primary tracking-tight">
                  Receber código no Whatsapp
                </span>
              </button>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <div className="space-y-2">
                <label className="block font-sans font-semibold text-[13px] text-nubo-text-head ml-1">
                  Código de Verificação
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(val);
                    setError(null);
                  }}
                  placeholder="000 000"
                  className="w-full bg-white border border-nubo-primary rounded-[8px] px-3 h-[50px] font-sans font-bold text-[22px] tracking-[8px] text-center text-nubo-text-head placeholder:text-nubo-nav-inactive/50 focus:outline-none focus:ring-1 focus:ring-nubo-primary transition-all"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-xs text-center font-sans font-medium">
                  {error}
                </div>
              )}

              {/* Verify Button */}
              <button
                onClick={handleVerifyCode}
                disabled={isLoading || otp.length !== 6}
                className={cn(
                  "w-full flex items-center justify-center gap-[10px]",
                  "bg-nubo-primary rounded-[8px]",
                  "py-2 px-[10px] h-[45px]",
                  "hover:bg-nubo-primary/90 active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200 mt-2"
                )}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin text-white" size={20} />
                ) : (
                  <Check size={20} className="text-white" strokeWidth={3} />
                )}
                <span className="font-sans font-bold text-[16px] text-white">
                  Confirmar
                </span>
              </button>

              <button
                onClick={() => setStep('PHONE')}
                className="w-full text-nubo-nav-inactive hover:text-nubo-primary text-[13px] font-sans font-semibold transition-colors mt-2"
              >
                Voltar e corrigir número
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
