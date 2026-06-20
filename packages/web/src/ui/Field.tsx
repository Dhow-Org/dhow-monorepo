import { type InputHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        className="mt-1.5 w-full rounded-xl border border-hair bg-abyss/50 px-3 py-2.5 text-sm text-canvas placeholder:text-mist/60 focus:border-brass/60 focus:outline-none"
        {...props}
      />
      {hint ? <span className="mt-1 block text-xs text-mist">{hint}</span> : null}
    </label>
  );
}
