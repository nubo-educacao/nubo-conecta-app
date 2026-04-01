"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { user, setShowAuthModal } = useAuth();

  return (
    // Figma: bg rgba(255,255,255,0.3) glassmorphism, shadow dupla
    <header
      className="sticky top-0 z-40 w-full border-b border-black/10"
      style={{
        background: "rgba(255,255,255,0.3)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)",
      }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo — Figma: "Nubo Conecta" Montserrat Bold #024F86 16px */}
        <div className="flex items-center gap-2">
          {title ? (
            <h1 className="text-base font-bold" style={{ color: "#024F86" }}>{title}</h1>
          ) : (
            <span className="text-base font-bold whitespace-nowrap" style={{ color: "#024F86", fontFamily: "Montserrat, sans-serif" }}>
              Nubo Conecta
            </span>
          )}
        </div>

        {/* Right button — Figma: pill glassmorphism, avatar gradient #38B1E4→#024F86 */}
        <button
          onClick={() => !user && setShowAuthModal(true)}
          className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 border"
          style={{
            background: "rgba(255,255,255,0.6)",
            borderColor: "rgba(255,255,255,0.4)",
            boxShadow: "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px rgba(0,0,0,0.1)",
          }}
          aria-label={user ? "Perfil" : "Entrar"}
        >
          {/* Avatar circle with gradient */}
          <span
            className="flex items-center justify-center rounded-full h-8 w-8 shrink-0"
            style={{ background: "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)" }}
          >
            <User className="h-4 w-4 text-white" strokeWidth={1.5} />
          </span>
          <ChevronDown className="h-3.5 w-3.5" style={{ color: "#3A424E" }} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
