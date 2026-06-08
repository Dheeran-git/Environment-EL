import { useState, useMemo } from "react";
import {
  CartesianGrid,
  Dot,
  Label,
  Line,
  LineChart,
  Bar,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyObservation, RestorationEvent } from "../lib/types";
import { formatPct, formatMonth } from "../lib/scoring";
import { BarChart2, TrendingUp } from "lucide-react";

interface Props {
  rows: MonthlyObservation[];
  events: RestorationEvent[];
  simulatedImpactPoints?: number;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: any;
  index?: number;
}

function AnomalyDot(props: DotProps) {
  const { cx, cy, payload, index } = props;
  if (cx === undefined || cy === undefined || !payload) {
    return <g key={`empty-${index ?? 0}`} />;
  }
  const key = `dot-${payload.month_start}-${index ?? 0}`;
  if (payload.anomaly_flag) {
    return <circle key={key} cx={cx} cy={cy} r={4.5} fill="#eb5757" stroke="#08090a" strokeWidth={1.5} />;
  }
  if (payload.isForecast) {
    return null; // No dots for forecast points
  }
  return <Dot key={key} cx={cx} cy={cy} r={2} fill="#5e6ad2" />;
}

// Monthly typical rainfall values (mm) for Bangalore
const BANGALORE_RAINFALL: Record<number, number> = {
  1: 5,   // Jan
  2: 8,   // Feb
  3: 15,  // Mar
  4: 40,  // Apr
  5: 110, // May
  6: 190, // Jun
  7: 220, // Jul
  8: 240, // Aug
  9: 210, // Sep
  10: 160,// Oct
  11: 60, // Nov
  12: 12  // Dec
};

