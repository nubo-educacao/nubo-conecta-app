"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import OpportunityCarousel from "@/components/home/OpportunityCarousel";
import InstitutionCarousel from "@/components/home/InstitutionCarousel";
import type { IUnifiedOpportunity } from "@/types/opportunities";
import type { UnifiedInstitution } from "@/types/institutions";
import { useFavorites } from "@/contexts/FavoritesContext";

interface FavoritosTabProps {
  userId: string;
}

export default function FavoritosTab({ userId }: FavoritosTabProps) {
  const [allOpportunities, setAllOpportunities] = useState<IUnifiedOpportunity[]>([]);
  const [allInstitutions, setAllInstitutions] = useState<UnifiedInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const { favoriteIds } = useFavorites();

  async function loadFavorites() {
    setLoading(true);
    const unifiedIds = Array.from(favoriteIds);

    const opportunityIds = unifiedIds.filter(
      (id) => id.startsWith("mec_") || id.startsWith("partner_")
    );
    const institutionIds = unifiedIds
      .filter((id) => id.startsWith("institution_"))
      .map((id) => id.replace("institution_", ""));

    // 1. Fetch Opportunities
    let mappedOpps: IUnifiedOpportunity[] = [];
    if (opportunityIds.length > 0) {
      const { data: rows } = await supabase
        .from("v_unified_opportunities")
        .select(
          "unified_id, title, provider_name, type, opportunity_type, category, is_partner, location, badges, created_at, status, starts_at, ends_at, external_redirect_url, external_redirect_enabled, min_cutoff_score_current, min_cutoff_score_prev, max_cutoff_score_current, max_cutoff_score_prev, vagas_ociosas_current, vagas_ociosas_prev, institution_cover_url"
        )
        .in("unified_id", opportunityIds);

      if (rows) {
        mappedOpps = (rows as Record<string, unknown>[]).map((row) => ({
          id: row.unified_id as string,
          title: row.title as string,
          institution_name: row.provider_name as string,
          is_partner: row.is_partner as boolean,
          type: row.type as IUnifiedOpportunity["type"],
          opportunity_type: (row.opportunity_type || row.type) as string,
          category: row.category as IUnifiedOpportunity["category"],
          category_label:
            row.category === "educational_programs"
              ? "Programas Educacionais"
              : row.category === "public_universities"
              ? "Universidades Públicas"
              : row.category === "grants_scholarships"
              ? "Bolsas e Gratuidades"
              : (row.category as string) || "",
          location: (row.location as string) || "Nacional",
          education_level: "Graduação",
          badges: (row.badges as string[]) || [],
          created_at: row.created_at as string,
          status: row.status as string | undefined,
          starts_at: row.starts_at as string | undefined,
          ends_at: row.ends_at as string | undefined,
          min_cutoff_score_current: row.min_cutoff_score_current as number | undefined,
          min_cutoff_score_prev: row.min_cutoff_score_prev as number | undefined,
          max_cutoff_score_current: row.max_cutoff_score_current as number | undefined,
          max_cutoff_score_prev: row.max_cutoff_score_prev as number | undefined,
          vagas_ociosas_current: row.vagas_ociosas_current as boolean | undefined,
          vagas_ociosas_prev: row.vagas_ociosas_prev as boolean | undefined,
          institution_cover_url: row.institution_cover_url as string | undefined,
          external_redirect: row.external_redirect_enabled
            ? { enabled: true, url: row.external_redirect_url as string | undefined }
            : undefined,
        }));
      }
    }

    // 2. Fetch Institutions
    let mappedInsts: UnifiedInstitution[] = [];
    if (institutionIds.length > 0) {
      const { data: rows } = await supabase
        .from("v_unified_institutions")
        .select(
          "id, name, location, logo_url, cover_url, brand_color, description, type, opp_types, acronym, academic_organization, administrative_category, website_url, igc, ci, ci_ead, legal_nature, maintainer_name"
        )
        .in("id", institutionIds);

      if (rows) {
        mappedInsts = rows as UnifiedInstitution[];
      }
    }

    setAllOpportunities(mappedOpps);
    setAllInstitutions(mappedInsts);
    setLoading(false);
  }

  // Reload the details when favoriteIds change
  useEffect(() => {
    loadFavorites();
  }, [favoriteIds.size]);

  // Filter opportunities & institutions to only those that are STILL favorited
  const activeOpportunities = allOpportunities.filter((opp) => favoriteIds.has(opp.id));
  const activeInstitutions = allInstitutions.filter((inst) =>
    favoriteIds.has(`institution_${inst.id}`)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-[#38B1E4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (activeOpportunities.length === 0 && activeInstitutions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ background: "rgba(48,146,187,0.08)" }}
        >
          <Heart size={28} style={{ color: "#38B1E4" }} />
        </div>
        <h3 className="text-base font-bold mb-2" style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}>
          Nenhum favorito ainda
        </h3>
        <p className="text-sm mb-6" style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}>
          Explore oportunidades e instituições e salve as que mais te interessam.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/oportunidades"
            className="px-6 py-2.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90 text-center"
            style={{ background: "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)", fontFamily: "Montserrat, sans-serif" }}
          >
            Explorar Oportunidades
          </Link>
          <Link
            href="/instituicoes"
            className="px-6 py-2.5 rounded-full text-sm font-bold text-[#024F86] bg-white border border-[#024F86]/20 transition-opacity hover:opacity-90 text-center"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Explorar Instituições
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* 1. Carousel Oportunidades */}
      {activeOpportunities.length > 0 ? (
        <OpportunityCarousel
          title="Oportunidades Favoritas"
          opportunities={activeOpportunities}
          seeAllHref="/oportunidades"
          desktopGridMode={false}
        />
      ) : (
        <div className="px-4 py-6 text-center border border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
          <h3 className="text-sm font-bold text-[#3a424e] mb-1">Nenhuma oportunidade favorita</h3>
          <p className="text-xs text-[#707a7e] mb-3">Explore e adicione oportunidades aos seus favoritos.</p>
          <Link href="/oportunidades" className="text-xs font-semibold text-[#38B1E4] hover:underline">
            Explorar oportunidades →
          </Link>
        </div>
      )}

      {/* Divider */}
      {activeOpportunities.length > 0 && activeInstitutions.length > 0 && (
        <div className="border-t border-gray-100 my-2 mx-4" />
      )}

      {/* 2. Carousel Instituições */}
      {activeInstitutions.length > 0 ? (
        <InstitutionCarousel
          institutions={activeInstitutions}
          seeAllHref="/instituicoes"
          desktopGridMode={false}
        />
      ) : (
        <div className="px-4 py-6 text-center border border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
          <h3 className="text-sm font-bold text-[#3a424e] mb-1">Nenhuma instituição favorita</h3>
          <p className="text-xs text-[#707a7e] mb-3">Explore e adicione instituições aos seus favoritos.</p>
          <Link href="/instituicoes" className="text-xs font-semibold text-[#38B1E4] hover:underline">
            Explorar instituições →
          </Link>
        </div>
      )}
    </div>
  );
}
