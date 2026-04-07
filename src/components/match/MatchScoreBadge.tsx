'use client';

// MatchScoreBadge — Sprint 03 Épico 1B
// Pill badge showing match percentage with color-coded severity.
// Green ≥80%, Yellow ≥60%, Red <60%

interface MatchScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

function scoreColor(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: '#dcfce7', text: '#16a34a' };
  if (score >= 60) return { bg: '#fef9c3', text: '#ca8a04' };
  return { bg: '#fee2e2', text: '#dc2626' };
}

export default function MatchScoreBadge({ score, size = 'md' }: MatchScoreBadgeProps) {
  const { bg, text } = scoreColor(score);
  const padX = size === 'sm' ? '8px' : '12px';
  const padY = size === 'sm' ? '3px' : '5px';
  const fontSize = size === 'sm' ? '11px' : '13px';

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap"
      style={{
        backgroundColor: bg,
        color: text,
        paddingLeft: padX,
        paddingRight: padX,
        paddingTop: padY,
        paddingBottom: padY,
        fontSize,
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {Math.round(score)}% match
    </span>
  );
}
