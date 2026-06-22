import { useState } from "react";
import { Card, ScoreDial, Tag } from "../design/ds";
import { Icon } from "../design/icons";
import type { IconName } from "../design/icons";
import { Reveal } from "../design/motion";

type Policy = { id: string; name: string; category: "engineering" | "ecological" | "policy"; impact: number; cost: string; description: string };

const POLICIES: Policy[] = [
  { id: "stp", name: "Decentralized Sewage Treatment (STPs)", category: "engineering", impact: 35, cost: "High",
    description: "Mini treatment plants where raw sewage enters the lake. Sewage is caught, cleaned, and only clean water is released." },
  { id: "wetlands", name: "Floating Treatment Wetlands (FTWs)", category: "ecological", impact: 20, cost: "Low",
    description: "Artificial floating islands whose plant roots act like a sponge, absorbing nitrogen and phosphorus from the water." },
  { id: "aeration", name: "Solar-Powered Aeration", category: "engineering", impact: 15, cost: "Medium",
    description: "Solar fountains stir the water and pump in oxygen — keeping it fresh, preventing bad smells and fish kills." },
  { id: "desilting", name: "Silt Traps & Eco-Dredging", category: "engineering", impact: 15, cost: "High",
    description: "Vacuuming toxic silt from the lakebed and trapping dirt at the inlets, making the lake deeper and cleaner." },
  { id: "zld", name: "Zero Liquid Discharge Enforcement", category: "policy", impact: 10, cost: "Medium",
    description: "Apartments and factories must treat and reuse 100% of their wastewater on-site — no outside dumping." },
  { id: "community", name: "Citizen Lake Warden Committees", category: "policy", impact: 10, cost: "Low",
    description: "Local volunteers patrol the boundary, report polluters, and clear plastic — community stewardship of the lake." },
];

const CAT: Record<Policy["category"], { label: string; color: string; wash: string; icon: IconName }> = {
  engineering: { label: "Engineering", color: "var(--primary-ink)", wash: "var(--primary-wash)", icon: "factory" },
  ecological: { label: "Ecological", color: "var(--data-pristine)", wash: "var(--data-pristine-wash)", icon: "leaf" },
  policy: { label: "Policy", color: "var(--accent-deep)", wash: "var(--accent-wash)", icon: "users" },
};

export default function Policies() {
  const [active, setActive] = useState<string[]>(["community", "wetlands"]);
  const toggle = (id: string) => setActive((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const base = 22;
  const gained = active.reduce((s, id) => s + (POLICIES.find((p) => p.id === id)?.impact || 0), 0);
  const health = Math.min(100, base + gained);
  const pollution = 100 - health;

  return (
    <div style={{ padding: "40px 32px 72px", maxWidth: 1120, margin: "0 auto" }}>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary-ink)", margin: 0 }}>Restoration playbook</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 46, lineHeight: 1.04, letterSpacing: "-0.02em", color: "var(--ink)", margin: "10px 0 14px", textWrap: "pretty" }}>
        What actually brings a lake back?
      </h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 18, color: "var(--ink-muted)", lineHeight: 1.55, maxWidth: "62ch", margin: "0 0 32px" }}>
        Real restoration stacks civil engineering, ecological repair and policy. Build a plan below and watch a polluted lake climb toward a healthy ecosystem.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        {/* Method grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {POLICIES.map((p) => {
            const on = active.includes(p.id);
            const c = CAT[p.category];
            return (
              <button key={p.id} onClick={() => toggle(p.id)} style={{
                textAlign: "left", cursor: "pointer", border: on ? "1.5px solid var(--primary)" : "1px solid var(--border-hairline)",
                background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: 18,
                boxShadow: on ? "var(--shadow-md)" : "var(--shadow-xs)", transition: "all .2s var(--ease-out)",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: c.color, background: c.wash, padding: "4px 10px", borderRadius: "var(--radius-pill)" }}>
                    <Icon name={c.icon} size={13} color={c.color} />{c.label}
                  </span>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: on ? "none" : "1.5px solid var(--border-strong)", background: on ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {on && <Icon name="checkCircle" size={14} color="#fff" />}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1.15 }}>{p.name}</div>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.45, color: "var(--ink-muted)", margin: 0 }}>{p.description}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-hairline)", paddingTop: 10, marginTop: "auto" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--primary-ink)" }}>+{p.impact} impact</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)" }}>COST {p.cost.toUpperCase()}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Scorecard */}
        <Card large style={{ position: "sticky", top: 88, textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-muted)", margin: "0 0 16px" }}>Simulated lake</p>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <ScoreDial score={pollution} size={168} animate={false} />
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink)", marginBottom: 6 }}>
            Ecosystem health <b style={{ fontFamily: "var(--font-mono)" }}>{health}</b> / 100
          </div>
          <div style={{ height: 8, borderRadius: "var(--radius-pill)", background: "var(--hairline)", overflow: "hidden", marginBottom: 18 }}>
            <div style={{ height: "100%", width: `${health}%`, background: health >= 80 ? "var(--data-pristine)" : health >= 55 ? "var(--data-moderate)" : "var(--data-high)", transition: "width .5s var(--ease-water)" }} />
          </div>
          <div style={{ textAlign: "left", borderTop: "1px solid var(--border-hairline)", paddingTop: 14 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Active measures ({active.length})</div>
            {active.length === 0
              ? <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontStyle: "italic", color: "var(--ink-muted)", margin: 0 }}>None — the lake keeps eutrophying.</p>
              : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{active.map((id) => <Tag key={id} tone="teal">{POLICIES.find((p) => p.id === id)?.name.split(" ")[0]}</Tag>)}</div>}
          </div>
        </Card>
      </div>

      <Reveal>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-muted)", marginTop: 28, maxWidth: "70ch" }}>
          This sandbox is illustrative — impact weights are indicative, not a calibrated forecast. Real outcomes depend on inflow control, enforcement and maintenance over years.
        </p>
      </Reveal>
    </div>
  );
}
