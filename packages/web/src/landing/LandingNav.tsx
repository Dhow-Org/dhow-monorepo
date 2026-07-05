import { useEffect, useState } from "react";
import { Logo } from "../ui/Logo";
import { Spinner } from "../ui/Spinner";
import type { Session } from "../hooks/useSession";

export function LandingNav({ session }: { session: Session }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled ? "border-b border-hair bg-ink/70 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-brass">
            <Logo size={26} />
          </span>
          <span className="font-display text-xl tracking-tight">Dhow</span>
        </div>
        <button
          onClick={() => void session.login()}
          disabled={session.busy}
          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-abyss transition-colors hover:bg-brassDeep disabled:opacity-40"
        >
          {session.busy ? <Spinner /> : null}
          Launch app
        </button>
      </div>
    </header>
  );
}
