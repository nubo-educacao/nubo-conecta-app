"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type Step = "phone" | "otp";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhone = (raw: string) => {
    // Garante formato E.164 para o Brasil: +55XXXXXXXXXXX
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("55")) return `+${digits}`;
    return `+55${digits}`;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(phone),
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setStep("otp");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone: formatPhone(phone),
      token: otp,
      type: "sms",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // AuthContext fecha o modal automaticamente via onAuthStateChange
    onClose();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Sheet mobile-first: sobe do fundo em mobile, centralizado em tablet+ */}
      <div className="w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl p-6 pb-10 sm:pb-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-nubo-text-primary">
            {step === "phone" ? "Entrar no Nubo" : "Confirmar código"}
          </h2>
          <button onClick={onClose} className="p-1 text-nubo-text-secondary hover:text-nubo-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <p className="text-sm text-nubo-text-secondary">
              Digite seu número de celular. Você receberá um código via SMS ou WhatsApp.
            </p>
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={cn(
                "w-full px-4 py-3 border rounded-xl text-base",
                "focus:outline-none focus:ring-2 focus:ring-nubo-primary",
                "placeholder:text-nubo-text-secondary"
              )}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, "").length < 10}
              className={cn(
                "w-full py-3 rounded-xl font-semibold text-white transition-opacity",
                "bg-nubo-primary",
                (loading || phone.replace(/\D/g, "").length < 10) && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? "Enviando..." : "Receber código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-nubo-text-secondary">
              Código enviado para <strong>{phone}</strong>.{" "}
              <button type="button" onClick={() => setStep("phone")} className="underline text-nubo-primary">
                Trocar número
              </button>
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              className={cn(
                "w-full px-4 py-3 border rounded-xl text-center text-2xl tracking-widest font-mono",
                "focus:outline-none focus:ring-2 focus:ring-nubo-primary"
              )}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className={cn(
                "w-full py-3 rounded-xl font-semibold text-white transition-opacity",
                "bg-nubo-primary",
                (loading || otp.length < 6) && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? "Verificando..." : "Confirmar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
