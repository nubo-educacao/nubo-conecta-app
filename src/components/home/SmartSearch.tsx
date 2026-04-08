'use client';

// SmartSearch — Sprint 03 Épico 1A
// Search bar that redirects to /oportunidades?q=<query> on submit.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/oportunidades?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.75)',
          border: '1px solid rgba(56,177,228,0.25)',
          boxShadow: '0px 4px 20px rgba(56,177,228,0.1)',
        }}
      >
        <Search size={18} style={{ color: '#38B1E4', flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cursos, bolsas, universidades..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
          style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
        />
        {query.trim() && (
          <button
            type="submit"
            className="flex-shrink-0 px-3 py-1 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
          >
            Buscar
          </button>
        )}
      </div>
    </form>
  );
}
