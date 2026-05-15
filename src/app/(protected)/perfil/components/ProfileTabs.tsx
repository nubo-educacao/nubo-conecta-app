"use client";

import { User, Settings, Heart } from "lucide-react";
import type { TabType } from "../page";

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "dados", label: "Dados", icon: User },
  { id: "preferencias", label: "Preferências", icon: Settings },
  { id: "favoritos", label: "Favoritos", icon: Heart },
];

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-3">
      {TABS.map((t) => {
        const isActive = t.id === activeTab;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={[
              "flex items-center justify-center gap-1 sm:gap-1.5",
              "py-2 px-3 sm:px-5",
              "rounded-full",
              "text-xs sm:text-sm font-semibold",
              "whitespace-nowrap transition-all",
            ].join(" ")}
            style={{
              fontFamily: "Montserrat, sans-serif",
              background: isActive ? "#ffffff" : "transparent",
              color: isActive ? "#3092bb" : "#707A7E",
              boxShadow: isActive
                ? "0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)"
                : "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Icon size={13} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
