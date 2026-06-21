import { TrendingUp, TrendingDown, Minus, HelpCircle, Calendar, ArrowRight } from "lucide-react";
import { toneToColor, verdictLabel, verdictTone } from "../lib/scoring";
import type { RestorationVerdict } from "../lib/types";

export interface VerdictDetails {
  eventDate: string;
  eventTitle: string;
  preMonths: string[];
  postMonths: string[];
  preAvg: number;
  postAvg: number;
}

interface Props {
  verdict: RestorationVerdict | null | undefined;
  confidence: number | null | undefined;
  hasEvents: boolean;
  details?: VerdictDetails | null;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatMonthShort(iso: string): string {
  // iso like "2025-01-01" -> "Jan'25"
  const d = new Date(iso + "T00:00:00");
  const mon = d.toLocaleDateString("en-IN", { month: "short" });
  const yr = d.getFullYear().toString().slice(2);
  return `${mon}'${yr}`;
}

export default function VerdictCard({ verdict, confidence, hasEvents, details }: Props) {
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
          {hasEvents && details ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>
                  Event: <span className="text-fg font-medium">{details.eventTitle}</span>
                  {" · "}
                  <span className="font-mono text-fg">{formatEventDate(details.eventDate)}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11.5px] text-fg-muted font-mono">
                <span className="text-blue-400">
                  Pre: {details.preMonths.length > 0
                    ? `${formatMonthShort(details.preMonths[0])} → ${formatMonthShort(details.preMonths[details.preMonths.length - 1])}`
                    : "—"}
                  {" "}
                  <span className="text-fg">({details.preAvg.toFixed(1)})</span>
                </span>
                <ArrowRight className="w-3 h-3 text-fg-muted shrink-0" />
                <span className="text-orange-400">
                  Post: {details.postMonths.length > 0
                    ? `${formatMonthShort(details.postMonths[0])} → ${formatMonthShort(details.postMonths[details.postMonths.length - 1])}`
                    : "—"}
                  {" "}
                  <span className="text-fg">({details.postAvg.toFixed(1)})</span>
                </span>
              </div>
              <p className="text-[11px] text-fg-muted">
                Compared {details.preMonths.length} valid months before vs {details.postMonths.length} valid months after the restoration event.
              </p>
            </div>
          ) : (
            <p className="mt-1 text-[12px] text-fg-muted max-w-[44ch]">
              {hasEvents
                ? "Compares mean pollution score in the 6 months before and after each restoration event."
                : "No restoration event on file for this lake. Verdict requires a dated intervention as a reference point."}
            </p>
          )}
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
