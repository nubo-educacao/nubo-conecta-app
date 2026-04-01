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
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-white border-t border-gray-100",
        "pb-safe" // safe area iOS
      )}
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                isActive
                  ? "text-nubo-primary"
                  : "text-nubo-nav-inactive hover:text-nubo-text-secondary"
              )}
            >
              <Icon
                className={cn("h-6 w-6", isActive && "stroke-[2.5px]")}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "font-semibold" : "font-normal"
                )}
              >
                {label}
              </span>
              {/* Indicador ativo */}
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-nubo-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
