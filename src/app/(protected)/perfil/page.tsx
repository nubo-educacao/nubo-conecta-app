"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Pencil, Camera, User as UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
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

/**
 * Resize an image file to a square of `size`×`size` px using Canvas,
 * then return a JPEG Blob. This prevents the browser from having to
 * downscale a large original, which is the main cause of pixelation.
 */
function resizeImage(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;

      // Fill with the blue gradient background (matches the avatar circle)
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, "#38B1E4");
      gradient.addColorStop(1, "#024F86");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Draw cropped to square (center crop)
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        0.92, // quality — 92% is crisp with reasonable file size
      );
    };

    img.onerror = reject;
    img.src = url;
  });
}

function PerfilContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: nullableUser } = useAuth();
  const user = nullableUser!; // guaranteed by AuthGuard in (protected) layout
  const { activeProfileId, profiles, refreshProfiles } = useProfile();
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarUrl = (data?.profile as any)?.avatar_url;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProfileId) return;

    // Reset input so same file can be re-selected
    e.target.value = "";

    try {
      setLoading(true);

      // ── Resize client-side before upload ──────────────────────────────────
      const resizedBlob = await resizeImage(file, 400);
      // ─────────────────────────────────────────────────────────────────────

      const fileName = `${activeProfileId}-${Date.now()}.jpg`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, resizedBlob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add cache-busting query so the browser doesn't show the old image
      const bustUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ avatar_url: bustUrl })
        .eq("id", activeProfileId);

      if (updateError) throw updateError;

      // Update local state
      setData((prev) =>
        prev
          ? { ...prev, profile: { ...(prev.profile as any), avatar_url: bustUrl } }
          : null
      );

      // Refresh global profiles context to update header
      await refreshProfiles();

    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Erro ao carregar imagem");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="w-full mx-auto px-4 md:px-8 pb-8">
        {/* Header */}
        <div className="relative mb-6 -mx-4 md:-mx-8">
          {/* Cover / Profile Banner */}
          <div 
            className="h-48 w-full rounded-none md:rounded-t-3xl overflow-hidden relative flex items-center px-6 md:px-10"
            style={{ 
              background: "linear-gradient(163deg, #3092BB 0%, #1E5E7A 85%, #15465C 100%)",
              boxShadow: "0px 4px 4px rgba(0,0,0,0.15)"
            }}
          >
            {/* Profile Info Area */}
            <div className="flex items-center gap-5 md:gap-8">
              {/* Avatar Container */}
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div
                  className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full text-white text-3xl md:text-4xl font-bold border-[1.5px] border-white/40 shadow-lg overflow-hidden bg-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/20 transition-all"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                  onClick={handleAvatarClick}
                >
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={profileName} 
                      className="w-full h-full object-cover" 
                      style={{ imageRendering: "auto", transform: "translateZ(0)" }}
                    />
                  ) : (
                    userInitial
                  )}
                </div>
                {/* Avatar Edit Button */}
                <button 
                  onClick={handleAvatarClick}
                  className="absolute -bottom-1 -right-1 bg-white/20 backdrop-blur-md p-2 rounded-full shadow-lg text-white border border-white/30 hover:bg-white/30 transition-all"
                >
                  <Pencil size={14} />
                </button>
              </div>

              {/* Text Info */}
              <div className="flex flex-col">
                <h1
                  className="text-xl md:text-2xl font-bold text-white leading-tight"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {profileName}
                </h1>
                <p
                  className="text-sm md:text-base font-medium text-white/80 mt-1"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {isDependent ? "Dependente" : "Titular"}
                </p>
              </div>
            </div>
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

