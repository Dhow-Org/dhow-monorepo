/** The Dhow mark — a lateen sail set in a brass coin ("Seal"). Mono, uses
 *  currentColor so it inherits brass/canvas/ink from context. */
export function Logo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="24" r="16.5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4.5" opacity="0.55" />
      <path d="M24 13 V31" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
      <path d="M24 15 L33 31 L24 31 Z" fill="currentColor" />
      <path d="M24 18 L17 31 L24 31 Z" fill="currentColor" opacity="0.5" />
      <path d="M15 32.5 Q24 36.5 33 32.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
