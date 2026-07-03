import { Anchor, ArrowRight, ChartLineUp, Compass, ShieldCheck, Waves } from "@phosphor-icons/react";
import type { Session } from "../hooks/useSession";
import { Logo } from "../ui/Logo";
import { GradeStamp } from "../ui/GradeStamp";
import { Spinner } from "../ui/Spinner";
import { OceanCanvas } from "./OceanCanvas";
import { LandingNav } from "./LandingNav";
import { Reveal } from "./Reveal";
import { Counter } from "./Counter";
import { ActVoyage } from "./ActVoyage";
import { useScrollStage } from "./useScrollStage";

export function Landing({ session }: { session: Session }) {
  useScrollStage(true);

  return (
    <div className="relative">
      <LandingNav session={session} />

      {/* ── Act I — Landfall (hero over the living current) ── */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <OceanCanvas className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink" />
        <div className="relative mx-auto w-full max-w-6xl px-5">
          <Reveal>
            <div className="eyebrow flex items-center gap-2">
              <Logo size={16} /> Trade finance · on Polygon · from DIFC
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="mt-5 max-w-3xl font-display text-6xl leading-[1.02] sm:text-7xl">
              Your invoice is a voyage.
              <br />
              <span className="text-brass">Get paid the day it sails.</span>
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-6 max-w-xl text-lg text-mist">
              Instant cross-border payments and working capital for the UAE import/export traders banks won't bank —
              underwritten on your real cash flow, settled in USDC. No bank account required.
            </p>
          </Reveal>
          <Reveal delay={360}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                onClick={() => void session.login()}
                disabled={session.busy}
                className="inline-flex items-center gap-2 rounded-xl bg-brass px-6 py-3.5 font-semibold text-abyss transition-colors hover:bg-brassDeep disabled:opacity-40"
              >
                {session.busy ? <Spinner /> : null}
                Launch the app <ArrowRight weight="bold" size={18} />
              </button>
              <span className="text-sm text-mist">Live on Polygon Amoy · non-custodial</span>
            </div>
          </Reveal>
          <Reveal delay={480}>
            <div className="mt-16 flex flex-wrap gap-10">
              <HeroStat label="Global trade-finance gap" value={<Counter value={2.5} prefix="$" suffix="T" decimals={1} />} />
              <HeroStat label="SME applications rejected" value={<Counter value={40} suffix="%" />} />
              <HeroStat label="…because of missing information" value={<Counter value={74} suffix="%" />} accent />
            </div>
          </Reveal>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-mist/60" aria-hidden>
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Scroll to sail</span>
            <span className="h-8 w-px animate-pulse bg-gradient-to-b from-brass to-transparent" />
          </div>
        </div>
      </section>

      {/* ── Act II — The manifest ── */}
      <section className="relative mx-auto max-w-6xl px-5 py-28">
        <Reveal>
          <div className="eyebrow">Act II · The manifest</div>
          <h2 className="mt-3 max-w-2xl font-display text-4xl sm:text-5xl">
            A Dubai trader is owed <span className="text-brass">AED 500,000</span> — in 60 days.
          </h2>
          <p className="mt-5 max-w-xl text-mist">
            Her buyer is good for it. Her supplier in Shenzhen wants paying now. Her bank says no — thin file, no
            collateral, "high-risk sector." The cargo is real. The financing system just can't see it.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="panel mt-10 grid gap-6 p-6 sm:grid-cols-3">
            <ManifestCell label="Receivable" value="AED 500,000" sub="verified buyer" />
            <ManifestCell label="Terms" value="60 days" sub="net" />
            <ManifestCell label="Bank verdict" value="Rejected" sub="no collateral" muted />
          </div>
        </Reveal>
      </section>

      {/* ── Act III — Setting sail (pinned map centerpiece) ── */}
      <ActVoyage />

      {/* ── Act IV — The verdict (the moat) ── */}
      <section className="relative mx-auto max-w-6xl px-5 py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <div className="eyebrow">Act IV · The verdict</div>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">
                Underwritten in seconds — <span className="text-brass">on cash flow, not collateral.</span>
              </h2>
              <p className="mt-5 max-w-md text-mist">
                Our engine reads her real money movement (via the UAE's Open Finance) and her on-chain repayment
                history, then prices the advance with a full, explainable scorecard. Every decision shows its reasons.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Dual scorecard — the buyer who pays weighs most",
                  "Probability of default → expected-loss pricing",
                  "Adverse-action reason codes on every verdict",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-canvas/90">
                    <ShieldCheck weight="fill" size={18} className="shrink-0 text-foam" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="panel p-6">
              <div className="flex items-start gap-5">
                <GradeStamp grade="A" />
                <div>
                  <div className="eyebrow">Underwriting verdict</div>
                  <div className="mt-1 font-display text-2xl">Prime · grade A</div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <VerdictCell k="Advance" v={<Counter value={88} suffix="%" />} foam />
                    <VerdictCell k="Fee" v={<Counter value={0.82} suffix="%" decimals={2} />} />
                    <VerdictCell k="Default risk" v={<Counter value={1.1} suffix="%" decimals={1} />} />
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-hair bg-abyss/40 p-4 text-sm">
                On a <span className="nums font-mono">AED 500,000</span> invoice she keeps{" "}
                <span className="nums font-mono text-foam">
                  <Counter value={16900} prefix="AED " />
                </span>{" "}
                versus a bank — and the cash lands today.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Act V — Paid early ── */}
      <section className="relative overflow-hidden py-28">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <div className="eyebrow">Act V · Paid early</div>
            <h2 className="mt-3 max-w-2xl font-display text-4xl sm:text-5xl">
              The advance lands. The supplier is paid. Her reputation rises.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <Reveal>
              <FlowCard icon={<Waves weight="fill" size={22} />} label="Settled in USDC on Polygon" value={<Counter value={310914} prefix="AED " />} sub="to the Shenzhen supplier" />
            </Reveal>
            <Reveal delay={120}>
              <FlowCard icon={<ChartLineUp weight="fill" size={22} />} label="On-chain trade-credit score" value={<span>500 → <span className="text-foam"><Counter value={520} /></span></span>} sub="Bronze → Silver" />
            </Reveal>
            <Reveal delay={240}>
              <FlowCard icon={<Compass weight="fill" size={22} />} label="Next advance" value={<span className="text-foam">Bigger · cheaper</span>} sub="the flywheel turns" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Act VI — The fleet (why it scales) ── */}
      <section className="relative mx-auto max-w-6xl px-5 py-28">
        <Reveal>
          <div className="eyebrow">Act VI · The fleet</div>
          <h2 className="mt-3 max-w-2xl font-display text-4xl sm:text-5xl">One voyage today. Every corridor tomorrow.</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Reveal><FleetCard icon={<Anchor weight="fill" size={22} />} title="The moat compounds" body="Payments reveal cash flow → we underwrite better than anyone → cheaper credit → more payments." /></Reveal>
          <Reveal delay={120}><FleetCard icon={<Compass weight="fill" size={22} />} title="Corridor by corridor" body="UAE → India, Pakistan ($24B/yr), Africa. The same rail, the same engine, more trade." /></Reveal>
          <Reveal delay={240}><FleetCard icon={<ShieldCheck weight="fill" size={22} />} title="Non-custodial by design" body="We're the software + underwriting brain. Licensed partners move the money. Capital-light, compliant." /></Reveal>
        </div>
      </section>

      {/* ── Act VII — Harbor (CTA) ── */}
      <section className="relative overflow-hidden py-32">
        <OceanCanvas className="absolute inset-0 h-full w-full opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink via-ink/60 to-ink" />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h2 className="font-display text-5xl leading-tight sm:text-6xl">
              The infrastructure is ready.
              <br />
              <span className="text-brass">The market is waiting.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-mist">
              Cross-border trade finance for the SMEs banks won't bank. Deployed on Polygon, launched from DIFC.
            </p>
            <div className="mt-9 flex justify-center">
              <button
                onClick={() => void session.login()}
                disabled={session.busy}
                className="inline-flex items-center gap-2 rounded-xl bg-brass px-7 py-3.5 font-semibold text-abyss transition-colors hover:bg-brassDeep disabled:opacity-40"
              >
                {session.busy ? <Spinner /> : null}
                Launch the app <ArrowRight weight="bold" size={18} />
              </button>
            </div>
          </Reveal>
        </div>
        <footer className="relative mx-auto mt-24 max-w-6xl px-5 text-xs text-mist">
          <div className="flex items-center gap-2">
            <Logo size={16} className="text-brass" /> dhow — non-custodial. Settlement in USDC on Polygon; AED at the
            edge via licensed partners.
          </div>
        </footer>
      </section>
    </div>
  );
}

