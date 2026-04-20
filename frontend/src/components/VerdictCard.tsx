import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { toneToColor, verdictLabel, verdictTone } from "../lib/scoring";
import type { RestorationVerdict } from "../lib/types";

interface Props {
  verdict: RestorationVerdict | null | undefined;
  confidence: number | null | undefined;
  hasEvents: boolean;
}

export default function VerdictCard({ verdict, confidence, hasEvents }: Props) {
  const tone = verdictTone(verdict);
  const color = toneToColor(tone);
  const label = verdictLabel(verdict);
  const Icon =
    verdict === "improved"
      ? TrendingDown
      : verdict === "worsened"
        ? TrendingUp
        : verdict === "unchanged"
          ? Minus
          : HelpCircle;
  const conf = Math.max(0, Math.min(1, confidence ?? 0));

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-fg-muted">
            Restoration outcome
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color }} />
            <span className="text-lg font-semibold" style={{ color }}>
              {label}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-fg-muted max-w-[44ch]">
            {hasEvents
              ? "Compares mean pollution score in the 6 months before and after each restoration event."
              : "No restoration event on file for this lake. Verdict requires a dated intervention as a reference point."}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted">
            Confidence
          </div>
          <div className="mt-1 font-mono tabular-nums text-fg">
            {(conf * 100).toFixed(0)}%
          </div>
        </div>
      </div>
      <div className="mt-3 h-1 w-full rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full"
          style={{ width: `${conf * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}
