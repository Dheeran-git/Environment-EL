import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Compass, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import MetricStat from "../components/MetricStat";
import ScorePill from "../components/ScorePill";
import AnomalyBadge from "../components/AnomalyBadge";
import VerdictCard from "../components/VerdictCard";
import type { VerdictDetails } from "../components/VerdictCard";
import TrendChart from "../components/TrendChart";
import EventList from "../components/EventList";
import { formatPct, formatScore } from "../lib/scoring";
import SatelliteImagery from "../components/SatelliteImagery";
import type { Lake } from "../lib/types";
import { POLICIES } from "./Policies";

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

  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  const toggleAction = (id: string) => {
    setSelectedActions(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const lake = lakesQuery.data?.lakes.find((l: Lake) => l.id === lakeId);
  const rows = seriesQuery.data?.data ?? [];
  const validRows = rows.filter((row: any) => row.pixel_count > 0);
  const latest = useMemo(() => {
    if (lakeId === "bellandur") {
      return validRows.find((r: any) => r.month_start === "2025-02-01") ?? validRows[validRows.length - 1];
    }
    if (lakeId === "hebbal") {
      return validRows.find((r: any) => r.month_start === "2026-02-01") ?? validRows[validRows.length - 1];
    }
    return validRows[validRows.length - 1];
  }, [lakeId, validRows]);

  const prevObs = useMemo(() => {
    if (!latest || !validRows.length) return null;
    const idx = validRows.findIndex((r: any) => r.month_start === latest.month_start);
    return idx > 0 ? validRows[idx - 1] : null;
  }, [latest, validRows]);

  const momMonthsText = useMemo(() => {
    if (!latest || !prevObs) return "";
    const formatMonthShort = (iso: string) => {
      const d = new Date(iso + "T00:00:00");
      const mon = d.toLocaleDateString("en-IN", { month: "short" });
      const yr = d.getFullYear().toString().slice(2);
      return `${mon}'${yr}`;
    };
    return `${formatMonthShort(prevObs.month_start)} → ${formatMonthShort(latest.month_start)}`;
  }, [latest, prevObs]);

  const events = eventsQuery.data?.events ?? [];

  // Compute verdict details for VerdictCard
  const verdictDetails: VerdictDetails | null = useMemo(() => {
    if (events.length === 0 || validRows.length === 0) return null;
    const lastEvent = events[events.length - 1];
    const eventDate = lastEvent.event_date;
    const pre = validRows.filter((r: any) => r.month_start < eventDate).slice(-6);
    const post = validRows.filter((r: any) => r.month_start >= eventDate).slice(0, 6);
    if (pre.length === 0 && post.length === 0) return null;
    const preAvg = pre.length > 0 ? pre.reduce((s: number, r: any) => s + r.pollution_score, 0) / pre.length : 0;
    const postAvg = post.length > 0 ? post.reduce((s: number, r: any) => s + r.pollution_score, 0) / post.length : 0;
    return {
      eventDate,
      eventTitle: lastEvent.title,
      preMonths: pre.map((r: any) => r.month_start),
      postMonths: post.map((r: any) => r.month_start),
      preAvg,
      postAvg,
    };
  }, [events, validRows]);

  const totalImpact = selectedActions.reduce((acc, actionId) => {
    const action = POLICIES.find(p => p.id === actionId);
    return acc + (action?.impact ?? 0);
  }, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <nav className="text-[12px] text-fg-muted mb-3 no-print">
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

          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <MetricStat
              label="Latest score"
              value={formatScore(latest?.pollution_score)}
              hint={latest ? `for ${latest.month_start.slice(0, 7)}` : "no data"}
            />
            <MetricStat
              label="MoM change"
              value={formatPct(latest?.mom_change_pct ?? null)}
              hint={momMonthsText ? `${momMonthsText}${latest?.anomaly_flag ? " (anomaly)" : ""}` : (latest?.anomaly_flag ? "flagged anomaly" : "within normal range")}
              tone={latest?.anomaly_flag ? "default" : "muted"}
            />
            <MetricStat
              label="Months observed"
              value={rows.length}
              hint={rows.length > 0 ? `since ${rows[0].month_start.slice(0, 7)}` : undefined}
            />
          </section>

          <section className="mb-5">
            <VerdictCard
              verdict={latest?.restoration_verdict ?? null}
              confidence={latest?.restoration_confidence ?? null}
              hasEvents={events.length > 0}
              details={verdictDetails}
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-5">
            <div className="lg:col-span-2">
              <h2 className="text-[11px] uppercase tracking-wider text-fg-muted mb-2">
                Pollution trend & Projections (2020 → now)
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
                <TrendChart rows={rows} events={events} simulatedImpactPoints={totalImpact} />
              )}
            </div>

            {/* Scenario Builder Panel */}
            <div className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between h-fit no-print">
              <div className="space-y-4">
                <h3 className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-accent" />
                  Restoration Scenario Builder
                </h3>
                <p className="text-fg-muted text-[12.5px] leading-normal">
                  Toggle active restoration policies below to simulate their cumulative impact on the lake's 36-month future recovery path.
                </p>

                <div className="space-y-2.5 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
                  {POLICIES.map((p) => {
                    const active = selectedActions.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleAction(p.id)}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                          active 
                            ? "bg-surface-2 border-accent/60 ring-1 ring-accent/30 shadow-sm" 
                            : "bg-surface border-border hover:border-fg-muted/40 hover:bg-surface-2/40"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <span className={`text-[8.5px] uppercase tracking-wider px-1.5 py-0.25 rounded font-semibold ${
                              p.category === "engineering" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                              p.category === "ecological" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                              "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}>
                              {p.category}
                            </span>
                            <span className="text-[10px] font-mono font-semibold text-accent shrink-0">+{p.impact} pts</span>
                          </div>
                          <h4 className="font-semibold text-[13px] mt-1.5 text-fg truncate">{p.name}</h4>
                        </div>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ${
                          active ? "bg-accent border-accent text-bg" : "border-border"
                        }`}>
                          {active && <CheckCircle2 className="w-2.5 h-2.5 text-bg-default stroke-[3px]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border/60 mt-4 pt-3 flex items-center justify-between">
                <span className="text-[12px] font-medium text-fg">Cumulative Impact:</span>
                <span className="text-[13px] font-bold font-mono text-accent">+{totalImpact} Impact Points</span>
              </div>
            </div>
          </section>

          <section className="mb-5 no-print">
        <h2 className="text-[11px] uppercase tracking-wider text-fg-muted mb-2">
          Satellite Remote Sensing Band Analysis
        </h2>
        <SatelliteImagery lakeId={lakeId} />
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
