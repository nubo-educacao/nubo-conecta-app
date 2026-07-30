'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Paginator({ currentPage, totalPages }: { currentPage: number, totalPages: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2 justify-center mt-6">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center justify-center w-9 h-9 rounded-full transition-all disabled:opacity-30"
        style={{ background: 'rgba(48,146,187,0.1)' }}
      >
        <ChevronLeft size={16} style={{ color: '#38B1E4' }} />
      </button>
      <span
        className="text-[13px] font-bold px-3 py-1.5 rounded-full"
        style={{ background: '#38B1E4', color: '#fff', fontFamily: 'Montserrat, sans-serif' }}
      >
        {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex items-center justify-center w-9 h-9 rounded-full transition-all disabled:opacity-30"
        style={{ background: 'rgba(48,146,187,0.1)' }}
      >
        <ChevronRight size={16} style={{ color: '#38B1E4' }} />
      </button>
    </div>
  );
}
