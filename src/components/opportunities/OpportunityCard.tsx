'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Star, GraduationCap, Lock, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { IUnifiedOpportunity } from '@/types/opportunities';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/contexts/FavoritesContext';

interface OpportunityCardProps {
  opportunity: IUnifiedOpportunity;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
  onClickOverride?: (id: string) => void;
  className?: string;
}

/**
 * BadgeCompatibilidade - Match badge from Figma (Image 5)
 */
const BadgeCompatibilidade = ({ score, variant }: { score: number; variant: 'default' | 'partner' }) => {
  const bgGradient = variant === 'partner'
    ? 'linear-gradient(-44.61deg, #7030C2 17.03%, rgba(112, 48, 194, 0.8) 47.27%, rgba(112, 48, 194, 0.6) 88.85%)'
    : 'linear-gradient(159.94deg, #3092BB 13.38%, #164255 141.45%)';

  return (
    <div
      className="flex flex-col items-center justify-center rounded-full text-white size-[47px] shadow-[0px_4px_3.75px_rgba(0,0,0,0.25)] border-none ring-0 outline-none"
      style={{ background: bgGradient }}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <span className="text-[13px] font-bold leading-none">{Math.round(score)}%</span>
        <span className="text-[10px] font-extralight lowercase leading-none mt-0.5">match</span>
      </div>
    </div>
  );
};

