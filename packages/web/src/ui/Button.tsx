import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "brass" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  brass: "bg-brass text-abyss hover:bg-brassDeep font-semibold",
  ghost: "bg-transparent text-canvas hover:bg-canvas/5",
  outline: "border border-hair text-canvas hover:border-brass/60 hover:text-brass",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ variant = "brass", className = "", ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${className}`}
    {...props}
  />
));
Button.displayName = "Button";
