import { Sail } from "../ui/Sail";
import { daysUntil } from "../lib/format";

/** An invoice as a voyage: issued -> due, with the advance arriving early when financed. */
export function VoyageLine({ dueDate, financed }: { dueDate: string; financed?: boolean }) {
  const days = daysUntil(dueDate);
  return (
    <div className="relative h-9">
      <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-hair" />
      <div className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-brass" />
        <span className="text-[10px] uppercase tracking-wider text-mist">issued</span>
      </div>
      <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-mist">due {days}d</span>
        <span className="h-2 w-2 rounded-full border border-mist" />
      </div>
      {financed ? (
        <div className="absolute left-[10%] top-1/2 -translate-y-1/2 text-foam" title="advance paid now">
          <Sail size={16} />
        </div>
      ) : null}
    </div>
  );
}
