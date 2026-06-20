export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-canvas/30 border-t-brass ${className}`}
      aria-hidden
    />
  );
}
