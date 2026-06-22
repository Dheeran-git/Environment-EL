import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CitizenReport, Lake, MonthlyObservation } from "../lib/types";
import {
  coordsLabel, deriveTrend, headlineFor, monthLabel, pickLatest, wardLabel,
} from "../lib/lakeui";
import {
  BandToggle, Button, Card, IncidentItem, Input, MetricStat, Select, Tag, TrendChart, VerdictCard,
} from "../design/ds";
import type { BandDef, TrendEvent, TrendPoint } from "../design/ds";
import { Reveal } from "../design/motion";
import { Icon } from "../design/icons";

const BANDS: BandDef[] = [
  { id: "rgb", label: "RGB", hint: "True colour" },
  { id: "ndwi", label: "NDWI", hint: "Water" },
  { id: "ndvi", label: "NDVI", hint: "Vegetation" },
];
const BAND_FALLBACK: Record<string, string> = {
  rgb: "linear-gradient(135deg,#3a5a40 0%,#588157 35%,#a3b18a 70%,#dad7cd 100%)",
  ndwi: "linear-gradient(135deg,#03045e 0%,#0077b6 45%,#00b4d8 75%,#90e0ef 100%)",
  ndvi: "linear-gradient(135deg,#081c15 0%,#1b4332 40%,#40916c 70%,#95d5b2 100%)",
};
const BAND_NOTE: Record<string, string> = {
  rgb: "True-colour composite — bunds, built edge and open water.",
  ndwi: "NDWI water index — brighter = more open water surface.",
  ndvi: "NDVI vegetation index — brighter = algae / aquatic plants.",
};
const INCIDENT_TYPES = [
  { value: "Froth / foam overflow", label: "Froth / foam overflow" },
  { value: "Solid-waste dumping", label: "Solid-waste dumping" },
  { value: "Suspected discharge", label: "Suspected discharge" },
  { value: "Fish die-off", label: "Fish die-off" },
  { value: "Algal bloom", label: "Algal bloom" },
];

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");
function assetUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  if (/^https?:\/\//.test(u)) return u;
  return `${API_BASE}${u}`;
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-muted)", margin: 0 }}>{children}</p>
      {action}
    </div>
  );
}