export default function OpportunityCard({
  opportunity,
  onFavorite,
  isFavorited,
  onClickOverride,
  className
}: OpportunityCardProps) {
  const router = useRouter();
  const { user, setShowAuthModal } = useAuth();
  const isAuthenticated = !!user;
  const { isFavorited: isFavoritedContext, toggleFavorite } = useFavorites();

  const isActuallyFavorited = isFavorited !== undefined ? isFavorited : isFavoritedContext(opportunity.id);
  const [imgError, setImgError] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { setShowAuthModal(true); return; }
    
    if (onFavorite) {
      onFavorite(opportunity.id);
    } else {
      toggleFavorite(opportunity.id);
    }
  };

  const handleViewDetails = () => {
    if (onClickOverride) {
      onClickOverride(opportunity.id);
      return;
    }
    if (!isAuthenticated) { setShowAuthModal(true); return; }
    router.push(`/oportunidades/${opportunity.id}`);
  };

  const isPartner = opportunity.is_partner;
  const variant = isPartner ? 'partner' : 'default';

  // Figma Style Tokens (Node 42:1488 and 113:2279)
  const themes = {
    partner: {
      cardBg: 'linear-gradient(90deg, #522A87 0%, #522A87 100%), linear-gradient(-78.71deg, rgba(0, 0, 0, 0.46) 19.1%, rgba(51, 51, 51, 0.46) 56.52%, rgba(102, 102, 102, 0.46) 98.2%)',
      btnBg: 'rgba(112, 48, 194, 0.15)',
      btnText: '#7030C2',
      hoverBorder: '#FF9900',
    },
    default: {
      cardBg: 'linear-gradient(239.86deg, rgba(48, 146, 187, 0.8) 9.15%, #3092BB 59.27%)',
      btnBg: 'rgba(4, 143, 173, 0.15)',
      btnText: '#3092BB',
      hoverBorder: '#3092BB',
    }
  };

  const currentTheme = themes[variant];
  const coverUrl = isPartner ? opportunity.institution_cover_url : (opportunity as any).image_url;
  const hasCoverImage = !!(coverUrl && !imgError && coverUrl !== 'null' && coverUrl !== '');

  // Determine the header image to use
  const headerImage = !isPartner
    ? '/assets/card-header-default.png'
    : (hasCoverImage ? coverUrl : '/assets/card-header-partner.png');

  const isClosed = opportunity.status === 'closed';
  const isIncoming = opportunity.status === 'incoming';

  const minCutoff = opportunity.min_cutoff_score_current ?? opportunity.min_cutoff_score_prev;
  const maxCutoff = opportunity.max_cutoff_score_current ?? opportunity.max_cutoff_score_prev;
  const vagasOciosas = opportunity.vagas_ociosas_current ?? opportunity.vagas_ociosas_prev;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover="hover"
      variants={{
        hover: {
          scale: 1.01,
          boxShadow: `0 0 0 1.5px ${currentTheme.hoverBorder}, 0px 24px 48px -12px rgba(181,183,192,0.4)`
        }
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={handleViewDetails}
      className={cn(
        "group relative w-full max-w-[361px] h-[277px] rounded-[16px] overflow-hidden cursor-pointer flex flex-col",
        "shadow-[0px_24px_44px_-11px_rgba(181,183,192,0.3)] transition-all",
        className
      )}
      style={{
        fontFamily: 'Montserrat, sans-serif',
        background: 'white'
      }}
    >
      {/* ── Header Background Gradient ── */}
      <div
        className="absolute inset-x-0 top-0 h-[124px] z-0"
        style={{ background: currentTheme.cardBg }}
      />

      {/* ── Background Image Layer ── */}
      {headerImage && (
        <div className={cn(
          "absolute inset-x-0 z-0 overflow-hidden",
          isPartner ? "top-[20px] h-[104px]" : "top-0 h-[124px]"
        )}>
          <motion.img
            src={headerImage}
            alt=""
            onError={() => setImgError(true)}
            variants={{
              hover: { scale: 1.1 }
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
              "w-full h-full object-cover",
              (isPartner && hasCoverImage) ? "opacity-70 mix-blend-overlay" : "opacity-100"
            )}
          />
        </div>
      )}



      {/* ── Partner Banner ── */}
      {isPartner && (
        <div className="absolute top-0 left-0 w-full h-[20px] bg-[#7030C2] flex items-center justify-center gap-1.5 z-50">
          <Star size={10} fill="#FFD700" color="#FFD700" />
          <span className="text-white text-[11px] font-medium">Oportunidade parceira</span>
        </div>
      )}

      {/* ── Top Controls (Aligned for both variants) ── */}
      <div className={cn(
        "absolute inset-x-4 z-40 flex items-center justify-between",
        isPartner ? "top-[36px]" : "top-[32px]"
      )}>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="bg-[#FF9900] px-3 py-0.5 rounded-full shadow-[0px_4px_8px_rgba(0,0,0,0.15)] flex items-center h-[20px]">
            <span className="text-[#3A424E] text-[10px] font-semibold uppercase">{opportunity.opportunity_type || 'PROGRAMAS'}</span>
          </div>

          {vagasOciosas === true && (
            <div className="bg-purple-100/90 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200 shadow-sm h-[20px]">
              <TrendingUp size={10} className="text-purple-700" strokeWidth={2.5} />
              <span className="text-purple-700 text-[9px] font-bold uppercase tracking-wider">
                Vagas Ociosas
              </span>
            </div>
          )}

          {isClosed && (
            <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10 shadow-lg">
              <Lock size={9} className="text-white/80" strokeWidth={2.5} />
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">Encerrado</span>
            </div>
          )}
          {isIncoming && (
            <motion.div
              animate={{ boxShadow: ['0 0 0px rgba(255,153,0,0)', '0 0 12px rgba(255,153,0,0.4)', '0 0 0px rgba(255,153,0,0)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="bg-gradient-to-r from-amber-500/90 to-orange-400/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20 shadow-lg"
            >
              <Clock size={9} className="text-white" strokeWidth={2.5} />
              <span className="text-white text-[10px] font-bold uppercase tracking-wider">Em breve</span>
            </motion.div>
          )}
        </div>

        <button
          onClick={handleFavorite}
          className="bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center size-[32px] transition-all border border-white/40 shadow-sm"
        >
          <Heart 
            size={16} 
            color={isActuallyFavorited ? '#E11D48' : 'white'} 
            fill={isActuallyFavorited ? '#E11D48' : 'none'} 
            strokeWidth={1.5} 
          />
        </button>
      </div>

      {/* ── Cloud Overlay + White Body (Node 42:1488) ── */}
      <div className="absolute top-[84px] left-0 w-full z-10 pointer-events-none">
        <div className="relative w-full h-[35px]">
          <img
            src="/assets/card-background.svg"
            alt="Cloud Border"
            className="w-full h-full object-cover object-top"
          />
        </div>
        {/* The White Block that covers the bottom of the gradient background */}
        <div className="bg-white w-full h-[300px] mt-[-2px]" />
      </div>

      {/* ── Content Section (Transparent, sitting over the white block) ── */}
      <div className="absolute inset-x-0 top-[95px] bottom-0 px-5 pb-5 pt-3 flex flex-col justify-between z-20 bg-transparent">
        {/* Match Badge - Adjusted top position to match Figma y=111 (95 + 16) */}
        {opportunity.match_score != null && (
          <div className="absolute right-4 top-[16px] z-40">
            <BadgeCompatibilidade score={opportunity.match_score} variant={variant} />
          </div>
        )}

        <div className="space-y-1.5 mt-2">
          <div className="pr-12">
            <h3 className="font-semibold text-[14px] leading-tight text-[#3A424E] line-clamp-1">
              {opportunity.title}
            </h3>
            <p className="text-[13px] font-medium text-[#3A424E]/60 truncate">
              {opportunity.institution_name}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#3A424E]/70">
              <MapPin size={14} strokeWidth={1.5} className="shrink-0" style={{ color: currentTheme.btnText }} />
              <span className="truncate">{opportunity.location || 'Nacional / Internacional'}</span>
            </div>
            {(opportunity.type === 'sisu' || opportunity.type === 'prouni') ? (
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#3A424E]/70">
                <GraduationCap size={14} strokeWidth={1.5} className="shrink-0" style={{ color: currentTheme.btnText }} />
                <span className="truncate">
                  Corte: {minCutoff?.toFixed(1) || '---'} a {maxCutoff?.toFixed(1) || '---'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#3A424E]/70">
                <GraduationCap size={14} strokeWidth={1.5} className="shrink-0" style={{ color: currentTheme.btnText }} />
                <span className="truncate">
                  {opportunity.is_partner ? (opportunity.category_label || 'Graduação') : (opportunity.education_level || 'Graduação')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleViewDetails(); }}
          className="w-full h-[32px] rounded-full flex items-center justify-center transition-all mt-2 font-semibold text-[13px] shadow-[0px_8px_16px_rgba(0,0,0,0.12)] hover:brightness-95 active:scale-[0.98]"
          style={{ background: currentTheme.btnBg, color: currentTheme.btnText }}
        >
          {isClosed || isIncoming ? 'Ver detalhes' : 'Candidatar'}
        </button>
      </div>
    </motion.div>
  );
}
