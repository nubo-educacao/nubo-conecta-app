"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * RequireAuth — "Soft gate" for pages that need authentication
 * but should remain accessible (e.g. shared links).
 *
 * Unlike AuthGuard (which redirects to "/"), this component:
 * - Renders nothing visually
 * - Opens the login modal if the user is not authenticated
 * - Allows the page content to remain visible behind the modal
 *
 * Usage (inside a Server Component page):
 *   <RequireAuth />
 *   <PageContent />
 */
export default function RequireAuth() {
  const { user, loading, setShowAuthModal } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    }
  }, [loading, user, setShowAuthModal]);

  return null;
}
