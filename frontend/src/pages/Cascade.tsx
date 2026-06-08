import { useState } from "react";
import { 
  GitBranch, 
  HelpCircle, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  Activity
} from "lucide-react";
import { scoreToTone, toneToColor } from "../lib/scoring";

interface LakeNode {
  id: string;
  name: string;
  baseScore: number;
  description: string;
}

const CASCADING_LAKES: LakeNode[] = [
  { 
    id: "agara", 
    name: "Agara Lake", 
    baseScore: 20.0,
    description: "Upstream headwaters. Feeding into Bellandur." 
  },
  { 
    id: "bellandur", 
    name: "Bellandur Lake", 
    baseScore: 65.0,
    description: "Middle catchment sink. Receives major sewage inflows." 
  },
  { 
    id: "varthur", 
    name: "Varthur Lake", 
    baseScore: 75.0,
    description: "Downstream outlet. Culmination of the catchment chain." 
  }
];

const ISOLATED_LAKES: LakeNode[] = [
  { 
    id: "sankey", 
    name: "Sankey Tank", 
    baseScore: 15.0,
    description: "Isolated artificial tank. Extremely high water clarity." 
  },
  { 
    id: "ulsoor", 
    name: "Ulsoor Lake", 
    baseScore: 42.0,
    description: "Historic central lake. Controlled outflow gates." 
  },
  { 
    id: "hebbal", 
    name: "Hebbal Lake", 
    baseScore: 30.0,
    description: "Northern system watershed. Independent catchment basin." 
  }
];

