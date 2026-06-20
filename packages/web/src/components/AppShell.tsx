import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sail } from "../ui/Sail";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { shortAddr } from "../lib/format";
import type { Session } from "../hooks/useSession";

export function AppShell({ session, children }: { session: Session; children: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-hair bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-brass">
              <Sail size={24} />
            </span>
            <span className="font-display text-xl tracking-tight">dhow</span>
            <span className="hidden text-xs text-mist sm:inline">· trade finance, on Polygon</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" active={loc.pathname === "/"}>
              Cockpit
            </NavLink>
            <NavLink to="/pool" active={loc.pathname === "/pool"}>
              Pool
            </NavLink>
            <div className="ml-2">
              {session.authed ? (
                <Button variant="outline" onClick={session.logout}>
                  {shortAddr(session.address)} · sign out
                </Button>
              ) : (
                <Button onClick={() => void session.login()} disabled={session.busy}>
                  {session.busy ? <Spinner /> : null} Connect wallet
                </Button>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-5 py-10 text-xs text-mist">
        dhow — non-custodial. Settlement in USDC on Polygon; AED at the edge via licensed partners.
      </footer>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={`rounded-lg px-3 py-2 text-sm transition-colors ${active ? "text-brass" : "text-mist hover:text-canvas"}`}
    >
      {children}
    </Link>
  );
}
