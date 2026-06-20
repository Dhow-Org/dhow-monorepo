export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "brass" | "foam";
}) {
  const color = accent === "foam" ? "text-foam" : accent === "brass" ? "text-brass" : "text-canvas";
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`nums mt-1.5 font-mono text-2xl ${color}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-mist">{sub}</div> : null}
    </div>
  );
}
