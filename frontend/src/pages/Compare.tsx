import { useState, useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { formatMonth, formatScore, scoreToTone, toneToColor } from "../lib/scoring";
import type { Lake, MonthlyObservation } from "../lib/types";
import { GitCompare, Info } from "lucide-react";

const LAKE_COLORS: Record<string, string> = {
  bellandur: "#eb5757", // Red
  varthur: "#5e6ad2",    // Blue
  hebbal: "#f2c94c",     // Yellow
  agara: "#27ae60",      // Green
  sankey: "#2f80ed",      // Cyan
  ulsoor: "#9b51e0"      // Purple
};

export default function Compare() {
  const lakesQuery = useQuery({ queryKey: ["lakes"], queryFn: api.getLakes });
  const lakes = lakesQuery.data?.lakes ?? [];

  // Store selected lake IDs
  const [selectedIds, setSelectedIds] = useState<string[]>(["bellandur", "varthur", "agara"]);

  // Fetch timeseries queries in parallel
  const seriesQueries = useQueries({
    queries: lakes.map((lake: Lake) => ({
      queryKey: ["timeseries", lake.id],
      queryFn: () => api.getTimeseries(lake.id),
      enabled: selectedIds.includes(lake.id),
      retry: false,
    })),
  });

  // Create mapping from lakeId to observations
  const seriesData = useMemo(() => {
    const map: Record<string, MonthlyObservation[]> = {};
    lakes.forEach((lake: Lake, i: number) => {
      if (selectedIds.includes(lake.id)) {
        map[lake.id] = seriesQueries[i]?.data?.data ?? [];
      }
    });
    return map;
  }, [lakes, selectedIds, seriesQueries]);

  // Combine monthly datasets for Recharts
  const chartData = useMemo(() => {
    // Collect all unique months
    const allMonthsSet = new Set<string>();
    Object.values(seriesData).forEach((rows) => {
      rows.forEach((row) => {
        allMonthsSet.add(row.month_start);
      });
    });

    const sortedMonths = Array.from(allMonthsSet).sort();
    
    return sortedMonths.map((mStart) => {
      const point: Record<string, any> = {
        monthRaw: mStart,
        month: formatMonth(mStart),
      };
      selectedIds.forEach((id: string) => {
        const obs = seriesData[id]?.find((row: MonthlyObservation) => row.month_start === mStart);
        if (obs) {
          point[id] = obs.pollution_score;
        }
      });
      return point;
    });
  }, [seriesData, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) // keep at least 1 selected
        : [...prev, id]
    );
  };

  // Compute comparison stats for each selected lake
  const lakeStats = useMemo(() => {
    return selectedIds.map((id: string) => {
      const lake = lakes.find((l: Lake) => l.id === id);
      const rows = seriesData[id] ?? [];
      
      const latestScore = rows.length > 0 ? rows[rows.length - 1].pollution_score : null;
      const latestVerdict = rows.length > 0 ? rows[rows.length - 1].restoration_verdict : null;
      
      // Calculate averages
      const scores = rows.map(r => r.pollution_score);
      const avg3 = scores.length >= 3 
        ? scores.slice(-3).reduce((a, b) => a + b, 0) / 3 
        : (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null);
        
      const avg12 = scores.length >= 12
        ? scores.slice(-12).reduce((a, b) => a + b, 0) / 12
        : (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null);
        
      const anomalyCount = rows.filter(r => r.anomaly_flag).length;

      return {
        lake,
        latestScore,
        latestVerdict,
        avg3,
        avg12,
        anomalyCount,
        dataPointsCount: rows.length
      };
    });
  }, [selectedIds, lakes, seriesData]);

  if (lakesQuery.isLoading) {
    return <div className="p-6 text-fg-muted">Loading lake directory…</div>;
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fadeIn">
      <header className="border-b border-border pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-fg flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-accent" />
          Multi-Lake Comparison Sandbox
        </h1>
        <p className="text-fg-muted mt-1 text-[13.5px]">
          Compare pollution levels, historic anomalies, and restoration efficacy across selected Bangalore waterbodies.
        </p>
      </header>

      {/* Checklist selectors */}
      <section className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-fg-muted mb-3">
          Select Lakes to Compare
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {lakes.map((lake: Lake) => {
            const isSelected = selectedIds.includes(lake.id);
            const color = LAKE_COLORS[lake.id] ?? "#8a8f98";
            return (
              <button
                key={lake.id}
                onClick={() => toggleSelect(lake.id)}
                className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all flex items-center gap-2 ${
                  isSelected 
                    ? "bg-surface-2 border-border/80 text-fg shadow-sm" 
                    : "bg-surface/40 border-border/40 text-fg-muted hover:border-border/80"
                }`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: isSelected ? color : "transparent", border: `2px solid ${color}` }}
                />
                {lake.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Recharts Compare Chart */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-fg-muted mb-4">
          Historical Trends Comparison
        </h3>
        <div className="h-[380px]">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-fg-muted text-[13px]">
              No timeseries data loaded yet. Ensure backend analytics is processed.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="#22252a" strokeDasharray="2 4" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: "#8a8f98", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "#22252a" }}
                  tickLine={{ stroke: "#22252a" }}
                  minTickGap={20}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: "#8a8f98", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "#22252a" }}
                  tickLine={{ stroke: "#22252a" }}
                />
                <Tooltip 
                  cursor={{ stroke: "#5e6ad2", strokeOpacity: 0.2 }}
                  contentStyle={{
                    background: "#0f1011",
                    border: "1px solid #22252a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#8a8f98", fontFamily: "JetBrains Mono", marginBottom: 4 }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: "#8a8f98" }}
                />
                {selectedIds.map(id => {
                  const name = lakes.find((l: Lake) => l.id === id)?.name ?? id;
                  return (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={id}
                      name={name}
                      stroke={LAKE_COLORS[id] ?? "#8a8f98"}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 1 }}
                      isAnimationActive={true}
                      connectNulls={true}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Comparison Grid */}
      <section className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2/40 text-fg-muted font-medium text-[11px] uppercase tracking-wider">
              <th className="p-4">Lake Name</th>
              <th className="p-4 text-center">Latest Score</th>
              <th className="p-4 text-center">3M Avg</th>
              <th className="p-4 text-center">12M Avg</th>
              <th className="p-4 text-center">Anomalies</th>
              <th className="p-4">Restoration Verdict</th>
              <th className="p-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {lakeStats.map(({ lake, latestScore, latestVerdict, avg3, avg12, anomalyCount }) => {
              if (!lake) return null;
              const tone = latestScore !== null ? scoreToTone(latestScore) : "unknown";
              const dotColor = LAKE_COLORS[lake.id] ?? "#8a8f98";
              return (
                <tr key={lake.id} className="hover:bg-surface-2/20 transition-colors">
                  <td className="p-4 font-medium flex items-center gap-2 text-fg">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                    {lake.name}
                  </td>
                  <td className="p-4 text-center font-mono font-semibold">
                    {latestScore !== null ? (
                      <span style={{ color: toneToColor(tone) }}>
                        {latestScore.toFixed(1)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-4 text-center font-mono text-fg-muted">
                    {formatScore(avg3)}
                  </td>
                  <td className="p-4 text-center font-mono text-fg-muted">
                    {formatScore(avg12)}
                  </td>
                  <td className="p-4 text-center font-mono">
                    <span className={anomalyCount > 0 ? "text-pill-severe font-semibold" : "text-fg-muted"}>
                      {anomalyCount}
                    </span>
                  </td>
                  <td className="p-4 capitalize">
                    {latestVerdict ? (
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                        latestVerdict === "improved" ? "bg-pill-low/10 text-pill-low border border-pill-low/20" :
                        latestVerdict === "worsened" ? "bg-pill-severe/10 text-pill-severe border border-pill-severe/20" :
                        "bg-pill-mod/10 text-pill-mod border border-pill-mod/20"
                      }`}>
                        {latestVerdict.replace("_", " ")}
                      </span>
                    ) : (
                      <span className="text-fg-muted italic text-[12px]">Insufficient data</span>
                    )}
                  </td>
                  <td className="p-4 text-fg-muted text-[12px] max-w-[250px] truncate" title={lake.notes ?? ""}>
                    {lake.notes ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Comparison Insights Footer */}
      <div className="flex gap-2.5 p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 text-blue-400 text-[12.5px] items-start">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Tip:</strong> Select lakes that feed into each other (e.g., <strong>Bellandur Lake</strong> which flows directly downstream into <strong>Varthur Lake</strong>) to observe how restoration achievements and pollution surges propagate through the hydrological chain.
        </p>
      </div>
    </div>
  );
}
