import { AlertTriangle } from "lucide-react";
import { formatPct } from "../lib/scoring";

interface Props {
  mom: number | null | undefined;
  compact?: boolean;
}

export default function AnomalyBadge({ mom, compact = false }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border border-pill-severe/30",
        "bg-pill-severe/10 text-pill-severe font-mono tabular-nums",
        compact ? "px-1.5 py-0 text-[11px]" : "px-2 py-0.5 text-xs",
      ].join(" ")}
      title="Month-over-month change exceeds 20%"
    >
      <AlertTriangle className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
      Anomaly {formatPct(mom)}
    </span>
  );
}
