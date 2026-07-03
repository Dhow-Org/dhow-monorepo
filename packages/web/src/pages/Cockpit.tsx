import { type FormEvent, useState } from "react";
import { keccak256, toHex } from "viem";
import {
  useAssess,
  useCreateInvoice,
  useDisburse,
  useInvoices,
  usePool,
  useReputation,
  useVerifyInvoice,
} from "../hooks/useApi";
import type { Decision, InvoiceRow } from "../lib/types";
import type { Session } from "../hooks/useSession";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Spinner } from "../ui/Spinner";
import { Stat } from "../ui/Stat";
import { VoyageLine } from "../components/VoyageLine";
import { VerdictCard } from "../components/VerdictCard";
import { fmtUsd, fromBaseUnits } from "../lib/format";

const USDC = (import.meta.env.VITE_USDC_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
const TIER = ["Bronze", "Silver", "Gold", "Platinum"];

export function Cockpit({ session }: { session: Session }) {
  const invoices = useInvoices(session.authed ? session.address : undefined);
  const pool = usePool();
  const reputation = useReputation(session.address);
  const createInvoice = useCreateInvoice();
  const verify = useVerifyInvoice();
  const assess = useAssess();
  const disburse = useDisburse();

  const [showForm, setShowForm] = useState(false);
  const [verdict, setVerdict] = useState<{ id: string; decision: Decision } | null>(null);
  const [amount, setAmount] = useState("");
  const [debtor, setDebtor] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [ref, setRef] = useState("");

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!session.address) return;
    const amountBase = BigInt(Math.round(Number(amount) * 1e6)).toString();
    const due = Math.floor(new Date(dueDate).getTime() / 1000);
    const docHash = keccak256(toHex(`${ref}:${amountBase}`));
    await createInvoice.mutateAsync({
      supplier: session.address,
      debtor: debtor || undefined,
      asset: USDC,
      amount: amountBase,
      dueDate: due,
      externalRef: ref,
      docHash,
    });
    setAmount("");
    setDebtor("");
    setDueDate("");
    setRef("");
    setShowForm(false);
  };

  return (
    <div className="space-y-8">
      {/* stats */}
      <div className="panel grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
        <Stat
          label="Pool available"
          value={pool.data ? fmtUsd(fromBaseUnits(pool.data.idleLiquidity)) : "—"}
          accent="foam"
        />
        <Stat
          label="Your credit score"
          value={reputation.data ? String(reputation.data.score) : "—"}
          sub={reputation.data ? TIER[reputation.data.tier] : undefined}
          accent="brass"
        />
        <Stat label="On-time repayments" value={reputation.data ? String(reputation.data.onTimeCount) : "—"} />
        <Stat label="Open invoices" value={invoices.data ? String(invoices.data.length) : "—"} />
      </div>

      {/* new invoice */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Receivables</h2>
        <Button variant={showForm ? "ghost" : "brass"} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "New invoice"}
        </Button>
      </div>

      {showForm ? (
        <form onSubmit={onCreate} className="panel grid gap-4 p-6 sm:grid-cols-2">
          <Field
            label="Invoice amount (USD)"
            type="number"
            min="1"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100000"
          />
          <Field label="Due date" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Field
            label="Reference"
            required
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="INV-2026-001"
            hint="Unique per invoice — prevents double-financing"
          />
          <Field
            label="Buyer address (optional)"
            value={debtor}
            onChange={(e) => setDebtor(e.target.value)}
            placeholder="0x…"
          />
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? <Spinner /> : null} Register invoice
            </Button>
            {createInvoice.isError ? (
              <span className="text-sm text-teak">{(createInvoice.error as Error).message}</span>
            ) : null}
          </div>
        </form>
      ) : null}

      {/* list */}
      {invoices.isLoading ? (
        <div className="flex items-center gap-2 text-mist">
          <Spinner /> Loading receivables…
        </div>
      ) : invoices.isError ? (
        <div className="panel p-6 text-sm text-mist">
          Couldn't reach the API. Start the backend (`pnpm --filter @dhow/api start:dev`) and deploy the contracts.
        </div>
      ) : invoices.data && invoices.data.length > 0 ? (
        <div className="space-y-4">
          {invoices.data.map((inv) => (
            <InvoiceCard
              key={inv.id}
              inv={inv}
              busy={verify.isPending || assess.isPending || disburse.isPending}
              onVerify={() => verify.mutate(inv.id)}
              onAssess={async () => setVerdict({ id: inv.id, decision: await assess.mutateAsync({ invoiceId: inv.id }) })}
              onFinance={() => disburse.mutate({ invoiceId: inv.id })}
              verdict={verdict?.id === inv.id ? verdict.decision : null}
            />
          ))}
        </div>
      ) : (
        <div className="panel p-8 text-center text-mist">
          No receivables yet. Register your first invoice to get a financing quote.
        </div>
      )}
    </div>
  );
}

function InvoiceCard({
  inv,
  busy,
  onVerify,
  onAssess,
  onFinance,
  verdict,
}: {
  inv: InvoiceRow;
  busy: boolean;
  onVerify: () => void;
  onAssess: () => void;
  onFinance: () => void;
  verdict: Decision | null;
}) {
  const amount = fromBaseUnits(inv.amount);
  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="nums font-mono text-xl">{fmtUsd(amount)}</span>
            <StatusPill status={inv.status} />
          </div>
          <div className="mt-1 text-xs text-mist">
            {inv.externalRef}
            {inv.debtor ? ` · buyer ${inv.debtor.slice(0, 6)}…` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inv.status === "REGISTERED" ? (
            <Button variant="outline" onClick={onVerify} disabled={busy}>
              Verify
            </Button>
          ) : null}
          {inv.status === "VERIFIED" ? (
            <>
              <Button variant="outline" onClick={onAssess} disabled={busy}>
                Get quote
              </Button>
              <Button onClick={onFinance} disabled={busy}>
                Finance now
              </Button>
            </>
          ) : null}
          {inv.status === "FINANCED" && inv.advance ? (
            <span className="nums font-mono text-sm text-foam">
              {fmtUsd(fromBaseUnits(inv.advance.principal))} advanced
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <VoyageLine dueDate={inv.dueDate} financed={inv.status === "FINANCED" || inv.status === "REPAID"} />
      </div>

      {verdict ? (
        <div className="mt-5">
          <VerdictCard decision={verdict} invoiceAmount={amount} />
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceRow["status"] }) {
  const map: Record<InvoiceRow["status"], string> = {
    REGISTERED: "text-mist border-hair",
    VERIFIED: "text-brass border-brass/40",
    FINANCED: "text-foam border-foam/40",
    REPAID: "text-foam border-foam/40",
    DEFAULTED: "text-teak border-teak/50",
    CANCELLED: "text-mist border-hair",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${map[status]}`}>
      {status.toLowerCase()}
    </span>
  );
}
