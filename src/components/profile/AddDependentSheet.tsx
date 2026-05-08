"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";

interface AddDependentSheetProps {
  open: boolean;
  onClose: () => void;
}

const RELATIONSHIP_OPTIONS = [
  { value: "filho/a", label: "Filho/a" },
  { value: "enteado/a", label: "Enteado/a" },
  { value: "cônjuge", label: "Cônjuge" },
  { value: "outro", label: "Outro" },
];

export default function AddDependentSheet({ open, onClose }: AddDependentSheetProps) {
  const { user } = useAuth();
  const { refreshProfiles } = useProfile();

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [relationship, setRelationship] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function resetForm() {
    setFullName("");
    setBirthDate("");
    setRelationship("");
    setToast(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setToast(null);

    const { error } = await supabase.from("user_profiles").insert({
      parent_user_id: user.id,
      isdependent: true,
      full_name: fullName,
      birth_date: birthDate || null,
      relationship,
    });

    setLoading(false);

    if (error) {
      setToast({ type: "error", msg: "Erro ao adicionar dependente. Tente novamente." });
      return;
    }

    await refreshProfiles();
    setToast({ type: "success", msg: `${fullName} adicionado(a) com sucesso!` });
    setTimeout(() => {
      handleClose();
    }, 1200);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="absolute bottom-0 left-0 right-0 pointer-events-auto rounded-t-3xl md:rounded-3xl md:left-auto md:right-8 md:bottom-8 md:w-[420px]"
            style={{
              background: "rgba(255,255,255,0.97)",
              boxShadow: "0 -4px 40px rgba(0,0,0,0.15)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <h2
                className="text-base font-bold"
                style={{ color: "#024F86", fontFamily: "Montserrat, sans-serif" }}
              >
                Adicionar Dependente
              </h2>
              <button
                onClick={handleClose}
                className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-black/5 transition-colors"
                aria-label="Fechar"
              >
                <X size={18} style={{ color: "#707A7E" }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-5">
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}
                >
                  Nome completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome do dependente"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#3092bb] transition-colors"
                  style={{ borderColor: "#E2E8F0", fontFamily: "Montserrat, sans-serif", color: "#3A424E" }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}
                >
                  Data de nascimento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#3092bb] transition-colors"
                  style={{ borderColor: "#E2E8F0", fontFamily: "Montserrat, sans-serif", color: "#3A424E" }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}
                >
                  Relação *
                </label>
                <select
                  required
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#3092bb] transition-colors bg-white"
                  style={{ borderColor: "#E2E8F0", fontFamily: "Montserrat, sans-serif", color: "#3A424E" }}
                >
                  <option value="">Selecione...</option>
                  {RELATIONSHIP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {toast && (
                <p
                  className="text-xs font-medium rounded-xl px-3 py-2"
                  style={{
                    background: toast.type === "success" ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
                    color: toast.type === "success" ? "#16a34a" : "#dc2626",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {toast.msg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)",
                  color: "#fff",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {loading ? "Salvando..." : "Adicionar"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
