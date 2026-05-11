"use client";

import AuthGuard from "@/components/auth/AuthGuard";

/**
 * Protected Route Group Layout
 *
 * All routes under (protected)/ are wrapped with AuthGuard.
 * Unauthenticated users are redirected to "/" with the login modal open.
 *
 * This also forces all child routes to be dynamically rendered,
 * preventing Next.js prerender errors during build.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
