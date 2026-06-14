'use client';

import * as React from 'react';

interface CoverImageProps {
  src?: string | null;
  isPartner: boolean;
  alt: string;
}

export default function CoverImage({ src, isPartner, alt }: CoverImageProps) {
  const [coverStatus, setCoverStatus] = React.useState<'initial' | 'fallback' | 'failed'>('initial');

  const mobileFallback = isPartner ? "/assets/institution-partner-cover.png" : "/assets/institution-cover.png";
  const desktopFallback = isPartner ? "/assets/institution-partner-desktop-cover.png" : "/assets/institution-desktop-cover.png";

  const hasCustomCover = !!src;
  const useFallback = !hasCustomCover || coverStatus === 'fallback';

  const currentDesktopSrc = useFallback ? desktopFallback : (src || '');
  const currentMobileSrc = useFallback ? mobileFallback : (src || '');

  if (coverStatus === 'failed') {
    return null;
  }

  return (
    <picture className="w-full h-full">
      <source media="(min-width: 768px)" srcSet={currentDesktopSrc} />
      <img
        src={currentMobileSrc}
        alt={alt}
        className="w-full h-full object-cover mix-blend-soft-light opacity-80"
        onError={() => {
          if (coverStatus === 'initial' && hasCustomCover) {
            setCoverStatus('fallback');
          } else {
            setCoverStatus('failed');
          }
        }}
      />
    </picture>
  );
}
