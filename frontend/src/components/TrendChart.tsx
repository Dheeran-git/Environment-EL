import {
  CartesianGrid,
  Dot,
  Label,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyObservation, RestorationEvent } from "../lib/types";
import { formatPct, formatMonth } from "../lib/scoring";

interface Props {
  rows: MonthlyObservation[];
  events: RestorationEvent[];
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: MonthlyObservation;
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
  return <Dot key={key} cx={cx} cy={cy} r={2} fill="#5e6ad2" />;
}

export default function TrendChart({ rows, events }: Props) {
  const data = rows.map((r) => ({
    ...r,
    month: formatMonth(r.month_start),
  }));

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#22252a" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#8a8f98", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "#22252a" }}
              tickLine={{ stroke: "#22252a" }}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#8a8f98", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "#22252a" }}
              tickLine={{ stroke: "#22252a" }}
              width={32}
            />
            <Tooltip
              cursor={{ stroke: "#5e6ad2", strokeOpacity: 0.35 }}
              contentStyle={{
                background: "#0f1011",
                border: "1px solid #22252a",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "#8a8f98" }}
              formatter={(_value, _name, entry) => {
                const row = entry.payload as MonthlyObservation;
                const extras: string[] = [];
                if (row.mom_change_pct !== null) extras.push(`MoM ${formatPct(row.mom_change_pct)}`);
                if (row.anomaly_flag) extras.push("anomaly");
                if (row.restoration_verdict) extras.push(`verdict: ${row.restoration_verdict}`);
                return [`${row.pollution_score.toFixed(1)}  ·  ${extras.join(" · ")}`, "Score"];
              }}
            />
            <Line
              type="monotone"
              dataKey="pollution_score"
              stroke="#5e6ad2"
              strokeWidth={1.75}
              dot={(p) => <AnomalyDot {...(p as DotProps)} />}
              activeDot={{ r: 5, fill: "#7170ff", stroke: "#08090a", strokeWidth: 1.5 }}
              isAnimationActive={false}
            />
            {events.map((ev, i) => (
              <ReferenceLine
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
        <LegendSwatch color="#5e6ad2" label="Pollution score 0–100" />
        <LegendSwatch color="#eb5757" label="Anomaly > 20% MoM" dot />
        <LegendSwatch color="#eb5757" label="Restoration event" dashed />
      </div>
    </div>
  );
}

function LegendSwatch({
  color,
  label,
  dot,
  dashed,
}: {
  color: string;
  label: string;
  dot?: boolean;
  dashed?: boolean;
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
      ) : (
        <span className="w-4 h-0.5 rounded" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}
