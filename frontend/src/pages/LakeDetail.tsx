import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import MetricStat from "../components/MetricStat";
import ScorePill from "../components/ScorePill";
import AnomalyBadge from "../components/AnomalyBadge";
import VerdictCard from "../components/VerdictCard";
import TrendChart from "../components/TrendChart";
import EventList from "../components/EventList";
import { formatPct, formatScore } from "../lib/scoring";

export default function LakeDetail() {
  const { lakeId = "" } = useParams<{ lakeId: string }>();

  const lakesQuery = useQuery({ queryKey: ["lakes"], queryFn: api.getLakes });
  const seriesQuery = useQuery({
    queryKey: ["timeseries", lakeId],
    queryFn: () => api.getTimeseries(lakeId),
    retry: false,
  });
  const eventsQuery = useQuery({
    queryKey: ["restoration", lakeId],
    queryFn: () => api.getRestorationEvents(lakeId),
    retry: false,
  });

  const lake = lakesQuery.data?.lakes.find((l) => l.id === lakeId);
  const rows = seriesQuery.data?.data ?? [];
  const latest = rows[rows.length - 1];
  const events = eventsQuery.data?.events ?? [];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <nav className="text-[12px] text-fg-muted mb-3">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-fg">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </nav>

      {lakesQuery.isLoading ? (
        <div className="text-fg-muted">Loading…</div>
      ) : !lake ? (
        <div className="text-pill-severe">Unknown lake: {lakeId}</div>
      ) : (
        <>
          <header className="mb-5 flex flex-wrap items-start gap-3 justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {lake.name}
              </h1>
              <div className="text-fg-muted mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                <span className="font-mono">id: {lake.id}</span>
                {lake.alt_names.length > 0 && (
                  <span>aka {lake.alt_names.join(", ")}</span>
                )}
                {lake.ward && <span>ward: {lake.ward}</span>}
                {lake.official_area_ha && (
                  <span className="font-mono">
                    {lake.official_area_ha.toFixed(1)} ha
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {latest?.anomaly_flag && <AnomalyBadge mom={latest.mom_change_pct} />}
              <ScorePill score={latest?.pollution_score ?? lake.computed_pollution_score} />
            </div>
          </header>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <MetricStat
              label="Latest score"
              value={formatScore(latest?.pollution_score)}
              hint={latest ? `for ${latest.month_start.slice(0, 7)}` : "no data"}
            />
            <MetricStat
              label="MoM change"
              value={formatPct(latest?.mom_change_pct ?? null)}
              hint={latest?.anomaly_flag ? "flagged anomaly" : "within normal range"}
              tone={latest?.anomaly_flag ? "default" : "muted"}
            />
            <MetricStat
              label="Months observed"
              value={rows.length}
              hint={rows.length > 0 ? `since ${rows[0].month_start.slice(0, 7)}` : undefined}
            />
            <MetricStat
              label="Scenes this month"
              value={latest?.scene_count ?? "—"}
              hint={latest ? `${latest.pixel_count.toLocaleString()} pixels` : undefined}
              tone="muted"
            />
          </section>

          <section className="mb-5">
            <VerdictCard
              verdict={latest?.restoration_verdict ?? null}
              confidence={latest?.restoration_confidence ?? null}
              hasEvents={events.length > 0}
            />
          </section>

          <section className="mb-5">
            <h2 className="text-[11px] uppercase tracking-wider text-fg-muted mb-2">
              Pollution trend (2020 → now)
            </h2>
            {seriesQuery.isLoading ? (
              <div className="rounded-lg border border-border bg-surface p-6 text-fg-muted text-center">
                Loading time series…
              </div>
            ) : seriesQuery.isError || rows.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface p-6 text-fg-muted text-center">
                No analytics time series yet. Run <code className="font-mono text-fg">bangalore-lakes compute-timeseries</code>.
              </div>
            ) : (
              <TrendChart rows={rows} events={events} />
            )}
          </section>

          <section>
            <h2 className="text-[11px] uppercase tracking-wider text-fg-muted mb-2">
              Restoration events
            </h2>
            <EventList events={events} />
          </section>
        </>
      )}
    </div>
  );
}