export default function TrendChart({ rows, events, simulatedImpactPoints = 0 }: Props) {
  const [showRainfall, setShowRainfall] = useState(true);
  const [showForecast, setShowForecast] = useState(true);

  // Process data points and add rainfall + forecast projections
  const chartData = useMemo(() => {
    if (rows.length === 0) return [];

    // Map existing rows and inject rainfall
    const baseData = rows.map((r) => {
      const dateObj = new Date(r.month_start);
      const monthNum = dateObj.getMonth() + 1; // 1-12
      return {
        ...r,
        month: formatMonth(r.month_start),
        rainfall: BANGALORE_RAINFALL[monthNum] ?? 0,
        isForecast: false,
        forecastScore: undefined as number | undefined,
        simulatedScore: undefined as number | undefined
      };
    });

    if (!showForecast) {
      return baseData;
    }

    // Calculate future forecast (6 months ahead, or 36 months if simulation is active)
    const lastRow = rows[rows.length - 1];
    const forecastPoints: any[] = [];
    const forecastMonths = simulatedImpactPoints > 0 ? 36 : 6;
    
    // Estimate trend slope from last 6 data points
    let trendSlope = 0;
    if (rows.length >= 6) {
      const slice = rows.slice(-6);
      const startVal = slice[0].pollution_score;
      const endVal = slice[slice.length - 1].pollution_score;
      trendSlope = (endVal - startVal) / 5.0; // average score change per month
    }

    // Connect the last real data point to the forecast lines
    baseData[baseData.length - 1].forecastScore = lastRow.pollution_score;
    baseData[baseData.length - 1].simulatedScore = lastRow.pollution_score;

    // Generate future months
    let lastDate = new Date(lastRow.month_start);
    for (let i = 1; i <= forecastMonths; i++) {
      const forecastDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
      const year = forecastDate.getFullYear();
      const month = forecastDate.getMonth() + 1; // 1-12
      
      // Compute forecast score with trend and seasonality
      let seasonalEffect = 0;
      if (month >= 6 && month <= 9) seasonalEffect = -4.0;
      else if (month >= 3 && month <= 5) seasonalEffect = 3.0;

      // Base unmanaged forecast
      const projected = lastRow.pollution_score + (trendSlope * i) + seasonalEffect;
      const finalScore = Math.max(5.0, Math.min(100.0, projected));
      
      // Simulated managed recovery forecast
      // Each 10 impact points subtracts ~0.4 score units per month from the trajectory
      const recoveryRate = simulatedImpactPoints / 25.0;
      const simProjected = lastRow.pollution_score + ((trendSlope - recoveryRate) * i) + seasonalEffect;
      const finalSimScore = Math.max(5.0, Math.min(100.0, simProjected));

      const mStartStr = `${year}-${month.toString().padStart(2, "0")}-01`;

      forecastPoints.push({
        lake_id: lastRow.lake_id,
        month_start: mStartStr,
        month_end: mStartStr, 
        ndwi: 0,
        ndvi: 0,
        ndti: 0,
        pollution_score: undefined, 
        pixel_count: 0,
        scene_count: 0,
        anomaly_flag: false,
        mom_change_pct: null,
        restoration_verdict: null,
        restoration_confidence: null,
        month: formatMonth(mStartStr),
        rainfall: BANGALORE_RAINFALL[month] ?? 0,
        isForecast: true,
        forecastScore: i <= 6 ? parseFloat(finalScore.toFixed(1)) : undefined,
        simulatedScore: simulatedImpactPoints > 0 ? parseFloat(finalSimScore.toFixed(1)) : undefined
      });
    }

    return [...baseData, ...forecastPoints];
  }, [rows, showForecast, simulatedImpactPoints]);

  return (
    <div className="space-y-4">
      {/* Toggles Panel */}
      <div className="flex flex-wrap gap-2 text-[12px] bg-surface p-2 rounded-lg border border-border no-print">
        <button
          onClick={() => setShowRainfall(prev => !prev)}
          className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-all font-medium ${
            showRainfall 
              ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
              : "bg-surface/50 border-border/40 text-fg-muted hover:border-border"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          {showRainfall ? "Hide Rainfall Correlation" : "Show Rainfall Correlation"}
        </button>
        <button
          onClick={() => setShowForecast(prev => !prev)}
          className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-all font-medium ${
            showForecast 
              ? "bg-accent/10 border-accent/30 text-accent" 
              : "bg-surface/50 border-border/40 text-fg-muted hover:border-border"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          {showForecast ? "Hide Forecasts" : "Show Forecasts"}
        </button>
      </div>

      {/* Main Chart */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#22252a" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "#8a8f98", fontSize: 11, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#22252a" }}
                tickLine={{ stroke: "#22252a" }}
                minTickGap={24}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fill: "#8a8f98", fontSize: 11, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#22252a" }}
                tickLine={{ stroke: "#22252a" }}
                width={32}
              />
              {showRainfall && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 300]}
                  tick={{ fill: "#2f80ed", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "#22252a" }}
                  tickLine={{ stroke: "#22252a" }}
                  width={32}
                  unit="mm"
                />
              )}
              <Tooltip
                cursor={{ stroke: "#5e6ad2", strokeOpacity: 0.35 }}
                contentStyle={{
                  background: "#0f1011",
                  border: "1px solid #22252a",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#8a8f98" }}
                formatter={(value, name, entry) => {
                  const row = entry.payload as any;
                  if (name === "Rainfall") {
                    return [`${value} mm`, "Monthly Rainfall"];
                  }
                  if (name === "Simulated Score") {
                    return [`${row.simulatedScore}`, "Simulated Path"];
                  }
                  if (row.isForecast) {
                    return [`${row.forecastScore} (Forecasted)`, "Pollution Score"];
                  }
                  const extras: string[] = [];
                  if (row.mom_change_pct !== null) extras.push(`MoM ${formatPct(row.mom_change_pct)}`);
                  if (row.anomaly_flag) extras.push("anomaly");
                  if (row.restoration_verdict) extras.push(`verdict: ${row.restoration_verdict}`);
                  return [`${row.pollution_score?.toFixed(1)}  ·  ${extras.join(" · ")}`, "Score"];
                }}
              />
              
              {/* Optional Rainfall Bars */}
              {showRainfall && (
                <Bar 
                  yAxisId="right" 
                  dataKey="rainfall" 
                  name="Rainfall"
                  fill="#2f80ed" 
                  fillOpacity={0.12} 
                  barSize={18}
                />
              )}

              {/* Real Pollution Score Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pollution_score"
                stroke="#5e6ad2"
                strokeWidth={1.75}
                dot={(p) => <AnomalyDot {...(p as DotProps)} />}
                activeDot={{ r: 5, fill: "#7170ff", stroke: "#08090a", strokeWidth: 1.5 }}
                isAnimationActive={false}
                connectNulls={true}
              />

              {/* Forecast Dashed Line */}
              {showForecast && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="forecastScore"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: "#c084fc" }}
                  isAnimationActive={true}
                  connectNulls={true}
                />
              )}

              {/* Simulated Recovery Line */}
              {showForecast && simulatedImpactPoints > 0 && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="simulatedScore"
                  name="Simulated Score"
                  stroke="#27ae60"
                  strokeWidth={1.75}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={{ r: 4, fill: "#2ecc71" }}
                  isAnimationActive={true}
                  connectNulls={true}
                />
              )}

              {events.map((ev, i) => (
                <ReferenceLine
                  yAxisId="left"
                  key={`${ev.event_date}-${i}`}
                  x={formatMonth(ev.event_date)}
                  stroke="#eb5757"
                  strokeDasharray="3 3"
                  strokeOpacity={0.85}
                >
                  <Label
                    value={ev.title.slice(0, 24)}
                    position="insideTopRight"
                    fill="#eb5757"
                    fontSize={10}
                    fontFamily="Inter"
                  />
                </ReferenceLine>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-fg-muted">
          <LegendSwatch color="#5e6ad2" label="Pollution score 0–100 (Observed)" />
          {showForecast && <LegendSwatch color="#a855f7" label="Pollution score (6-Month Forecast)" dashed />}
          {showForecast && simulatedImpactPoints > 0 && <LegendSwatch color="#27ae60" label="Pollution score (Simulated Recovery)" dashed />}
          {showRainfall && <LegendSwatch color="#2f80ed" label="Rainfall (mm) correlation" bar />}
          <LegendSwatch color="#eb5757" label="Anomaly > 20% MoM" dot />
          <LegendSwatch color="#eb5757" label="Restoration event" dashed />
        </div>
      </div>
    </div>
  );
}

function LegendSwatch({
  color,
  label,
  dot,
  dashed,
  bar
}: {
  color: string;
  label: string;
  dot?: boolean;
  dashed?: boolean;
  bar?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dot ? (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      ) : dashed ? (
        <span
          className="w-4 h-0 border-t-2 border-dashed"
          style={{ borderColor: color }}
        />
      ) : bar ? (
        <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40" style={{ backgroundColor: color + "33", borderColor: color }} />
      ) : (
        <span className="w-4 h-0.5 rounded" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}
