import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { GRADE_LABEL, GradeStamp } from "../ui/GradeStamp";
import type { Session } from "../hooks/useSession";

export function Connect({ session }: { session: Session }) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <div className="eyebrow">For the traders banks won't bank</div>
        <h1 className="mt-4 font-display text-5xl leading-[1.04] sm:text-6xl">
          Your invoice is a voyage.<br />
          <span className="text-brass">Get paid the day it sails.</span>
        </h1>
        <p className="mt-6 max-w-md text-mist">
          Pay overseas suppliers in seconds and turn what your buyers owe into working capital today — underwritten on
          your real cash flow, settled in USDC on Polygon. No bank account required.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={() => void session.login()} disabled={session.busy}>
            {session.busy ? <Spinner /> : null} Connect wallet to start
          </Button>
          <span className="text-xs text-mist">Sign in with your wallet · nothing custodial</span>
        </div>
        <div className="mt-10 flex flex-wrap gap-8">
          <Mini label="SME bank-finance rejections" value="40%" />
          <Mini label="Bank cost · wait" value="3–5% · ~3d" />
          <Mini label="dhow" value="<1% · ~8s" accent />
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex items-start gap-5">
          <GradeStamp grade="A" />
          <div>
            <div className="eyebrow">Underwriting verdict · sample</div>
            <div className="mt-1 font-display text-2xl">{GRADE_LABEL.A} · grade A</div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Cell k="Advance" v="$88,000" s="88% of invoice" foam />
              <Cell k="Fee" v="0.82%" s="82 bps" />
              <Cell k="Get paid" v="~8 sec" s="vs ~3 days" />
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-hair bg-abyss/40 p-4 text-sm">
          On a <span className="nums font-mono">$100,000</span> invoice you keep{" "}
          <span className="nums font-mono text-foam">$3,380</span> versus a bank — and the cash lands today.
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`nums mt-1 font-mono text-lg ${accent ? "text-foam" : "text-canvas"}`}>{value}</div>
    </div>
  );
}

function Cell({ k, v, s, foam }: { k: string; v: string; s?: string; foam?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{k}</div>
      <div className={`nums mt-1 font-mono text-lg ${foam ? "text-foam" : "text-canvas"}`}>{v}</div>
      {s ? <div className="text-xs text-mist">{s}</div> : null}
    </div>
  );
}
