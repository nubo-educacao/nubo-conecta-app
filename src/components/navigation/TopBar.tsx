"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { user, setShowAuthModal } = useAuth();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full",
        "bg-white/90 backdrop-blur-sm border-b border-gray-100"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          {title ? (
            <h1 className="text-base font-bold text-nubo-text-primary">{title}</h1>
          ) : (
            <span className="text-lg font-extrabold text-nubo-primary tracking-tight">
              nubo
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {user && (
            <button
              className="p-2 rounded-full text-nubo-text-secondary hover:bg-gray-50 transition-colors"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
            </button>
          )}

          <button
            onClick={() => !user && setShowAuthModal(true)}
            className={cn(
              "p-2 rounded-full transition-colors",
              user
                ? "text-nubo-primary bg-nubo-primary/10"
                : "text-nubo-text-secondary hover:bg-gray-50"
            )}
            aria-label={user ? "Perfil" : "Entrar"}
          >
            <User className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
