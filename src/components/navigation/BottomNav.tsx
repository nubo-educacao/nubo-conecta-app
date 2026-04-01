"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/oportunidades", label: "Oportunidades", icon: Search },
  { href: "/instituicoes", label: "Instituições", icon: BookOpen },
  { href: "/candidaturas", label: "Candidaturas", icon: FileText },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    // Figma: bg rgba(255,255,255,0.8), shadow 0px -2px 20px rgba(0,0,0,0.06)
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm pb-safe"
      style={{ boxShadow: "0px -2px 20px 0px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-[2px] transition-colors"
            >
              {/* Figma: ativo #048FAD Bold, inativo #707A7E Medium */}
              <Icon
                className="h-6 w-6"
                style={{ color: isActive ? "#048FAD" : "#707A7E" }}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className="text-[9px] leading-tight"
                style={{
                  color: isActive ? "#048FAD" : "#707A7E",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
