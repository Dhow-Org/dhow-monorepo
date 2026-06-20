export const GRADE_LABEL: Record<string, string> = {
  A: "Prime",
  B: "Strong",
  C: "Fair",
  D: "Watch",
  E: "High risk",
  DECLINE: "Declined",
};

/** The signature element: the underwriting verdict as a brass manifest seal. */
export function GradeStamp({ grade, size = 84 }: { grade: string; size?: number }) {
  const declined = grade === "DECLINE";
  const ring = declined ? "border-teak/70" : "border-brass/70";
  const ringDash = declined ? "border-teak/40" : "border-brass/40";
  const ink = declined ? "text-teak" : "text-brass";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <div className={`absolute inset-0 rounded-full border-2 ${ring}`} />
      <div className={`absolute inset-[6px] rounded-full border border-dashed ${ringDash}`} />
      <span className={`font-display text-3xl leading-none ${ink}`}>{declined ? "—" : grade}</span>
    </div>
  );
}
