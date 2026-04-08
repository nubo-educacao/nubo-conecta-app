'use client';

// ChatFAB — Sprint 03 Épico 1C
// Floating Action Button that toggles ChatDrawer.
// Fixed position, above BottomNav on mobile (z-30 + bottom offset).

import { useState } from 'react';
import { CloudLightning, X } from 'lucide-react';
import ChatDrawer from './ChatDrawer';

export default function ChatFAB() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed z-30 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 76px)', // above BottomNav (64px) + 12px gap
          right: '16px',
          width: 52,
          height: 52,
          background: isOpen
            ? 'rgba(255,255,255,0.9)'
            : 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)',
          border: isOpen ? '2px solid rgba(56,177,228,0.4)' : 'none',
          boxShadow: '0 8px 24px rgba(2,79,134,0.35)',
        }}
        aria-label={isOpen ? 'Fechar Cloudinha' : 'Abrir Cloudinha'}
      >
        {isOpen ? (
          <X size={22} style={{ color: '#38B1E4' }} />
        ) : (
          <CloudLightning size={22} color="white" />
        )}
      </button>

      {/* Drawer — rendered when open */}
      {isOpen && <ChatDrawer onClose={() => setIsOpen(false)} />}
    </>
  );
}
