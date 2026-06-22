import { Badge, Card, Tag } from "../design/ds";
import { Icon } from "../design/icons";
import type { IconName } from "../design/icons";
import { Reveal } from "../design/motion";

const STEPS: { icon: IconName; k: string; t: string; d: string }[] = [
  { icon: "satellite", k: "01", t: "Sentinel-2", d: "Monthly median composite, cloud < 20%, 10 m, clipped per lake." },
  { icon: "waves", k: "02", t: "Spectral indices", d: "NDWI water · NDVI vegetation · NDTI turbidity, over lit water pixels." },
  { icon: "activity", k: "03", t: "Pollution score", d: "Weighted sum, normalised and clamped to 0–100." },
  { icon: "checkCircle", k: "04", t: "Verdict", d: "Plain-language band + did-restoration-work comparison." },
];
const WEIGHTS = [
  { label: "NDTI · turbidity", w: 40, color: "var(--data-high)" },
  { label: "NDWI · less water", w: 35, color: "var(--primary)" },
  { label: "NDVI · greening", w: 25, color: "var(--data-pristine)" },
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 27, letterSpacing: "-0.02em", color: "var(--ink)", margin: "0 0 12px" }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: "var(--font-ui)", fontSize: 16, lineHeight: 1.65, color: "var(--ink)", margin: "0 0 14px", maxWidth: "64ch" }}>{children}</p>;
}
function Mono({ children }: { children: React.ReactNode }) {
  return <code style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, background: "var(--surface-alt)", border: "1px solid var(--border-hairline)", borderRadius: 6, padding: "1px 6px", color: "var(--primary-ink)" }}>{children}</code>;
}

export default function Methodology() {
  return (
    <div style={{ padding: "40px 32px 72px", maxWidth: 960, margin: "0 auto" }}>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary-ink)", margin: 0 }}>How the score works</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 46, lineHeight: 1.04, letterSpacing: "-0.02em", color: "var(--ink)", margin: "10px 0 14px", textWrap: "pretty" }}>
        From a satellite pass to a plain-language verdict.
      </h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 18, color: "var(--ink-muted)", lineHeight: 1.55, maxWidth: "62ch", margin: "0 0 32px" }}>
        Every month we turn raw Sentinel-2 scenes into a single 0–100 pollution score, an anomaly flag, and a "did restoration work?" verdict. Here's the whole pipeline, in the open.
      </p>

      {/* Pipeline diagram */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginBottom: 40 }}>
        {STEPS.map((s, i) => (
          <Reveal key={s.k} delay={i * 90}>
            <div style={{ position: "relative", padding: "0 18px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--primary-wash)", color: "var(--primary)", marginBottom: 14 }}>
                <Icon name={s.icon} size={24} color="var(--primary)" />
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)" }}>{s.k}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", margin: "2px 0 6px", letterSpacing: "-0.01em" }}>{s.t}</div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink-muted)", margin: 0, paddingRight: 8 }}>{s.d}</p>
              {i < STEPS.length - 1 && (
                <div style={{ position: "absolute", right: 8, top: 18, color: "var(--accent)" }}><Icon name="arrowRight" size={18} color="var(--accent)" /></div>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      <H2>The three indices</H2>
      <P>
        For each monthly composite, clipped to the lake polygon, we compute three normalized-difference
        indices over the analytics bands and reduce them over lit water pixels only (<Mono>NDWI &gt; 0</Mono>):
      </P>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
        {[["NDWI", "(Green − NIR) / (Green + NIR)", "Water presence"],
          ["NDVI", "(NIR − Red) / (NIR + Red)", "Vegetation / algae"],
          ["NDTI", "(SWIR − Red) / (SWIR + Red)", "Turbidity"]].map(([n, f, d]) => (
          <Card key={n} variant="panel" style={{ padding: 16 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: "var(--primary-ink)" }}>{n}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-muted)", margin: "8px 0", lineHeight: 1.5 }}>{f}</div>
            <Tag tone="teal">{d}</Tag>
          </Card>
        ))}
      </div>

      <H2>Weighting the score</H2>
      <P>Each index is normalised to <Mono>[0,1]</Mono> (NDWI inverted — less water means more pollution), then combined as a weighted sum and clamped to <Mono>[0,100]</Mono>. Turbidity carries the most weight:</P>
      <div style={{ display: "flex", height: 44, borderRadius: "var(--radius-pill)", overflow: "hidden", marginBottom: 12, border: "1px solid var(--border-hairline)" }}>
        {WEIGHTS.map((w) => (
          <div key={w.label} style={{ width: `${w.w}%`, background: w.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{w.w}%</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 28 }}>
        {WEIGHTS.map((w) => (
          <span key={w.label} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-muted)" }}>
            <i style={{ width: 11, height: 11, borderRadius: 3, background: w.color }} />{w.label}
          </span>
        ))}
      </div>

      <H2>Anomalies & the restoration verdict</H2>
      <P>
        A month-over-month jump of <Mono>&gt; +20%</Mono> is flagged as an anomaly (a coral dot on the trend line).
        When a lake has a dated restoration event, we compare the mean score six months before vs after:
      </P>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Mono>post − pre ≤ −5</Mono><Badge status="good">Improved</Badge></span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Mono>≥ +5</Mono><Badge status="critical">Worsened</Badge></span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Mono>otherwise</Mono><Badge status="caution">Unchanged</Badge></span>
      </div>
    </div>
  );
}
