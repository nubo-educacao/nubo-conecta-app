'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, GraduationCap, Star, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UnifiedInstitution } from '@/types/institutions';
import { cn } from '@/lib/utils';

interface InstitutionCardProps {
  institution: UnifiedInstitution;
  onClick?: () => void;
  className?: string;
}

export default function InstitutionCard({
  institution,
  onClick,
  className
}: InstitutionCardProps) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleViewDetails = () => {
    if (onClick) {
      onClick();
      return;
    }
    router.push(`/instituicoes/${institution.id}`);
  };

  const isPartner = institution.type === 'partner';
  
  // Nubo Colors
  const nuboPrimary = '#3092BB';
  const brandColor = (isPartner && institution.brand_color) ? institution.brand_color : '#7030C2'; // Use partner brand color or default partner purple
  
  // Theme similar to OpportunityCard
  const themes = {
    partner: {
      cardBg: `linear-gradient(90deg, ${brandColor} 0%, ${brandColor} 100%), linear-gradient(-78.71deg, rgba(0, 0, 0, 0.46) 19.1%, rgba(51, 51, 51, 0.46) 56.52%, rgba(102, 102, 102, 0.46) 98.2%)`,
      btnText: brandColor,
      hoverBorder: '#FF9900',
    },
    default: {
      cardBg: 'linear-gradient(239.86deg, rgba(48, 146, 187, 0.8) 9.15%, #3092BB 59.27%)',
      btnText: '#3092BB',
      hoverBorder: '#3092BB',
    }
  };

  const currentTheme = themes[isPartner ? 'partner' : 'default'];
  
  const coverUrl = institution.cover_url;
  const hasCoverImage = !!(coverUrl && !imgError && coverUrl !== 'null' && coverUrl !== '');

  // Determine the header image to use
  const headerImage = !isPartner
    ? '/assets/card-header-default.png'
    : (hasCoverImage ? coverUrl : '/assets/card-header-partner.png');

  if (institution.id === '776ba6cf-5d38-4d6c-8000-5c3691c437ad') {
    console.log('[DEBUG] Aurora Card Props:', {
      brand_color: institution.brand_color,
      logo_url: institution.logo_url,
      cover_url: institution.cover_url,
      hasCoverImage,
      isPartner,
      headerImage
    });
  }

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
        "group relative w-full max-w-[361px] h-[254px] rounded-[16px] overflow-hidden cursor-pointer flex flex-col",
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
        <div 
          className="absolute top-0 left-0 w-full h-[20px] flex items-center justify-center gap-1.5 z-50"
          style={{ backgroundColor: brandColor }}
        >
          <Star size={10} fill="#FFD700" color="#FFD700" />
          <span className="text-white text-[11px] font-medium">Instituição parceira</span>
        </div>
      )}

      {/* ── Top Controls ── */}
      <div className={cn(
        "absolute inset-x-4 z-40 flex items-center justify-end",
        isPartner ? "top-[36px]" : "top-[32px]"
      )}>
        <button
          onClick={(e) => { e.stopPropagation(); }}
          className="bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center size-[32px] transition-all border border-white/40 shadow-sm"
        >
          <Heart size={16} color="white" fill="none" strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Logo Frame ── */}
      <div 
        className={cn(
          "absolute left-4 z-40 bg-white rounded-[14px] flex items-center justify-center size-[44px]",
          "shadow-[0px_4px_12px_rgba(0,0,0,0.15)] overflow-hidden",
          isPartner ? "top-[64px]" : "top-[64px]"
        )}
      >
        {institution.logo_url && !logoError ? (
          <img 
            src={institution.logo_url} 
            alt="Logo" 
            onError={() => setLogoError(true)}
            className="w-full h-full object-contain p-1" 
          />
        ) : (
          <BookOpen size={24} strokeWidth={1.5} style={{ color: currentTheme.btnText }} />
        )}
      </div>

      {/* ── Cloud Overlay + White Body ── */}
      <div className="absolute top-[84px] left-0 w-full z-10 pointer-events-none">
        <div className="relative w-full h-[35px]">
          <img
            src="/assets/card-background.svg"
            alt="Cloud Border"
            className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="bg-white w-full h-[300px] mt-[-2px]" />
      </div>

      {/* ── Content Section ── */}
      <div className="absolute inset-x-0 top-[95px] bottom-0 px-5 pb-5 pt-3 flex flex-col justify-between z-20 bg-transparent">
        
        <div className="space-y-1 mt-4">
          <div>
            <h3 className="font-semibold text-[14px] leading-tight text-[#3A424E] line-clamp-1">
              {institution.name}
            </h3>
          </div>

          <div className="space-y-1 mt-1">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#3A424E]/70">
              <MapPin size={14} strokeWidth={1.5} className="shrink-0" style={{ color: currentTheme.btnText }} />
              <span className="truncate">{institution.location || "Nacional / Internacional"}</span>
            </div>
            
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#3A424E]/70">
              <GraduationCap size={14} strokeWidth={1.5} className="shrink-0" style={{ color: currentTheme.btnText }} />
              <span className="truncate">
                {institution.opp_types && institution.opp_types.length > 0 
                  ? institution.opp_types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')
                  : 'Prouni, Sisu, Programas e Cursinhos'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleViewDetails(); }}
          className="relative w-full h-[32px] rounded-full overflow-hidden flex items-center justify-center transition-all mt-2 shadow-[0px_8px_16px_rgba(0,0,0,0.12)] hover:brightness-95 active:scale-[0.98]"
        >
          <div className="absolute inset-0 opacity-15" style={{ background: currentTheme.btnText }} />
          <span className="relative z-10 font-semibold text-[13px]" style={{ color: currentTheme.btnText }}>
            Ver detalhes
          </span>
        </button>
      </div>
    </motion.div>
  );
}
