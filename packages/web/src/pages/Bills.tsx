import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useBills, useConfig } from "../hooks/useApi";
import { useBuyerActions } from "../hooks/useBuyerActions";
import type { Session } from "../hooks/useSession";
import type { InvoiceRow } from "../lib/types";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { fmtUsd, fromBaseUnits } from "../lib/format";

export function Bills({ session }: { session: Session }) {
  const config = useConfig();
  const bills = useBills(session.authed ? session.address : undefined);
  const { faucet, pay, busy, error } = useBuyerActions(config.data);
  const qc = useQueryClient();
  const [note, setNote] = useState<string | null>(null);

  const onPay = async (inv: InvoiceRow) => {
    if (!inv.advance?.onChainId) return;
    const total = BigInt(inv.advance.principal) + BigInt(inv.advance.feeAmount);
    const ok = await pay(inv.advance.onChainId, total);
    if (ok) {
      setNote("Paid. The advance is cleared and the supplier's on-chain score will rise.");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["bills"] }), 1500);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="eyebrow">Buyer view</div>
        <h1 className="mt-2 font-display text-4xl">Bills to pay</h1>
        <p className="mt-3 max-w-lg text-mist">
          Invoices you owe that a supplier financed through dhow. Paying settles the advance directly from your wallet —
          this is the repayment that clears the loan and lifts the supplier's credit score.
        </p>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="eyebrow">Testnet funds</div>
          <div className="mt-1 text-sm text-mist">Need test USDC to pay? Mint some to your wallet.</div>
        </div>
        <Button
          variant="outline"
          disabled={busy === "faucet" || !session.address}
          onClick={() => session.address && faucet(session.address as Address)}
        >
          {busy === "faucet" ? <Spinner /> : null} Get 200,000 test USDC
        </Button>
      </div>

      {error ? <div className="rounded-xl border border-teak/40 bg-teak/10 p-3 text-sm text-teak">{error}</div> : null}
      {note ? <div className="rounded-xl border border-foam/30 bg-foam/10 p-3 text-sm text-foam">{note}</div> : null}

      {bills.isLoading ? (
        <div className="flex items-center gap-2 text-mist">
          <Spinner /> Loading bills…
        </div>
      ) : bills.data && bills.data.length > 0 ? (
        <div className="space-y-4">
          {bills.data.map((inv) => {
            const total = inv.advance ? BigInt(inv.advance.principal) + BigInt(inv.advance.feeAmount) : 0n;
            return (
              <div key={inv.id} className="panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="nums font-mono text-xl">{fmtUsd(fromBaseUnits(inv.amount))}</div>
                    <div className="mt-1 text-xs text-mist">{inv.externalRef} · you are the buyer</div>
                  </div>
                  <div className="text-right">
                    <div className="eyebrow">Amount to settle</div>
                    <div className="nums font-mono text-lg text-brass">{fmtUsd(fromBaseUnits(total.toString()))}</div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-end">
                  <Button disabled={busy === `pay-${inv.advance?.onChainId}`} onClick={() => onPay(inv)}>
                    {busy === `pay-${inv.advance?.onChainId}` ? <Spinner /> : null} Pay invoice
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel p-8 text-center text-mist">
          No bills to pay. You'll see an invoice here when a supplier who named your wallet as the buyer gets financed.
        </div>
      )}
    </div>
  );
}
