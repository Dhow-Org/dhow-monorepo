import { usePool } from "../hooks/useApi";
import { Stat } from "../ui/Stat";
import { Spinner } from "../ui/Spinner";
import { fromBaseUnits, fmtUsd } from "../lib/format";

export function Funders() {
  const pool = usePool();

  return (
    <div className="max-w-3xl">
      <div className="eyebrow">Liquidity pool</div>
      <h1 className="mt-2 font-display text-4xl">Fund the voyages</h1>
      <p className="mt-3 max-w-lg text-mist">
        Licensed funders supply USDC; advances are drawn against verified receivables and repaid as buyers pay.
        Fees accrue pro-rata to funders.
      </p>

      <div className="panel mt-8 p-6">
        {pool.isLoading ? (
          <div className="flex items-center gap-2 text-mist">
            <Spinner /> Loading pool…
          </div>
        ) : pool.isError ? (
          <div className="text-sm text-mist">Pool unavailable. Start the API and deploy the contracts to see live stats.</div>
        ) : pool.data ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Available" value={fmtUsd(fromBaseUnits(pool.data.idleLiquidity))} accent="foam" />
            <Stat label="Deployed" value={fmtUsd(fromBaseUnits(pool.data.outstandingPrincipal))} accent="brass" />
            <Stat label="Funder principal" value={fmtUsd(fromBaseUnits(pool.data.totalFunderPrincipal))} />
            <Stat label="Realised losses" value={fmtUsd(fromBaseUnits(pool.data.totalLosses))} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
