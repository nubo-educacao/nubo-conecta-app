"use client";

import type { TabType } from "../page";

const TABS: { id: TabType; label: string }[] = [
  { id: "dados", label: "Dados" },
  { id: "preferencias", label: "Preferências" },
  { id: "favoritos", label: "Favoritos" },
];

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(0,0,0,0.05)" }}>
      {TABS.map((t) => {
        const isActive = t.id === activeTab;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              fontFamily: "Montserrat, sans-serif",
              background: isActive ? "white" : "transparent",
              color: isActive ? "#3092bb" : "#707A7E",
              boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
