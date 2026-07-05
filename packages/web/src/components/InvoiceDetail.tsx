import { useEffect } from "react";
import { ArrowSquareOut, X } from "@phosphor-icons/react";
import type { InvoiceRow } from "../lib/types";
import { fmtDate, fmtUsd, fromBaseUnits, explorerTx, shortAddr } from "../lib/format";
import { VoyageLine } from "./VoyageLine";

const STATUS_COLOR: Record<InvoiceRow["status"], string> = {
  REGISTERED: "text-mist border-hair",
  VERIFIED: "text-brass border-brass/40",
  FINANCED: "text-foam border-foam/40",
  REPAID: "text-foam border-foam/40",
  DEFAULTED: "text-teak border-teak/50",
  CANCELLED: "text-mist border-hair",
};

/** A read-only detail drawer for one invoice, with on-chain proof links. */
export function InvoiceDetail({ invoice, chainId, onClose }: { invoice: InvoiceRow; chainId?: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const amount = fromBaseUnits(invoice.amount);
  const adv = invoice.advance;
  const totalDue = adv ? fromBaseUnits((BigInt(adv.principal) + BigInt(adv.feeAmount)).toString()) : 0;
  const repaid = adv ? fromBaseUnits(adv.repaid) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel max-h-[88vh] w-full max-w-2xl overflow-y-auto p-7"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="nums font-mono text-3xl">{fmtUsd(amount)}</span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_COLOR[invoice.status]}`}
              >
                {invoice.status.toLowerCase()}
              </span>
            </div>
            <div className="mt-1 font-mono text-xs text-mist">{invoice.externalRef}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-mist hover:bg-canvas/5 hover:text-canvas" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6">
          <VoyageLine dueDate={invoice.dueDate} financed={invoice.status === "FINANCED" || invoice.status === "REPAID"} />
        </div>

        {/* invoice facts */}
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
          <Row label="Buyer" value={invoice.debtor ? shortAddr(invoice.debtor) : "Not specified"} />
          <Row label="Due date" value={fmtDate(invoice.dueDate)} />
          <Row label="Registered" value={fmtDate(invoice.createdAt)} />
          <Row label="On-chain invoice" value={invoice.onChainId != null ? `#${invoice.onChainId}` : "-"} />
        </div>

        {/* financing */}
        {adv ? (
          <div className="mt-7 rounded-xl border border-hair bg-abyss/40 p-5">
            <div className="eyebrow">Financing</div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <Row label="Advance" value={fmtUsd(fromBaseUnits(adv.principal))} accent="foam" />
              <Row label="Fee" value={fmtUsd(fromBaseUnits(adv.feeAmount))} />
              <Row label="Total to settle" value={fmtUsd(totalDue)} accent="brass" />
              <Row label="Repaid" value={fmtUsd(repaid)} />
              <Row label="Advance status" value={adv.status.toLowerCase()} />
              {adv.disbursedAt ? <Row label="Disbursed" value={fmtDate(adv.disbursedAt)} /> : null}
            </div>
          </div>
        ) : null}

        {/* on-chain proof */}
        <div className="mt-7">
          <div className="eyebrow">On-chain proof</div>
          <div className="mt-3 flex flex-col gap-2">
            {invoice.registerTx ? <TxLink label="Registration" hash={invoice.registerTx} chainId={chainId} /> : null}
            {adv?.disburseTx ? <TxLink label="Disbursement" hash={adv.disburseTx} chainId={chainId} /> : null}
            {adv?.repayTx ? <TxLink label="Repayment" hash={adv.repayTx} chainId={chainId} /> : null}
            {!invoice.registerTx && !adv?.disburseTx ? (
              <div className="text-sm text-mist">No on-chain transactions yet.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: "foam" | "brass" }) {
  const color = accent === "foam" ? "text-foam" : accent === "brass" ? "text-brass" : "text-canvas";
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`nums mt-1 font-mono text-base ${color}`}>{value}</div>
    </div>
  );
}

function TxLink({ label, hash, chainId }: { label: string; hash: string; chainId?: number }) {
  return (
    <a
      href={explorerTx(hash, chainId)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border border-hair bg-panel/40 px-4 py-3 transition-colors hover:border-brass/50"
    >
      <span className="text-sm text-canvas">{label}</span>
      <span className="flex items-center gap-2 font-mono text-xs text-mist">
        {shortAddr(hash)}
        <ArrowSquareOut size={15} className="text-brass" />
      </span>
    </a>
  );
}