function HeroStat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <div className={`font-mono text-3xl ${accent ? "text-brass" : "text-canvas"}`}>{value}</div>
      <div className="mt-1 max-w-[12rem] text-xs text-mist">{label}</div>
    </div>
  );
}

function ManifestCell({ label, value, sub, muted }: { label: string; value: string; sub: string; muted?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`nums mt-1.5 font-mono text-2xl ${muted ? "text-teak" : "text-canvas"}`}>{value}</div>
      <div className="text-xs text-mist">{sub}</div>
    </div>
  );
}

function VerdictCell({ k, v, foam }: { k: string; v: React.ReactNode; foam?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{k}</div>
      <div className={`mt-1 font-mono text-xl ${foam ? "text-foam" : "text-canvas"}`}>{v}</div>
    </div>
  );
}

function FlowCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="panel p-6">
      <span className="text-brass">{icon}</span>
      <div className="mt-4 font-mono text-2xl">{value}</div>
      <div className="mt-2 text-sm text-canvas/90">{label}</div>
      <div className="text-xs text-mist">{sub}</div>
    </div>
  );
}

function FleetCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="panel h-full p-6">
      <span className="text-brass">{icon}</span>
      <div className="mt-4 font-display text-xl">{title}</div>
      <p className="mt-2 text-sm text-mist">{body}</p>
    </div>
  );
}
