import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Lake, MonthlyObservation } from "../lib/types";
import ScorePill from "./ScorePill";

interface Props {
  lakes: Lake[];
  latestByLake: Record<string, MonthlyObservation | undefined>;
  highlightedId?: string | null;
  onHover?: (id: string | null) => void;
}

export default function LakeList({
  lakes,
  latestByLake,
  highlightedId,
  onHover,
}: Props) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-fg-muted bg-surface-2/50">
            <th className="text-left font-medium px-3 py-2">Lake</th>
            <th className="text-left font-medium px-3 py-2">Ward</th>
            <th className="text-right font-medium px-3 py-2">Score</th>
            <th className="text-right font-medium px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {lakes.map((lake) => {
            const latest = latestByLake[lake.id];
            const isHL = highlightedId === lake.id;
            return (
              <tr
                key={lake.id}
                onMouseEnter={() => onHover?.(lake.id)}
                onMouseLeave={() => onHover?.(null)}
                className={[
                  "border-t border-border transition-colors",
                  isHL ? "bg-surface-2" : "hover:bg-surface-2/60",
                ].join(" ")}
              >
                <td className="px-3 py-2">
                  <Link
                    to={`/lakes/${lake.id}`}
                    className="font-medium text-fg hover:text-accent"
                  >
                    {lake.name}
                  </Link>
                  {lake.alt_names.length > 0 && (
                    <div className="text-[11px] text-fg-muted">
                      aka {lake.alt_names.join(", ")}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-fg-muted">
                  {lake.ward || "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <ScorePill score={latest?.pollution_score ?? lake.computed_pollution_score} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    to={`/lakes/${lake.id}`}
                    aria-label={`Open ${lake.name}`}
                    className="inline-flex text-fg-muted hover:text-fg"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
