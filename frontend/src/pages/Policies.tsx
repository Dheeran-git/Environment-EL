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
    description: "Intercept incoming raw sewage channels and treat effluents to tertiary standards before allowing inflow."
  },
  {
    id: "wetlands",
    name: "Floating Treatment Wetlands (FTWs)",
    category: "ecological",
    impact: 20,
    cost: "Low",
    description: "Install floating islands of macrophytes (canna, vetiver) to naturally absorb excess nitrogen and phosphorus."
  },
  {
    id: "aeration",
    name: "Solar-Powered Aeration Systems",
    category: "engineering",
    impact: 15,
    cost: "Medium",
    description: "Deploy mechanical aerators and fountains to raise dissolved oxygen (DO) levels, preventing fish kills."
  },
  {
    id: "desilting",
    name: "Silt Traps & Eco-Dredging",
    category: "engineering",
    impact: 15,
    cost: "High",
    description: "Construct peripheral silt traps and perform periodic wet dredging to remove toxic accumulated heavy-metal sludge."
  },
  {
    id: "zld",
    name: "Zero Liquid Discharge (ZLD) Enforcement",
    category: "policy",
    impact: 10,
    cost: "Medium",
    description: "Strictly enforce KSPCB rules requiring nearby apartment complexes and industries to reuse all treated wastewater."
  },
  {
    id: "community",
    name: "Citizen Lake Warden Committees",
    category: "policy",
    impact: 10,
    cost: "Low",
    description: "Empower local resident associations (RWA) with legal oversight, routine patrolling, and garbage cleanup drives."
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

      {/* In-depth Scientific Restoration Guide */}
      <section className="space-y-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-medium text-fg">In-Depth Lake Restoration Playbook</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-fg flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blue-400" />
              1. Engineering Solutions
            </h3>
            <div className="text-[13.5px] leading-relaxed text-fg-muted space-y-3">
              <p>
                <strong>Sewage Diversion & Inflow Management:</strong> The root cause of eutrophication in Bangalore's lakes (such as Bellandur and Varthur) is the direct inflow of untreated domestic and industrial sewage. Creating diversion channels that route dry-weather flows to centralized or decentralized Sewage Treatment Plants (STPs) is critical.
              </p>
              <p>
                <strong>Aeration Fountains:</strong> Deep lakes suffer from oxygen depletion (anoxia) at lower depths, which releases phosphates bound in sediments. Mechanical and solar aeration circulates oxygen, accelerating organic matter degradation and preventing foul odor emissions.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-semibold text-fg flex items-center gap-2">
              <Filter className="w-4 h-4 text-green-400" />
              2. Ecological Engineering (Bio-mimicry)
            </h3>
            <div className="text-[13.5px] leading-relaxed text-fg-muted space-y-3">
              <p>
                <strong>Constructed Wetlands:</strong> Using gravel beds and emergent vegetation at the mouth of the inlet acts as a natural mechanical and chemical pre-filter, stripping phosphates and heavy metals before the water enters the main lake body.
              </p>
              <p>
                <strong>Floating Treatment Wetlands (FTWs):</strong> Floating rafts populated with native wetland species (e.g. Typha, Vetiver) develop extensive underwater root systems. These root zones create biofilms of beneficial nitrifying bacteria that feed on organic nutrients directly from the water column.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-semibold text-fg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              3. Regulatory Policies
            </h3>
            <div className="text-[13.5px] leading-relaxed text-fg-muted space-y-3">
              <p>
                <strong>Zero Liquid Discharge (ZLD):</strong> Initiated by the Karnataka State Pollution Control Board (KSPCB), ZLD policies require commercial developers and residential apartment complexes of &gt;50 units to treat all wastewater and reuse it within the property (for landscaping or flushing), ensuring zero runoff into the stormwater drain network.
              </p>
              <p>
                <strong>Lake Buffer Zone Guidelines:</strong> Enforcing the National Green Tribunal (NGT) mandated buffer zones (75 meters from the lake boundary, 50 meters from primary storm drains) protects lakes from developmental encroachment and structural degradation.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-semibold text-fg flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-400" />
              4. Community & Civic Engagement
            </h3>
            <div className="text-[13.5px] leading-relaxed text-fg-muted space-y-3">
              <p>
                <strong>Community-Led Co-Management:</strong> The successful rejuvenation of lakes like Agara and Hebbal highlights the power of active citizen groups. Partnering with BBMP to execute Memorandum of Understandings (MoU) allows local resident associations to maintain walking tracks, schedule weeding drives, and protect local biodiversity.
              </p>
              <p>
                <strong>Citizen Science Initiatives:</strong> Monitoring water quality using affordable DIY chemical testing kits and submitting local observations crowdsources a continuous data stream, holding civic bodies accountable.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
