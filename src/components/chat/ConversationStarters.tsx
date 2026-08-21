'use client';

// ConversationStarters — Sprint 03 Épico 1C
// Shows starter chips before the first message, or dynamic suggestions after a reply.

interface ConversationStartersProps {
  starters: string[];
  introMessage?: string;
  onSelect: (starter: string) => void;
}

export default function ConversationStarters({
  starters,
  introMessage,
  onSelect,
}: ConversationStartersProps) {
  if (starters.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      {introMessage && (
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%]"
          style={{
            background: 'rgba(56,177,228,0.12)',
            color: '#3a424e',
            fontFamily: 'Montserrat, sans-serif',
            border: '1px solid rgba(56,177,228,0.15)',
          }}
        >
          {introMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {starters.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="text-left px-3 py-2 rounded-xl text-xs font-medium transition-all hover:shadow-sm active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.8)',
              color: '#3092bb',
              border: '1px solid rgba(48,146,187,0.3)',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
