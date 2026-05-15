'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteInstitutionButtonProps {
  institutionId: string;
}

export default function FavoriteInstitutionButton({ institutionId }: FavoriteInstitutionButtonProps) {
  // Temporary local state until backend supports institution favorites
  const [isFavorited, setIsFavorited] = useState(false);

  return (
    <button
      onClick={() => setIsFavorited(!isFavorited)}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm transition-colors text-white hover:bg-white/30 border border-white/30"
      aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Heart size={18} className={cn(isFavorited && "fill-red-500 text-red-500 border-none")} />
    </button>
  );
}
