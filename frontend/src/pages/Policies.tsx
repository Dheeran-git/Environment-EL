import { useState } from "react";
import { 
  Droplet, 
  Filter, 
  Compass, 
  ShieldCheck, 
  Users, 
  Leaf, 
  CheckCircle2
} from "lucide-react";

export interface PolicyAction {
  id: string;
  name: string;
  category: "engineering" | "ecological" | "policy";
  impact: number;
  cost: "Low" | "Medium" | "High";
  description: string;
}

export const POLICIES: PolicyAction[] = [
  {
    id: "stp",
    name: "Decentralized Sewage Treatment (STPs)",
    category: "engineering",
    impact: 35,
    cost: "High",
    description: "Simple terms: Building mini water-treatment plants directly where raw sewer water enters the lake. Instead of letting smelly sewage flow straight into the lake, it is caught, cleaned up, and only clean water is released."
  },
  {
    id: "wetlands",
    name: "Floating Treatment Wetlands (FTWs)",
    category: "ecological",
    impact: 20,
    cost: "Low",
    description: "Simple terms: Artificial floating islands made of plants. The roots of these plants hang down into the water like a giant sponge, naturally absorbing pollutants (like nitrogen and phosphorus from sewage) and cleaning the lake."
  },
  {
    id: "aeration",
    name: "Solar-Powered Aeration Systems",
    category: "engineering",
    impact: 15,
    cost: "Medium",
    description: "Simple terms: Big solar-powered bubbles or fountains in the middle of the lake. They stir the water and pump oxygen into it. This keeps the water fresh, prevents bad smells, and stops fish from suffocating."
  },
  {
    id: "desilting",
    name: "Silt Traps & Eco-Dredging",
    category: "engineering",
    impact: 15,
    cost: "High",
    description: "Simple terms: Vacuuming up the thick, toxic mud and sand (silt) from the bottom of the lake, and building small barriers (traps) at the inlets to catch dirt before it enters. This makes the lake deeper and cleaner."
  },
  {
    id: "zld",
    name: "Zero Liquid Discharge (ZLD) Enforcement",
    category: "policy",
    impact: 10,
    cost: "Medium",
    description: "Simple terms: A rule forcing nearby apartment buildings and factories to treat and reuse 100% of their wastewater inside their own properties (for gardening, toilets, etc.). They are legally blocked from dumping any wastewater outside."
  },
  {
    id: "community",
    name: "Citizen Lake Warden Committees",
    category: "policy",
    impact: 10,
    cost: "Low",
    description: "Simple terms: Handing control over to local volunteers and community groups. Neighbors patrol the lake boundaries, report polluters, clean up plastic trash, and make sure the lake is looked after."
  }
];

export default function Policies() {
  const [selectedActions, setSelectedActions] = useState<string[]>(["community"]);

  const toggleAction = (id: string) => {
    setSelectedActions(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Compute simulated lake health
  const startHealth = 25; // Base polluted lake health
  const totalImpact = selectedActions.reduce((acc, actionId) => {
    const action = POLICIES.find(p => p.id === actionId);
    return acc + (action?.impact ?? 0);
  }, 0);
  const currentHealth = Math.min(100, startHealth + totalImpact);

  // Health label and styling
  let healthLabel = "Severely Polluted";
  let healthColor = "text-pill-severe bg-pill-severe/10 border-pill-severe/20";
  let barColor = "bg-pill-severe";

  if (currentHealth >= 80) {
    healthLabel = "Healthy Ecosystem";
    healthColor = "text-pill-low bg-pill-low/10 border-pill-low/20";
    barColor = "bg-pill-low";
  } else if (currentHealth >= 55) {
    healthLabel = "Moderately Restored";
    healthColor = "text-pill-mod bg-pill-mod/10 border-pill-mod/20";
    barColor = "bg-pill-mod";
  } else if (currentHealth >= 40) {
    healthLabel = "Slightly Improved";
    healthColor = "text-pill-high bg-pill-high/10 border-pill-high/20";
    barColor = "bg-pill-high";
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-8 animate-fadeIn">
      <header className="border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">
          Restoration Methods & Policies
        </h1>
        <p className="text-fg-muted mt-2 text-[15px] max-w-2xl">
          Restoring Bangalore's hyperlocal lake network requires combining civil engineering interventions, 
          ecological bio-mimicry, and strong regulatory policy frameworks.
        </p>
      </header>

      {/* Interactive Restoration Sandbox */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-medium text-fg">Restoration Impact Sandbox</h2>
          </div>
          <p className="text-fg-muted text-[13.5px]">
            Simulate a lake restoration plan. Toggle active methods and policies below to see how they cumulative build towards a <strong>Healthy Ecosystem</strong> (target &gt; 80 points).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {POLICIES.map((p) => {
              const active = selectedActions.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleAction(p.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    active 
                      ? "bg-surface-2 border-accent/60 shadow-lg shadow-accent/5 ring-1 ring-accent/30" 
                      : "bg-surface border-border hover:border-fg-muted/40 hover:bg-surface-2/40"
                  }`}
                >
                  <div className="w-full">
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        p.category === "engineering" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        p.category === "ecological" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                        "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      }`}>
                        {p.category}
                      </span>
                      <span className="text-[11px] text-fg-muted font-mono">Cost: {p.cost}</span>
                    </div>
                    <h3 className="font-medium text-[14px] mt-2.5 text-fg">{p.name}</h3>
                    <p className="text-fg-muted text-[12px] mt-1 leading-normal">{p.description}</p>
                  </div>
                  <div className="flex items-center justify-between w-full pt-2 border-t border-border/60">
                    <span className="text-[11px] font-mono text-accent">+{p.impact} Impact Points</span>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                      active ? "bg-accent border-accent text-bg" : "border-border"
                    }`}>
                      {active && <CheckCircle2 className="w-3 h-3 text-bg-default stroke-[3px]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dashboard Indicator Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between h-fit lg:sticky lg:top-6 self-start shadow-xl shadow-bg-default/50">
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold">Simulated Lake Scorecard</h3>
            <div className="space-y-1">
              <span className="text-4xl font-extrabold font-mono tracking-tight text-fg">{currentHealth}</span>
              <span className="text-fg-muted text-[14px]"> / 100</span>
            </div>
            
            <div className={`inline-flex px-3 py-1 text-[12px] rounded-full border font-medium ${healthColor}`}>
              {healthLabel}
            </div>

            <div className="space-y-2 pt-2">
              <div className="w-full bg-surface-2 rounded-full h-2.5 overflow-hidden border border-border/40">
                <div 
                  className={`h-full transition-all duration-500 ease-out ${barColor}`} 
                  style={{ width: `${currentHealth}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-fg-muted font-mono">
                <span>Base: {startHealth}</span>
                <span>Target: 80+</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-6 pt-4 space-y-3">
            <h4 className="text-[12px] font-medium text-fg">Active Restorations ({selectedActions.length})</h4>
            {selectedActions.length === 0 ? (
              <p className="text-fg-muted text-[12px] italic">No active measures. The lake continues to eutrophy.</p>
            ) : (
              <ul className="text-[12px] text-fg-muted space-y-1.5 list-disc pl-4">
                {selectedActions.map(id => {
                  const act = POLICIES.find(p => p.id === id);
                  return <li key={id}>{act?.name}</li>;
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
