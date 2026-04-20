import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import LakeMap from "../components/LakeMap";
import LakeList from "../components/LakeList";
import MetricStat from "../components/MetricStat";
import { formatScore, scoreToTone, toneToColor } from "../lib/scoring";
import type { MonthlyObservation } from "../lib/types";

export default function Dashboard() {
  const lakesQuery = useQuery({ queryKey: ["lakes"], queryFn: api.getLakes });
  const lakes = lakesQuery.data?.lakes ?? [];

  const seriesQueries = useQueries({
    queries: lakes.map((lake) => ({
      queryKey: ["timeseries", lake.id],
      queryFn: () => api.getTimeseries(lake.id),
      retry: false,
    })),
  });

  const latestByLake = useMemo(() => {
    const out: Record<string, MonthlyObservation | undefined> = {};
    lakes.forEach((lake, i) => {
      const q = seriesQueries[i];
      const rows = q?.data?.data ?? [];
      out[lake.id] = rows[rows.length - 1];
    });
    return out;
  }, [lakes, seriesQueries]);

  const [highlighted, setHighlighted] = useState<string | null>(null);

  const avgScore =
    lakes.length > 0
      ? lakes.reduce((acc, l) => {
          const s = latestByLake[l.id]?.pollution_score ?? l.computed_pollution_score;
          return acc + (s ?? 0);
        }, 0) / Math.max(1, lakes.filter((l) => {
          const s = latestByLake[l.id]?.pollution_score ?? l.computed_pollution_score;
          return s !== null && s !== undefined;
        }).length)
      : null;

  const worst = lakes
    .map((l) => ({
      lake: l,
      score: latestByLake[l.id]?.pollution_score ?? l.computed_pollution_score,
    }))
    .filter((x) => x.score !== null && x.score !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

  const anomalyCount = lakes.filter((l) => latestByLake[l.id]?.anomaly_flag).length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bangalore Lakes
        </h1>
        <p className="text-fg-muted mt-1">
          Satellite-derived pollution scores for six named lakes. Click a lake
          to open its time series.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <MetricStat
          label="Lakes tracked"
          value={lakes.length}
          hint={lakesQuery.data?.metadata.source}
        />
        <MetricStat
          label="Avg. pollution score"
          value={formatScore(avgScore)}
          hint="latest month across all lakes"
        />
        <MetricStat
          label="Anomalies this month"
          value={<span style={{ color: anomalyCount > 0 ? "#eb5757" : undefined }}>{anomalyCount}</span>}
          hint={worst ? `worst: ${worst.lake.name} (${formatScore(worst.score)})` : undefined}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-[520px]">
          {lakesQuery.isLoading ? (
            <div className="h-full grid place-items-center text-fg-muted border border-border rounded-lg bg-surface">
              Loading map…
            </div>
          ) : lakesQuery.isError ? (
            <div className="h-full grid place-items-center text-pill-severe border border-border rounded-lg bg-surface">
              Failed to load lakes. Is the backend running?
            </div>
          ) : (
            <LakeMap
              lakes={lakes}
              highlightedId={highlighted}
              onHover={setHighlighted}
            />
          )}
        </div>
        <div className="lg:col-span-2">
          <LakeList
            lakes={lakes}
            latestByLake={latestByLake}
            highlightedId={highlighted}
            onHover={setHighlighted}
          />
          <Legend />
        </div>
      </section>
    </div>
  );
}

function Legend() {
  const tones = ["low", "moderate", "high", "severe"] as const;
  return (
    <div className="mt-3 p-3 rounded-lg border border-border bg-surface">
      <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-2">
        Score legend
      </div>
      <div className="flex flex-wrap gap-3 text-[12px] text-fg-muted">
        {tones.map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: toneToColor(scoreToTone(t === "low" ? 10 : t === "moderate" ? 40 : t === "high" ? 65 : 90)) }}
            />
            <span className="capitalize">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
