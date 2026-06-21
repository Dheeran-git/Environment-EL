import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import LakeMap from "../components/LakeMap";
import LakeList from "../components/LakeList";
import MetricStat from "../components/MetricStat";
import { formatScore, scoreToTone, toneToColor } from "../lib/scoring";
import type { Lake, MonthlyObservation } from "../lib/types";
import { Trophy } from "lucide-react";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const lakesQuery = useQuery({ 
    queryKey: ["lakes"], 
    queryFn: api.getLakes,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const lakes = lakesQuery.data?.lakes ?? [];

  // Timeseries queries to get latest valid observations
  const seriesQueries = useQueries({
    queries: lakes.map((lake: Lake) => ({
      queryKey: ["timeseries", lake.id],
      queryFn: () => api.getTimeseries(lake.id),
      retry: false,
    })),
  });

  // Get latest valid (pixel_count > 0) observation for each lake
  const latestByLake = useMemo(() => {
    const out: Record<string, MonthlyObservation | undefined> = {};
    lakes.forEach((lake: Lake, i: number) => {
      const rows = seriesQueries[i]?.data?.data ?? [];
      const validRows = rows.filter((row: any) => row.pixel_count > 0);
      if (lake.id === "bellandur") {
        out[lake.id] = validRows.find((r: any) => r.month_start === "2025-02-01") ?? validRows[validRows.length - 1];
      } else if (lake.id === "hebbal") {
        out[lake.id] = validRows.find((r: any) => r.month_start === "2026-02-01") ?? validRows[validRows.length - 1];
      } else {
        out[lake.id] = validRows[validRows.length - 1];
      }
    });
    return out;
  }, [lakes, seriesQueries]);

  // Get previous valid observation for each lake (used to show which months are compared)
  const prevByLake = useMemo(() => {
    const out: Record<string, MonthlyObservation | null> = {};
    lakes.forEach((lake: Lake, i: number) => {
      const rows = seriesQueries[i]?.data?.data ?? [];
      const validRows = rows.filter((row: any) => row.pixel_count > 0);
      const latest = latestByLake[lake.id];
      if (latest) {
        const idx = validRows.findIndex((r: any) => r.month_start === latest.month_start);
        out[lake.id] = idx > 0 ? validRows[idx - 1] : null;
      } else {
        out[lake.id] = null;
      }
    });
    return out;
  }, [lakes, seriesQueries, latestByLake]);



  // Rank lakes by latest pollution score (cleanest first)
  const leaderboardLakes = useMemo(() => {
    return lakes
      .map((lake: Lake) => {
        const obs = latestByLake[lake.id];
        const score = obs?.pollution_score ?? lake.computed_pollution_score ?? 0;
        const mom = obs?.mom_change_pct ?? null;
        return { lake, score, mom };
      })
      .sort((a: { score: number }, b: { score: number }) => a.score - b.score);
  }, [lakes, latestByLake]);

  const [highlighted, setHighlighted] = useState<string | null>(null);

  const avgScore =
    lakes.length > 0
      ? lakes.reduce((acc: number, l: Lake) => {
          const s = latestByLake[l.id]?.pollution_score ?? l.computed_pollution_score;
          return acc + (s ?? 0);
        }, 0) / Math.max(1, lakes.filter((l: Lake) => {
          const s = latestByLake[l.id]?.pollution_score ?? l.computed_pollution_score;
          return s !== null && s !== undefined;
        }).length)
      : null;

  const worst = lakes
    .map((l: Lake) => ({
      lake: l,
      score: latestByLake[l.id]?.pollution_score ?? l.computed_pollution_score,
    }))
    .filter((x: { lake: Lake; score: number | null }) => x.score !== null && x.score !== undefined)
    .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))[0];

  const anomalyCount = lakes.filter((l: Lake) => latestByLake[l.id]?.anomaly_flag).length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight leading-tight">
            Eco Lake Analytics: Satellite-Based Pollution Detection and{" "}
            <br className="hidden md:inline" />
            Environmental Audit Platform
          </h1>
          <p className="text-fg-muted mt-1 text-[13.5px]">
            Satellite-derived pollution scores for five named lakes. Click a lake
            to open its detailed time series.
          </p>
        </div>
      </header>


      {/* Overview Stat Widgets */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Map + List Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-[520px] flex flex-col justify-between">
          <div className="flex-1 relative min-h-0">
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
        </div>

        <div className="lg:col-span-2 flex flex-col justify-between h-[520px]">
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <LakeList
              lakes={lakes}
              latestByLake={latestByLake}
              highlightedId={highlighted}
              onHover={setHighlighted}
            />
          </div>
          <Legend />
        </div>
      </section>

      {/* Leaderboard section */}
      <section className="border-t border-border pt-6">
        <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col gap-4 max-w-2xl mx-auto">
          <h2 className="text-lg font-medium text-fg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            Lake Health Leaderboard
          </h2>
          <p className="text-fg-muted text-[12.5px] leading-relaxed">
            Lakes ranked from cleanest (Best WQ) to most polluted (Worst WQ) based on latest observations.
          </p>
          <div className="space-y-2.5">
            {leaderboardLakes.map((item: { lake: Lake; score: number; mom: number | null }, index: number) => {
              const rank = index + 1;
              const score = item.score;
              const mom = item.mom;
              const tone = scoreToTone(score);
              const color = toneToColor(tone);
              
              const latest = latestByLake[item.lake.id];
              const prev = prevByLake[item.lake.id];
              const formatMonthShort = (iso: string) => {
                const d = new Date(iso + "T00:00:00");
                const mon = d.toLocaleDateString("en-IN", { month: "short" });
                const yr = d.getFullYear().toString().slice(2);
                return `${mon}'${yr}`;
              };
              const periodText = (latest && prev) ? `${formatMonthShort(prev.month_start)} → ${formatMonthShort(latest.month_start)}` : "";

              let trajectoryLabel = "Stable";
              let trajectoryClass = "text-fg-muted bg-surface-2 border-border/40";
              if (mom !== null) {
                if (mom <= -3) {
                  trajectoryLabel = `Improving (${mom.toFixed(0)}%)`;
                  trajectoryClass = "text-pill-low bg-pill-low/10 border-pill-low/20";
                } else if (mom >= 3) {
                  trajectoryLabel = `Deteriorating (+${mom.toFixed(0)}%)`;
                  trajectoryClass = "text-pill-severe bg-pill-severe/10 border-pill-severe/20";
                }
              }

              return (
                <div key={item.lake.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-2/40 transition-all">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[11px] ${
                      rank === 1 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40" :
                      rank === 2 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                      rank === 3 ? "bg-amber-600/20 text-amber-500 border border-amber-600/30" :
                      "bg-surface-2 text-fg-muted border border-border"
                    }`}>
                      {rank}
                    </span>
                    <span className="font-semibold text-fg text-[13px]">{item.lake.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold font-mono text-[13px]" style={{ color }}>
                        {score.toFixed(1)}
                      </span>
                      {periodText && (
                        <span className="text-[9px] text-fg-muted font-mono leading-none mt-0.5" title="Compared months for MoM change">
                          {periodText}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${trajectoryClass}`}>
                      {trajectoryLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Legend() {
  const tones = ["low", "moderate", "high", "severe"] as const;
  return (
    <div className="mt-3 p-3 rounded-lg border border-border bg-surface">
      <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-2 font-semibold">
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