export default function LakeDetail() {
  const { lakeId = "" } = useParams<{ lakeId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [band, setBand] = useState("ndwi");
  const [form, setForm] = useState({ incident_type: INCIDENT_TYPES[0].value, description: "", reporter_name: "" });

  const lakesQuery = useQuery({ queryKey: ["lakes"], queryFn: api.getLakes });
  const seriesQuery = useQuery({ queryKey: ["timeseries", lakeId], queryFn: () => api.getTimeseries(lakeId), retry: false });
  const eventsQuery = useQuery({ queryKey: ["restoration", lakeId], queryFn: () => api.getRestorationEvents(lakeId), retry: false });
  const artifactsQuery = useQuery({ queryKey: ["artifacts", lakeId], queryFn: () => api.getLakeArtifacts(lakeId), retry: false });
  const reportsQuery = useQuery({ queryKey: ["reports"], queryFn: api.getReports, retry: false });

  const createReport = useMutation({
    mutationFn: (body: Omit<CitizenReport, "id" | "created_at">) => api.createReport(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      setForm({ incident_type: INCIDENT_TYPES[0].value, description: "", reporter_name: "" });
    },
  });

  const lake = lakesQuery.data?.lakes.find((l: Lake) => l.id === lakeId);
  const rows = (seriesQuery.data?.data ?? []) as MonthlyObservation[];
  const validRows = rows.filter((r) => r.pixel_count > 0);
  const latest = useMemo(() => pickLatest(lakeId, rows), [lakeId, rows]);

  const score = latest?.pollution_score ?? lake?.computed_pollution_score ?? 0;
  const delta = latest?.mom_change_pct ?? null;
  const trend = deriveTrend(delta);

  const trendData: TrendPoint[] = validRows.map((r) => ({
    month: r.month_start.slice(0, 7), score: r.pollution_score, anomaly: r.anomaly_flag,
  }));
  const trendEvents: TrendEvent[] = (eventsQuery.data?.events ?? []).map((e) => ({
    month: e.event_date.slice(0, 7), title: e.title,
  }));

  const incidents = (reportsQuery.data?.reports ?? []).filter((r) => r.lake_id === lakeId);

  const bandImage = assetUrl(
    band === "rgb" ? artifactsQuery.data?.thumb_url
      : band === "ndwi" ? artifactsQuery.data?.thumb_ndwi_url
        : artifactsQuery.data?.thumb_ndvi_url,
  );

  if (lakesQuery.isLoading) {
    return <div style={{ padding: 48, color: "var(--ink-muted)", fontFamily: "var(--font-ui)" }}>Loading…</div>;
  }
  if (!lake) {
    return <div style={{ padding: 48, color: "var(--data-severe)", fontFamily: "var(--font-ui)" }}>Unknown lake: {lakeId}</div>;
  }

  return (
    <div style={{ padding: "28px 32px 64px", maxWidth: 1180, margin: "0 auto" }}>
      <button onClick={() => navigate("/")} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--primary-ink)", padding: 0, marginBottom: 18 }}>
        <Icon name="chevronRight" size={15} style={{ transform: "rotate(180deg)" }} /> All lakes
      </button>

      <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-muted)", marginBottom: 12 }}>{wardLabel(lake)}</div>

      <VerdictCard lakeName={lake.name} score={score} headline={headlineFor(lake.name, score, trend)}
        trend={trend} asOf={latest ? monthLabel(latest.month_start) : undefined} style={{ marginBottom: 22 }} />

      <Card style={{ marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
          <MetricStat label="Pollution score" value={score.toFixed(1)} unit="/100" delta={delta} />
          <MetricStat label="Surface area" value={lake.official_area_ha != null ? lake.official_area_ha.toFixed(0) : "—"} unit="ha" />
          <MetricStat label="NDWI (water)" value={latest ? latest.ndwi.toFixed(2) : "—"} size={28} />
          <MetricStat label="Coordinates" value={coordsLabel(lake.centroid)} size={18} />
        </div>
      </Card>

      <Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 22, alignItems: "start", marginBottom: 22 }}>
          <Card>
            <SectionLabel action={<Tag dotColor="var(--accent)">{trendEvents.length} restoration events</Tag>}>Monthly score</SectionLabel>
            {trendData.length === 0 ? (
              <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-muted)", fontSize: 14 }}>No analytics time series yet for this lake.</p>
            ) : (
              <TrendChart data={trendData} events={trendEvents} height={210} />
            )}
          </Card>
          <Card>
            <SectionLabel action={<BandToggle bands={BANDS} value={band} onChange={setBand} />}>Sentinel-2 imagery</SectionLabel>
            <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", aspectRatio: "4/3", background: BAND_FALLBACK[band], transition: "background .5s var(--ease-water)" }}>
              {bandImage && <img src={bandImage} alt={`${band} composite for ${lake.name}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
              <span style={{ position: "absolute", left: 12, top: 12, fontFamily: "var(--font-mono)", fontSize: 11, color: "#fff", background: "rgba(16,42,47,0.55)", padding: "4px 9px", borderRadius: "var(--radius-pill)" }}>{band.toUpperCase()} · 10 m · EPSG:32643</span>
              {!bandImage && <span style={{ position: "absolute", right: 12, bottom: 12, fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.85)" }}>SIMULATED CLIP</span>}
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-muted)", margin: "12px 0 0", lineHeight: 1.45 }}>{BAND_NOTE[band]}</p>
          </Card>
        </div>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 22, alignItems: "start" }}>
        <Card>
          <SectionLabel action={<Tag tone="teal">{incidents.length} reports</Tag>}>Citizen incident reports</SectionLabel>
          {incidents.length === 0 ? (
            <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-muted)", fontSize: 14, margin: 0 }}>No reports yet — be the first to flag something.</p>
          ) : (
            <div style={{ marginTop: -4 }}>
              {incidents.map((it) => (
                <IncidentItem key={it.id} type={it.incident_type} description={it.description}
                  reporter={it.reporter_name} when={new Date(it.created_at).toLocaleString("en-IN")}
                  status={it.status} coords={it.lat != null && it.lon != null ? `${it.lat.toFixed(4)}, ${it.lon.toFixed(4)}` : undefined} />
              ))}
            </div>
          )}
        </Card>
        <Card variant="accent">
          <SectionLabel>Report an incident</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Select label="Incident type" options={INCIDENT_TYPES} value={form.incident_type}
              onChange={(e) => setForm((f) => ({ ...f, incident_type: e.target.value }))} />
            <Input label="What did you see?" placeholder="A short description…" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Input label="Your name" placeholder="e.g. Asha R." value={form.reporter_name}
              onChange={(e) => setForm((f) => ({ ...f, reporter_name: e.target.value }))} />
            <Button variant="primary" icon={<Icon name="flag" size={15} color="#fff" />}
              disabled={createReport.isPending || !form.description.trim() || !form.reporter_name.trim()}
              onClick={() => createReport.mutate({
                lake_id: lakeId, incident_type: form.incident_type, description: form.description,
                reporter_name: form.reporter_name, lat: lake.centroid?.[1] ?? null, lon: lake.centroid?.[0] ?? null,
                status: "pending",
              })}>
              {createReport.isPending ? "Submitting…" : "Submit report"}
            </Button>
            {createReport.isSuccess && <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--data-pristine)" }}>Thanks — your report was logged.</span>}
            {createReport.isError && <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--data-high)" }}>Couldn't submit. Try again.</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}
