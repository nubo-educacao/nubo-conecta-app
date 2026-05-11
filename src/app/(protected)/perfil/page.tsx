"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import ProfileTabs from "./components/ProfileTabs";
import DadosTab from "./components/DadosTab";
import PreferenciasTab from "./components/PreferenciasTab";
import FavoritosTab from "./components/FavoritosTab";
import { getUserOnboardingData } from "@/services/profileService";

export type TabType = "dados" | "preferencias" | "favoritos";

export interface PerfilData {
  profile: Record<string, unknown> | null;
  income: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  enemScores: Record<string, unknown>[] | null;
}

function PerfilContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: nullableUser } = useAuth();
  const user = nullableUser!; // guaranteed by AuthGuard in (protected) layout
  const { activeProfileId, profiles } = useProfile();
  const [data, setData] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);

  const tab = (searchParams.get("tab") as TabType) ?? "dados";

  function setTab(t: TabType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.replace(`/perfil?${params.toString()}`);
  }

  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const profileName = activeProfile?.full_name ?? user?.email ?? "Perfil";
  const isDependent = activeProfile?.isdependent ?? false;
  const userInitial = profileName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    getUserOnboardingData(activeProfileId).then((d) => {
      setData(d as PerfilData);
      setLoading(false);
    });
  }, [activeProfileId]);

  // user is guaranteed by AuthGuard in (protected) layout

  return (
    <AppShell title="Perfil">
      <div className="max-w-2xl mx-auto px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4 py-6">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full text-white text-2xl font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)" }}
          >
            {userInitial}
          </div>
          <div>
            <h1
              className="text-lg font-bold leading-tight"
              style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}
            >
              {profileName}
            </h1>
            <span
              className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1"
              style={{
                background: isDependent ? "rgba(112,48,194,0.12)" : "rgba(48,146,187,0.12)",
                color: isDependent ? "#7030C2" : "#3092bb",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {isDependent ? "Dependente" : "Titular"}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <ProfileTabs activeTab={tab} onTabChange={setTab} />

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#3092bb] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {tab === "dados" && (
                <DadosTab
                  profileId={activeProfileId!}
                  data={data}
                  onRefresh={() => {
                    if (activeProfileId) {
                      getUserOnboardingData(activeProfileId).then((d) => setData(d as PerfilData));
                    }
                  }}
                />
              )}
              {tab === "preferencias" && (
                <PreferenciasTab
                  userId={user.id}
                  data={data}
                  onRefresh={() => {
                    if (activeProfileId) {
                      getUserOnboardingData(activeProfileId).then((d) => setData(d as PerfilData));
                    }
                  }}
                />
              )}
              {tab === "favoritos" && (
                <FavoritosTab userId={user.id} />
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
      <PerfilContent />
    </Suspense>
  );
}

