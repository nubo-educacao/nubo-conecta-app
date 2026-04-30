"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, User, Home, Search, BookOpen, FileText, LogOut, LogIn } from "lucide-react";

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
  const { user, setShowAuthModal, signOut } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  // Deriva initial/label do usuário logado
  const userLabel = user?.email ?? "";
  const userInitial = userLabel.charAt(0).toUpperCase();

  function handleProfileClick() {
    if (user) {
      setDropdownOpen((prev) => !prev);
    } else {
      setShowAuthModal(true);
    }
  }

  async function handleSignOut() {
    setDropdownOpen(false);
    await signOut();
  }

  return (
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
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Home">
          {title ? (
            <h1
              className="text-base font-bold"
              style={{ color: "#3092bb", fontFamily: 'Montserrat, sans-serif' }}
            >
              {title}
            </h1>
          ) : (
            <span
              className="text-base font-bold whitespace-nowrap"
              style={{ color: "#3092bb", fontFamily: 'Montserrat, sans-serif' }}
            >
              Nubo Conecta
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-full text-sm transition-colors"
                style={{
                  color: isActive ? "#3092bb" : "#707A7E",
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? "rgba(48,146,187,0.08)" : "transparent",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Profile pill + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 border transition-all hover:bg-white/30"
            style={{
              background: "rgba(255,255,255,0.6)",
              borderColor: "rgba(255,255,255,0.4)",
              boxShadow: "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px rgba(0,0,0,0.1)",
            }}
            aria-label={user ? "Perfil" : "Entrar"}
            aria-expanded={dropdownOpen}
          >
            {/* Avatar */}
            <span
              className="flex items-center justify-center rounded-full h-8 w-8 shrink-0 text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)" }}
            >
              {user ? userInitial : <User className="h-4 w-4" strokeWidth={1.5} />}
            </span>

            {/* Label email truncada — apenas desktop */}
            {user && (
              <span
                className="hidden md:block text-xs font-medium max-w-[120px] truncate"
                style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}
              >
                {userLabel}
              </span>
            )}
            {!user && (
              <span
                className="hidden md:block text-xs font-semibold"
                style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}
              >
                Entrar
              </span>
            )}

            <ChevronDown
              className="h-3.5 w-3.5 transition-transform"
              style={{
                color: "#3A424E",
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
              strokeWidth={2}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && user && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden py-1 z-50"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-black/5">
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}
                >
                  {userLabel}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}
                >
                  Conta Nubo Conecta
                </p>
              </div>

              {/* Actions */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-sm transition-colors hover:bg-black/5"
                style={{ color: "#dc2626", fontFamily: "Montserrat, sans-serif" }}
              >
                <LogOut size={15} />
                Sair da conta
              </button>
            </div>
          )}

          {/* Visitante: apenas abre modal ao clicar no pill (sem dropdown) */}
          {dropdownOpen && !user && (
            <div
              className="absolute right-0 mt-2 w-44 rounded-2xl overflow-hidden py-1 z-50"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              <button
                onClick={() => { setDropdownOpen(false); setShowAuthModal(true); }}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-sm transition-colors hover:bg-black/5"
                style={{ color: "#024F86", fontFamily: "Montserrat, sans-serif", fontWeight: 600 }}
              >
                <LogIn size={15} />
                Entrar / Cadastrar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
