import type { Decision } from "../lib/types";
import { GRADE_LABEL, GradeStamp } from "../ui/GradeStamp";
import { bpsToPct, fmtPct, fmtUsd } from "../lib/format";

const BANK_FEE_PCT = 0.042; // research baseline: banks ~3–5% all-in
const BANK_DAYS = 3;

export function VerdictCard({ decision, invoiceAmount }: { decision: Decision; invoiceAmount: number }) {
  const declined = !decision.approved;
  const dhowFeePct = bpsToPct(decision.feeBps);
  const advance = invoiceAmount * decision.advancePct;
  const dhowCost = invoiceAmount * dhowFeePct;
  const bankCost = invoiceAmount * BANK_FEE_PCT;
  const saved = Math.max(0, bankCost - dhowCost);

  return (
    <div className="panel p-6">
      <div className="flex items-start gap-5">
        <GradeStamp grade={decision.grade} />
        <div className="min-w-0 flex-1">
          <div className="eyebrow">Underwriting verdict</div>
          <div className="mt-1 font-display text-2xl">
            {declined ? "Not financeable yet" : `${GRADE_LABEL[decision.grade]} · grade ${decision.grade}`}
          </div>
          {!declined ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Cell k="Advance" v={fmtUsd(advance)} s={`${fmtPct(decision.advancePct)} of invoice`} foam />
              <Cell k="Fee" v={fmtPct(dhowFeePct, 2)} s={`${decision.feeBps} bps`} />
              <Cell k="Default risk" v={fmtPct(decision.pd, 1)} s={decision.modelVersion} />
            </div>
          ) : null}
        </div>
      </div>

      {!declined ? (
        <div className="mt-6 rounded-xl border border-hair bg-abyss/40 p-4">
          <div className="eyebrow">Bank vs Dhow on this invoice</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <CompareRow who="A bank" cost={fmtUsd(bankCost)} when={`~${BANK_DAYS} days`} muted />
            <CompareRow who="Dhow" cost={fmtUsd(dhowCost)} when="~8 seconds" />
          </div>
          {saved > 0 ? (
            <div className="mt-3 text-sm text-foam">
              You keep <span className="nums font-mono">{fmtUsd(saved)}</span> — and get paid today.
            </div>
          ) : null}
        </div>
      ) : null}

      {decision.reasonCodes.length > 0 ? (
        <div className="mt-5">
          <div className="eyebrow">{declined ? "Why" : "What shaped this"}</div>
          <ul className="mt-2 space-y-1.5">
            {decision.reasonCodes.map((r) => (
              <li key={r.code} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-canvas/90">{r.description}</span>
                <span className="nums shrink-0 font-mono text-xs text-mist">−{r.pointsLost}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {declined && decision.guardrailsTriggered.length > 0 ? (
        <div className="mt-4 text-xs text-mist">Guardrails: {decision.guardrailsTriggered.join(", ")}</div>
      ) : null}
    </div>
  );
}

function Cell({ k, v, s, foam }: { k: string; v: string; s?: string; foam?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{k}</div>
      <div className={`nums mt-1 font-mono text-xl ${foam ? "text-foam" : "text-canvas"}`}>{v}</div>
      {s ? <div className="truncate text-xs text-mist">{s}</div> : null}
    </div>
  );
}

function CompareRow({ who, cost, when, muted }: { who: string; cost: string; when: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${muted ? "bg-canvas/[0.03]" : "bg-foam/[0.06]"}`}>
      <span className="text-sm">{who}</span>
      <span className="text-right">
        <span className={`nums font-mono ${muted ? "text-mist" : "text-foam"}`}>{cost}</span>
        <span className="ml-2 text-xs text-mist">{when}</span>
      </span>
    </div>
  );
}
