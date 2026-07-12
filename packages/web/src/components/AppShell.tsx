import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useChainId, useSwitchChain } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { Logo } from "../ui/Logo";
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
              <Logo size={26} />
            </span>
            <span className="font-display text-xl tracking-tight">Dhow</span>
            <span className="hidden text-xs text-mist sm:inline">· trade finance, on Polygon</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" active={loc.pathname === "/"}>
              Cockpit
            </NavLink>
            <NavLink to="/bills" active={loc.pathname === "/bills"}>
              Bills
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
      <WrongNetwork />
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-5 py-10 text-xs text-mist">
        Dhow — non-custodial. Settlement in USDC on Polygon; AED at the edge via licensed partners.
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

/** Warn (and offer a one-click fix) if the wallet is on the wrong chain. */
function WrongNetwork() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  if (chainId === polygonAmoy.id) return null;
  return (
    <div className="border-b border-teak/40 bg-teak/15">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <span className="text-sm text-canvas">
          Your wallet is on the wrong network. Dhow runs on <b>Polygon Amoy</b>. Transactions will fail until you switch.
        </span>
        <button
          onClick={() => switchChain({ chainId: polygonAmoy.id })}
          className="rounded-lg bg-brass px-3.5 py-1.5 text-sm font-semibold text-abyss hover:bg-brassDeep"
        >
          Switch to Polygon Amoy
        </button>
      </div>
    </div>
  );
}
