import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "muted";
}

export default function MetricStat({ label, value, hint, tone = "default" }: Props) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wider text-fg-muted">
        {label}
      </div>
      <div
        className={[
          "mt-1 font-mono tabular-nums text-2xl",
          tone === "muted" ? "text-fg-muted" : "text-fg",
        ].join(" ")}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-fg-muted">{hint}</div>}
    </div>
  );
}
