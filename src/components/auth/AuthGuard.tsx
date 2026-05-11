"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * AuthGuard — Protects routes that require authentication.
 *
 * - While checking auth state: shows a loading spinner.
 * - If user is null: redirects to "/" and opens the login modal.
 * - If user exists: renders children normally.
 *
 * Usage:
 *   Wrap in a layout.tsx for route-group-level protection,
 *   or inline in individual pages.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, setShowAuthModal } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect after loading finishes and we confirm no user
    if (!loading && !user) {
      setShowAuthModal(true);
      router.replace("/");
    }
  }, [loading, user, router, setShowAuthModal]);

  // Still checking session
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#38B1E4] border-t-transparent rounded-full animate-spin" />
          <p
            className="text-sm text-[#707A7E] font-medium"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated — useEffect above will redirect, show nothing while it happens
  if (!user) {
    return null;
  }

  // Authenticated — render the page
  return <>{children}</>;
}
