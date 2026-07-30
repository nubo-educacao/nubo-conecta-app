'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface CampusFilterProps {
  locations: string[];
}

export default function CampusFilter({ locations }: CampusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLocation = searchParams.get('location');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  if (locations.length <= 1) return null;

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [locations]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleSelect = (loc: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (loc) {
      params.set('location', loc);
    } else {
      params.delete('location');
    }
    params.delete('page'); // Reset pagination
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full mb-6 relative">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-[#636e7c] hover:text-[#38B1E4] transition-all hover:scale-105 active:scale-95"
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-2 overflow-x-auto scroll-smooth p-1 -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Hide scrollbar for Webkit via CSS */}
        <style dangerouslySetInnerHTML={{__html: `
          div::-webkit-scrollbar { display: none; }
        `}} />
        
        <button
          onClick={() => handleSelect(null)}
          className={cn(
            "flex items-center gap-1.5 px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 font-semibold text-[13px] active:scale-95",
            !selectedLocation
              ? "bg-[#38B1E4] text-white shadow-md shadow-[#38B1E4]/20"
              : "bg-white/60 text-[#636e7c] hover:bg-white border border-[#38B1E4]/20"
          )}
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          <MapPin size={14} className={!selectedLocation ? "text-white" : "text-[#38B1E4]"} />
          Todos os Campus
        </button>

        {locations.map((loc) => (
          <button
            key={loc}
            onClick={() => handleSelect(loc)}
            className={cn(
              "flex items-center px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 font-semibold text-[13px] active:scale-95",
              selectedLocation === loc
                ? "bg-[#38B1E4] text-white shadow-md shadow-[#38B1E4]/20"
                : "bg-white/60 text-[#636e7c] hover:bg-white border border-gray-200/60 hover:border-[#38B1E4]/30"
            )}
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {loc}
          </button>
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-[#636e7c] hover:text-[#38B1E4] transition-all hover:scale-105 active:scale-95"
          aria-label="Rolar para direita"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
