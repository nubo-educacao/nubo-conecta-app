"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, User, Home, Search, BookOpen, FileText } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/oportunidades", label: "Oportunidades", icon: Search },
  { href: "/instituicoes", label: "Instituições", icon: BookOpen },
  { href: "/candidaturas", label: "Candidaturas", icon: FileText },
] as const;

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { user, setShowAuthModal } = useAuth();
  const pathname = usePathname();

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
      <div className="flex items-center justify-between h-14 px-4 max-w-[1200px] mx-auto">
        {/* Logo — Figma: "Nubo Conecta" Montserrat Bold #024F86 16px */}
        <div className="flex items-center gap-2">
          {title ? (
            <h1 className="text-base font-bold" style={{ color: "#024F86" }}>{title}</h1>
          ) : (
            <span
              className="text-base font-bold whitespace-nowrap"
              style={{ color: "#024F86", fontFamily: "Montserrat, sans-serif" }}
            >
              Nubo Conecta
            </span>
          )}
        </div>

        {/* Desktop nav — md+ breakpoint */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-full text-sm transition-colors"
                style={{
                  color: isActive ? "#048FAD" : "#707A7E",
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? "rgba(4,143,173,0.08)" : "transparent",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: user pill */}
        <div className="flex items-center gap-2">
          {/* User pill — Figma: glassmorphism, gradient avatar #38B1E4→#024F86 */}
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
            <span
              className="flex items-center justify-center rounded-full h-8 w-8 shrink-0"
              style={{ background: "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)" }}
            >
              <User className="h-4 w-4 text-white" strokeWidth={1.5} />
            </span>
            <ChevronDown className="h-3.5 w-3.5" style={{ color: "#3A424E" }} strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
