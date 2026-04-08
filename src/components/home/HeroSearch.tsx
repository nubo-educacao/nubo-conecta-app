'use client';

// HeroSearch — Sprint 3.5 (rev. Design Review)
// Container arredondado com gradiente azul, input translúcido e pills de filtro rápido.
// NÃO é seção edge-to-edge: o componente carrega seu próprio px-4 e rounded-2xl.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

const QUICK_FILTERS = [
  { label: 'Graduação', q: 'graduação' },
  { label: 'Pós-Graduação', q: 'pós-graduação' },
  { label: 'Programas', q: 'programas' },
  { label: 'Bolsas', q: 'bolsas' },
  { label: 'Intercâmbio', q: 'intercâmbio' },
];

export default function HeroSearch() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/oportunidades?q=${encodeURIComponent(q)}`);
  }

  function handlePillClick(q: string) {
    router.push(`/oportunidades?q=${encodeURIComponent(q)}`);
  }

  return (
    /* Padding externo + container arredondado — não é section ponta-a-ponta */
    <div className="px-4 max-w-7xl mx-auto w-full">
      <div
        className="rounded-2xl px-5 pt-7 pb-7 flex flex-col gap-5"
        style={{
          background: 'linear-gradient(145deg, #38B1E4 0%, #024F86 100%)',
        }}
      >
        {/* Textos */}
        <div>
          <h2
            className="text-[22px] font-bold leading-snug text-white"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Encontre sua oportunidade ideal
          </h2>
          <p
            className="text-sm mt-1"
            style={{
              color: 'rgba(255,255,255,0.72)',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Busque por faculdade, curso, cidade ou estado
          </p>
        </div>

        {/* Input de busca */}
        <form onSubmit={handleSubmit} className="w-full">
          <div
            className="flex items-center gap-3 px-5 py-3.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.35)',
            }}
          >
            <Search size={18} className="text-white shrink-0" strokeWidth={2} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Medicina em São Paulo..."
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/50"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            />
            {/* Botão: círculo perfeito com ArrowRight */}
            <button
              type="submit"
              className="flex-shrink-0 flex items-center justify-center rounded-full transition-all hover:bg-white/25 active:scale-[0.95]"
              style={{
                width: 34,
                height: 34,
                background: 'rgba(255,255,255,0.18)',
              }}
              aria-label="Buscar"
            >
              <ArrowRight size={16} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        </form>

        {/* Pills de filtro rápido */}
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map(({ label, q }) => (
            <button
              key={label}
              onClick={() => handlePillClick(q)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-white/25 active:scale-[0.97]"
              style={{
                background: 'rgba(255,255,255,0.16)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.28)',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