export default function Cascade() {
  const [selectedLakeId, setSelectedLakeId] = useState<string>("agara");
  const [spills, setSpills] = useState<Record<string, boolean>>({});
  const [cleanups, setCleanups] = useState<Record<string, boolean>>({});

  const handleSpill = (id: string) => {
    setSpills(prev => ({ ...prev, [id]: !prev[id] }));
    if (cleanups[id]) {
      setCleanups(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleCleanup = (id: string) => {
    setCleanups(prev => ({ ...prev, [id]: !prev[id] }));
    if (spills[id]) {
      setSpills(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleReset = () => {
    setSpills({});
    setCleanups({});
  };

  // Dynamic pollution score calculation based on cascading logic
  const getSimulatedScore = (id: string) => {
    // 1. Cascading chain calculations
    if (id === "agara") {
      const added = spills["agara"] ? 35 : 0;
      const removed = cleanups["agara"] ? 12 : 0;
      return Math.max(5.0, Math.min(100.0, 20.0 + added - removed));
    }
    if (id === "bellandur") {
      const ownSpill = spills["bellandur"] ? 30 : 0;
      const ownClean = cleanups["bellandur"] ? 22 : 0;
      const upstreamSpill = spills["agara"] ? 20 : 0;
      const upstreamClean = cleanups["agara"] ? 8 : 0;
      return Math.max(5.0, Math.min(100.0, 65.0 + ownSpill + upstreamSpill - ownClean - upstreamClean));
    }
    if (id === "varthur") {
      const ownSpill = spills["varthur"] ? 25 : 0;
      const ownClean = cleanups["varthur"] ? 20 : 0;
      
      const midSpill = spills["bellandur"] ? 18 : 0;
      const midClean = cleanups["bellandur"] ? 12 : 0;
      
      const headSpill = spills["agara"] ? 12 : 0;
      const headClean = cleanups["agara"] ? 6 : 0;
      
      return Math.max(
        5.0, 
        Math.min(100.0, 75.0 + ownSpill + midSpill + headSpill - ownClean - midClean - headClean)
      );
    }

    // 2. Isolated lake calculations
    const base = ISOLATED_LAKES.find(l => l.id === id)?.baseScore ?? 30.0;
    const added = spills[id] ? 35 : 0;
    const removed = cleanups[id] ? 20 : 0;
    return Math.max(5.0, Math.min(100.0, base + added - removed));
  };

  // Find info of current active node
  const activeLake = [...CASCADING_LAKES, ...ISOLATED_LAKES].find(l => l.id === selectedLakeId)!;
  const activeScore = getSimulatedScore(selectedLakeId);
  const activeTone = scoreToTone(activeScore);
  const activeColor = toneToColor(activeTone);

  // Helper to determine connecting flow properties
  const getFlowProps = (fromId: string) => {
    const isSpillActive = spills[fromId];
    const isCleanupActive = cleanups[fromId];
    
    if (isSpillActive) {
      return { stroke: "#e2b93b", speed: "0.35s", status: "spill" };
    }
    if (isCleanupActive) {
      return { stroke: "#27ae60", speed: "1.2s", status: "clean" };
    }
    return { stroke: "#3b82f6", speed: "0.8s", status: "normal" };
  };

  const agaraFlow = getFlowProps("agara");
  const bellandurFlow = getFlowProps("bellandur");

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fadeIn">
      {/* Dynamic Keyframes Injection */}
      <style>{`
        @keyframes flowAnimation {
          to {
            stroke-dashoffset: -20;
          }
        }
        .flow-line {
          stroke-dasharray: 6, 6;
          animation: flowAnimation var(--flow-speed, 0.8s) linear infinite;
        }
      `}</style>

      <header className="border-b border-border pb-5 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-accent" />
            Hydrological Cascade Modeler
          </h1>
          <p className="text-fg-muted mt-1 text-[13.5px]">
            Bangalore's lakes are structured in natural cascading networks. Simulate spills or upgrades upstream to observe downstream propagation.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-fg text-[12.5px] font-semibold flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Baseline
        </button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Interactive SVG & Flow Graph Canvas */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden shadow-xl min-h-[480px] flex flex-col justify-between">
            <div className="flex justify-between items-center z-10">
              <span className="text-[10px] uppercase tracking-wider text-fg-muted font-mono bg-surface-2 px-2 py-0.5 rounded border border-border/40">
                Live Interactive Sandbox
              </span>
              <div className="flex gap-4 text-[11px] text-fg-muted font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-t border-dashed border-blue-500"></span> Normal Flow</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-t border-dashed border-[#e2b93b]"></span> Sewage Inflow Spill</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-t border-dashed border-[#27ae60]"></span> Treated Cleanup</span>
              </div>
            </div>

            {/* Cascading Chain Visualization */}
            <div className="relative my-auto flex flex-col md:flex-row items-center justify-around gap-12 py-10">
              
              {/* Connector Lines behind the nodes */}
              <div className="absolute inset-0 pointer-events-none hidden md:block">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Agara to Bellandur Line */}
                  <path
                    d="M 190,140 Q 320,110 440,140"
                    fill="transparent"
                    stroke={agaraFlow.stroke}
                    strokeWidth={3}
                    className="flow-line"
                    style={{ "--flow-speed": agaraFlow.speed } as React.CSSProperties}
                  />
                  {/* Bellandur to Varthur Line */}
                  <path
                    d="M 460,140 Q 590,170 710,140"
                    fill="transparent"
                    stroke={bellandurFlow.stroke}
                    strokeWidth={3}
                    className="flow-line"
                    style={{ "--flow-speed": bellandurFlow.speed } as React.CSSProperties}
                  />
                </svg>
              </div>

              {CASCADING_LAKES.map((lake, idx) => {
                const score = getSimulatedScore(lake.id);
                const tone = scoreToTone(score);
                const color = toneToColor(tone);
                const selected = selectedLakeId === lake.id;
                const activeSpill = spills[lake.id];
                const activeClean = cleanups[lake.id];

                return (
                  <button
                    key={lake.id}
                    onClick={() => setSelectedLakeId(lake.id)}
                    className={`w-[200px] p-4 rounded-2xl border text-left bg-surface-2 transition-all relative z-10 flex flex-col justify-between gap-3 shadow hover:shadow-lg hover:border-fg-muted/40 ${
                      selected 
                        ? "border-accent ring-2 ring-accent/20" 
                        : "border-border"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-semibold text-fg-muted tracking-wider uppercase font-mono">
                          {idx === 0 ? "Upstream" : idx === 1 ? "Midstream" : "Downstream"}
                        </span>
                        <div className="flex gap-1">
                          {activeSpill && <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />}
                          {activeClean && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                        </div>
                      </div>
                      <h3 className="font-semibold text-[14px] text-fg mt-2">{lake.name}</h3>
                      <p className="text-[11px] text-fg-muted mt-1 leading-normal line-clamp-2">{lake.description}</p>
                    </div>

                    <div className="border-t border-border/60 pt-2 flex justify-between items-center mt-1">
                      <span className="text-[11px] text-fg-muted">Pollution:</span>
                      <span className="font-bold font-mono text-[13.5px]" style={{ color }}>
                        {score.toFixed(1)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Connectors info for mobile stacking */}
            <div className="block md:hidden text-center text-fg-muted text-[11px] py-2">
              💧 Agara (flows into) ──&gt; Bellandur ──&gt; Varthur 💧
            </div>

            {/* Section 2: Isolated Systems (Sankey, Ulsoor, Hebbal) */}
            <div className="border-t border-border/50 pt-5 space-y-3">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-fg-muted" />
                <h4 className="text-[11.5px] uppercase tracking-wider text-fg-muted font-semibold">
                  Independent Catchment Basins (No downstream overflow)
                </h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ISOLATED_LAKES.map((lake) => {
                  const score = getSimulatedScore(lake.id);
                  const tone = scoreToTone(score);
                  const color = toneToColor(tone);
                  const selected = selectedLakeId === lake.id;
                  
                  return (
                    <button
                      key={lake.id}
                      onClick={() => setSelectedLakeId(lake.id)}
                      className={`p-3.5 rounded-xl border text-left bg-surface transition-all flex items-center justify-between gap-3 ${
                        selected 
                          ? "border-accent ring-1 ring-accent/20 bg-surface-2" 
                          : "border-border/60 hover:border-border hover:bg-surface-2/30"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className="font-semibold text-[13px] text-fg truncate">{lake.name}</h5>
                        <span className="text-[10px] text-fg-muted font-mono">Isolated System</span>
                      </div>
                      <span className="font-bold font-mono text-[12.5px] shrink-0" style={{ color }}>
                        {score.toFixed(1)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Controls & Educational Feed Sidebar */}
        <div className="space-y-6">
          {/* Node Simulator Card */}
          <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between h-fit shadow-xl">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold">Simulation Control</h3>
                <span className="text-[10px] text-fg-muted font-mono">{activeLake.name}</span>
              </div>

              {/* Big Score Widget */}
              <div className="p-4 rounded-xl bg-surface-2 border border-border/60 flex flex-col items-center gap-2">
                <span className="text-4xl font-extrabold font-mono tracking-tight" style={{ color: activeColor }}>
                  {activeScore.toFixed(1)}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-fg-muted font-medium">
                  Simulated Pollution Score
                </span>
                <div className={`mt-1 inline-flex px-2.5 py-0.5 text-[10.5px] rounded-full font-semibold border capitalize ${
                  activeTone === "low" ? "text-pill-low bg-pill-low/10 border-pill-low/20" :
                  activeTone === "moderate" ? "text-pill-mod bg-pill-mod/10 border-pill-mod/20" :
                  activeTone === "high" ? "text-pill-high bg-pill-high/10 border-pill-high/20" :
                  "text-pill-severe bg-pill-severe/10 border-pill-severe/20"
                }`}>
                  {activeTone} Quality
                </div>
              </div>

              <p className="text-fg-muted text-[12.5px] leading-normal">
                Observe the systemic cascading effect: Spilling or cleaning **Agara Lake** will automatically propagate downstream into **Bellandur** and **Varthur**. Interventions on isolated systems will not flow.
              </p>

              {/* Simulator Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleSpill(selectedLakeId)}
                  className={`w-full py-2.5 px-4 rounded-xl border font-semibold text-[13px] transition-all flex items-center justify-between ${
                    spills[selectedLakeId]
                      ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                      : "bg-surface border-border text-fg-muted hover:border-yellow-500/40 hover:text-yellow-400"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Simulate Sewage Inflow Spill
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold">
                    {spills[selectedLakeId] ? "Active" : "Trigger"}
                  </span>
                </button>

                <button
                  onClick={() => handleCleanup(selectedLakeId)}
                  className={`w-full py-2.5 px-4 rounded-xl border font-semibold text-[13px] transition-all flex items-center justify-between ${
                    cleanups[selectedLakeId]
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : "bg-surface border-border text-fg-muted hover:border-green-500/40 hover:text-green-400"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Simulate STP / Wetland Upgrade
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold">
                    {cleanups[selectedLakeId] ? "Active" : "Trigger"}
                  </span>
                </button>
              </div>
            </div>

            {/* Real-time cascade logic explanation */}
            <div className="border-t border-border/80 mt-5 pt-4">
              <h4 className="text-[12px] font-semibold text-fg flex items-center gap-1.5 mb-2">
                <Activity className="w-4 h-4 text-accent animate-pulse" />
                Catchment Cascade Propagation
              </h4>
              <div className="text-[11.5px] leading-relaxed text-fg-muted space-y-2">
                {selectedLakeId === "agara" && (
                  <p>
                    ⚠️ **Cascades Downstream:** Agara feeds Bellandur directly. A spill here triggers a **+20** pollution propagation to Bellandur and **+12** to Varthur. Cleaning Agara reduces Bellandur's score by **-8** and Varthur's by **-6**.
                  </p>
                )}
                {selectedLakeId === "bellandur" && (
                  <p>
                    ⚠️ **Cascades Downstream:** Bellandur feeds Varthur directly. A spill here propagates a **+18** pollution load to Varthur. Upstream spills from Agara also accumulate here.
                  </p>
                )}
                {selectedLakeId === "varthur" && (
                  <p>
                    📉 **Terminal Node:** Varthur is at the bottom of the cascade. It accumulates the cumulative residues from both Agara and Bellandur, explaining why its baseline pollution is historically the highest.
                  </p>
                )}
                {!CASCADING_LAKES.some(l => l.id === selectedLakeId) && (
                  <p>
                    ℹ️ **Isolated Basin:** This lake operates on an independent aquifer/catchment. Actions here do not cascade or affect other lakes on the map, demonstrating localized hydrological buffers.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
