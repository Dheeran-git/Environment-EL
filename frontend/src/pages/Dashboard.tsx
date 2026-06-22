import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Lake, MonthlyObservation } from "../lib/types";
import { deriveTrend, headlineFor, wardLabel, pickLatest } from "../lib/lakeui";
import {
  AlertBanner, Card, LakeCard, LeaderboardRow, MetricStat, Tag, VerdictCard,
} from "../design/ds";
import { Aurora, CountUp, Reveal, ShinyText } from "../design/motion";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-muted)", margin: "0 0 14px" }}>{children}</p>
  );
}

type Row = {
  lake: Lake;
  score: number;
  delta: number | null;
  trend: ReturnType<typeof deriveTrend>;
  anomaly: boolean;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const lakesQuery = useQuery({ queryKey: ["lakes"], queryFn: api.getLakes });
  const lakes = lakesQuery.data?.lakes ?? [];

  const seriesQueries = useQueries({
    queries: lakes.map((lake: Lake) => ({
      queryKey: ["timeseries", lake.id],
      queryFn: () => api.getTimeseries(lake.id),
      retry: false,
    })),
  });

  const rows: Row[] = useMemo(() => {
    return lakes.map((lake: Lake, i: number) => {
      const series = (seriesQueries[i]?.data?.data ?? []) as MonthlyObservation[];
      const latest = pickLatest(lake.id, series);
      const score = latest?.pollution_score ?? lake.computed_pollution_score ?? 0;
      const delta = latest?.mom_change_pct ?? null;
      return { lake, score, delta, trend: deriveTrend(delta), anomaly: !!latest?.anomaly_flag };
    });
  }, [lakes, seriesQueries]);

  const ranked = useMemo(() => [...rows].sort((a, b) => b.score - a.score), [rows]);
  const worst = ranked[0];
  const avg = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0;
  const improving = rows.filter((r) => r.trend === "improved").length;
  const anomalyCount = rows.filter((r) => r.anomaly).length;

  if (lakesQuery.isLoading) {
    return <div style={{ padding: 48, color: "var(--ink-muted)", fontFamily: "var(--font-ui)" }}>Reading the lakes from orbit…</div>;
  }
  if (lakesQuery.isError || !worst) {
    return (
      <div style={{ padding: 48, fontFamily: "var(--font-ui)" }}>
        <AlertBanner tone="critical" title="Couldn't load the lakes" message="The analytics API didn't respond. Is the backend running?" />
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 32px 64px", maxWidth: 1180, margin: "0 auto" }}>
      {/* Editorial header over a soft caustics field */}
      <div style={{ position: "relative", borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: 24 }}>
        <Aurora />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", padding: "8px 4px 4px" }}>
          <div style={{ maxWidth: 680 }}>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary-ink)", margin: 0 }}>State of the lakes · Bengaluru</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 50, lineHeight: 1.02, letterSpacing: "-0.02em", color: "var(--ink)", margin: "10px 0 0", textWrap: "pretty" }}>
              <ShinyText>Five lakes, read from orbit each month.</ShinyText>
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 17, color: "var(--ink-muted)", margin: "12px 0 0", lineHeight: 1.5 }}>
              Sentinel-2 imagery turned into a plain-language water-quality verdict — so residents, journalists and wardens can see what's getting better, and what isn't.
            </p>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            <MetricStat label="Mean score" value={<CountUp value={avg} />} unit="/100" size={40} />
            <MetricStat label="Lakes improving" value={<CountUp value={improving} decimals={0} />} unit={`/ ${rows.length}`} size={40} />
          </div>
        </div>
      </div>

      {anomalyCount > 0 && (
        <AlertBanner tone="warning" title={`${anomalyCount} anomaly ${anomalyCount === 1 ? "flag" : "flags"} this month`}
          message="One or more lakes jumped more than 20% month-over-month. Cloud cover during the monsoon can also leave gaps in this month's imagery."
          meta="SENTINEL-2 MONTHLY COMPOSITE · CLOUD < 20%" style={{ marginBottom: 28 }} />
      )}

      {/* Hero verdict + leaderboard */}
      <Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 22, alignItems: "start", marginBottom: 32 }}>
          <VerdictCard lakeName={worst.lake.name} score={worst.score}
            headline={headlineFor(worst.lake.name, worst.score, worst.trend)}
            trend={worst.trend} asOf="LATEST" headlineSize={36} scoreSize={56} />
          <Card large style={{ padding: "20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 8px" }}>
              <SectionLabel>Most polluted → cleanest</SectionLabel>
              <Tag tone="teal">Ranked</Tag>
            </div>
            {ranked.map((r, i) => (
              <LeaderboardRow key={r.lake.id} rank={i + 1} name={r.lake.name} ward={wardLabel(r.lake)}
                score={r.score} onClick={() => navigate(`/lakes/${r.lake.id}`)} />
            ))}
          </Card>
        </div>
      </Reveal>

      {/* Lake grid */}
      <SectionLabel>All lakes</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(216px, 1fr))", gap: 18 }}>
        {ranked.map((r, i) => (
          <Reveal key={r.lake.id} delay={i * 60}>
            <LakeCard name={r.lake.name} ward={wardLabel(r.lake)} score={r.score} delta={r.delta}
              onClick={() => navigate(`/lakes/${r.lake.id}`)} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
