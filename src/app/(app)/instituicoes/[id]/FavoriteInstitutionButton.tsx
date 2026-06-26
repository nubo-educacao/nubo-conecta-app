'use client';

import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/contexts/FavoritesContext';

interface FavoriteInstitutionButtonProps {
  institutionId: string;
}

export default function FavoriteInstitutionButton({ institutionId }: FavoriteInstitutionButtonProps) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const favorited = isFavorited(`institution_${institutionId}`);

  return (
    <button
      onClick={() => toggleFavorite(`institution_${institutionId}`)}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm transition-colors text-white hover:bg-white/30 border border-white/30"
      aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Heart size={18} className={cn(favorited && "fill-red-500 text-red-500 border-none")} />
    </button>
  );
}
