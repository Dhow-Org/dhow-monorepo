/** The dhow's lateen sail — the brand mark. */
export function Sail({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* mast */}
      <path d="M12 2 V20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      {/* lateen sail */}
      <path d="M12 3 L20 18 L12 18 Z" fill="currentColor" opacity="0.95" />
      <path d="M12 6 L6 18 L12 18 Z" fill="currentColor" opacity="0.55" />
      {/* hull / waterline */}
      <path d="M4 20 Q12 23 20 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
