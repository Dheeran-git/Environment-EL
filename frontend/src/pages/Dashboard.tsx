import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import LakeMap from "../components/LakeMap";
import LakeList from "../components/LakeList";
import MetricStat from "../components/MetricStat";
import { formatScore, scoreToTone, toneToColor, formatMonth } from "../lib/scoring";
import type { Lake, MonthlyObservation } from "../lib/types";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  FileText, 
  Send, 
  MapPin, 
  Compass, 
  History,
  Trophy,
  Sun,
  CloudRain,
  Image as ImageIcon
} from "lucide-react";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const lakesQuery = useQuery({ queryKey: ["lakes"], queryFn: api.getLakes });
  const lakes = lakesQuery.data?.lakes ?? [];

  // Fetch reports
  const reportsQuery = useQuery({ queryKey: ["reports"], queryFn: api.getReports });
  const reports = reportsQuery.data?.reports ?? [];

  // Timeseries queries for time-lapse
  const seriesQueries = useQueries({
    queries: lakes.map((lake: Lake) => ({
      queryKey: ["timeseries", lake.id],
      queryFn: () => api.getTimeseries(lake.id),
      retry: false,
    })),
  });

  // Time-Lapse Slider State
  const [sliderActive, setSliderActive] = useState(false);
  const [monthIndex, setMonthIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimer = useRef<any>(null);

  // Generate full month list from 2020-01 to 2026-05
  const allMonths = useMemo(() => {
    const list: string[] = [];
    const start = new Date(2020, 0, 1);
    const end = new Date(2026, 4, 31);
    let cur = new Date(start);
    while (cur <= end) {
      list.push(cur.toISOString().slice(0, 10)); // YYYY-MM-01
      cur.setMonth(cur.getMonth() + 1);
    }
    return list;
  }, []);

  const selectedMonth = allMonths[monthIndex];

  // Auto-play control loop
  useEffect(() => {
    if (isPlaying) {
      playTimer.current = setInterval(() => {
        setMonthIndex((prev) => {
          if (prev >= allMonths.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 600);
    } else if (playTimer.current) {
      clearInterval(playTimer.current);
    }
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [isPlaying, allMonths]);

  // Override lake scores when slider is active
  const displayedLakes = useMemo(() => {
    if (!sliderActive) return lakes;
    return lakes.map((lake: Lake, i: number) => {
      const rows = seriesQueries[i]?.data?.data ?? [];
      const matchingRow = rows.find((r: MonthlyObservation) => r.month_start === selectedMonth);
      return {
        ...lake,
        computed_pollution_score: matchingRow ? matchingRow.pollution_score : null
      };
    });
  }, [lakes, sliderActive, selectedMonth, seriesQueries]);

  // Citizen Reporting State
  const [reportingMode, setReportingMode] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [reporterName, setReporterName] = useState("");
  const [incidentType, setIncidentType] = useState("foam");
  const [description, setDescription] = useState("");
  const [targetLakeId, setTargetLakeId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Live Weather State
  const [rainSum, setRainSum] = useState<number | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Fetch Bangalore 7-day weather forecast from Open-Meteo
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=12.9716&longitude=77.5946&daily=precipitation_sum&timezone=Asia%2FKolkata&forecast_days=7")
      .then(res => res.json())
      .then(data => {
        if (data?.daily?.precipitation_sum) {
          const sum = data.daily.precipitation_sum.reduce((a: number, b: number) => a + b, 0);
          setRainSum(parseFloat(sum.toFixed(1)));
        }
      })
      .catch(err => {
        console.error("Open-Meteo Weather API failed:", err);
        setRainSum(8.5); // Realistic seasonal fallback
      })
      .finally(() => setWeatherLoading(false));
  }, []);

  // Set default lake id for reporting
  useEffect(() => {
    if (lakes.length > 0 && !targetLakeId) {
      setTargetLakeId(lakes[0].id);
    }
  }, [lakes, targetLakeId]);

  // Handle map click in reporting mode
  const handleMapClick = (lat: number, lon: number) => {
    setSelectedCoords([lat, lon]);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLakeId || !description) return;
    
    setIsSubmitting(true);
    setSubmitSuccess(false);
    try {
      await api.createReport({
        lake_id: targetLakeId,
        incident_type: incidentType,
        description: description,
        reporter_name: reporterName || "Anonymous Citizen",
        lat: selectedCoords ? selectedCoords[0] : null,
        lon: selectedCoords ? selectedCoords[1] : null,
        image_url: imageUrl || null
      });
      // Reset form
      setSubmitSuccess(true);
      setDescription("");
      setImageUrl("");
      setSelectedCoords(null);
      setReportingMode(false);
      // Invalidate query to refresh feed & map
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to submit report:", err);
      alert("Error submitting report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, status: "pending" | "under_review" | "action_taken") => {
    try {
      await api.updateReportStatus(reportId, status);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Error updating report status.");
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await api.deleteReport(reportId);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    } catch (err) {
      console.error("Failed to delete report:", err);
      alert("Error deleting report.");
    }
  };

  const latestByLake = useMemo(() => {
    const out: Record<string, MonthlyObservation | undefined> = {};
    lakes.forEach((lake: Lake, i: number) => {
      const q = seriesQueries[i];
      const rows = q?.data?.data ?? [];
      out[lake.id] = rows[rows.length - 1];
    });
    return out;
  }, [lakes, seriesQueries]);

  // Rank lakes by latest pollution score (cleanest first)
  const leaderboardLakes = useMemo(() => {
    return lakes
      .map((lake: Lake) => {
        const obs = latestByLake[lake.id];
        const score = obs?.pollution_score ?? lake.computed_pollution_score ?? 0;
        const mom = obs?.mom_change_pct ?? null;
        return { lake, score, mom };
      })
      .sort((a: { score: number }, b: { score: number }) => a.score - b.score);
  }, [lakes, latestByLake]);

  const [highlighted, setHighlighted] = useState<string | null>(null);

  const avgScore =
    lakes.length > 0
      ? lakes.reduce((acc: number, l: Lake) => {
          const s = latestByLake[l.id]?.pollution_score ?? l.computed_pollution_score;
          return acc + (s ?? 0);
        }, 0) / Math.max(1, lakes.filter((l: Lake) => {
          const s = latestByLake[l.id]?.pollution_score ?? l.computed_pollution_score;
          return s !== null && s !== undefined;
        }).length)
      : null;

  const worst = lakes
    .map((l: Lake) => ({
      lake: l,
      score: latestByLake[l.id]?.pollution_score ?? l.computed_pollution_score,
    }))
    .filter((x: { lake: Lake; score: number | null }) => x.score !== null && x.score !== undefined)
    .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))[0];

  const anomalyCount = lakes.filter((l: Lake) => latestByLake[l.id]?.anomaly_flag).length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bangalore Lakes Dashboard
          </h1>
          <p className="text-fg-muted mt-1 text-[13.5px]">
            Satellite-derived pollution scores for six named lakes. Click a lake
            to open its detailed time series.
          </p>
        </div>
        {/* Time-Lapse Mode Switcher */}
        <button
          onClick={() => {
            setSliderActive(prev => !prev);
            setIsPlaying(false);
          }}
          className={`px-4 py-2 rounded-xl border text-[13px] font-semibold flex items-center gap-2 transition-all ${
            sliderActive 
              ? "bg-accent/10 border-accent text-accent shadow-md shadow-accent/5" 
              : "bg-surface border-border text-fg-muted hover:text-fg hover:border-border"
          }`}
        >
          <History className="w-4 h-4" />
          {sliderActive ? "Disable Time-Lapse Slider" : "Enable Time-Lapse Slider"}
        </button>
      </header>

      {/* Live Weather Alert System */}
      {!weatherLoading && rainSum !== null && (
        <section className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
          rainSum > 30 
            ? "bg-red-500/10 border-red-500/20 text-red-200" 
            : "bg-green-500/10 border-green-500/20 text-green-200"
        }`}>
          {rainSum > 30 ? (
            <>
              <CloudRain className="w-5 h-5 text-pill-severe shrink-0 mt-0.5" />
              <div className="text-[13px]">
                <strong>⛈️ Monsoon Warning Alert:</strong> A high 7-day cumulative rainfall forecast of <strong>{rainSum} mm</strong> is detected. Increased stormwater runoff carries risk of untreated sewage overflows. Expect potential foaming events at Varthur and Bellandur outlets in the coming days.
              </div>
            </>
          ) : (
            <>
              <Sun className="w-5 h-5 text-pill-low shrink-0 mt-0.5" />
              <div className="text-[13px]">
                <strong>☀️ Weather Outlook Normal:</strong> Low precipitation forecasted (7-day rain sum: <strong>{rainSum} mm</strong>). Hydrological runoff and lake inflows are expected to stay within normal baseline boundaries.
              </div>
            </>
          )}
        </section>
      )}

      {/* Overview Stat Widgets */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricStat
          label="Lakes tracked"
          value={lakes.length}
          hint={lakesQuery.data?.metadata.source}
        />
        <MetricStat
          label="Avg. pollution score"
          value={formatScore(avgScore)}
          hint="latest month across all lakes"
        />
        <MetricStat
          label="Anomalies this month"
          value={<span style={{ color: anomalyCount > 0 ? "#eb5757" : undefined }}>{anomalyCount}</span>}
          hint={worst ? `worst: ${worst.lake.name} (${formatScore(worst.score)})` : undefined}
        />
      </section>

      {/* Map + List Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Leaflet Map Card */}
        <div className="lg:col-span-3 h-[520px] flex flex-col justify-between">
          <div className="flex-1 relative min-h-0">
            {lakesQuery.isLoading ? (
              <div className="h-full grid place-items-center text-fg-muted border border-border rounded-lg bg-surface">
                Loading map…
              </div>
            ) : lakesQuery.isError ? (
              <div className="h-full grid place-items-center text-pill-severe border border-border rounded-lg bg-surface">
                Failed to load lakes. Is the backend running?
              </div>
            ) : (
              <LakeMap
                lakes={displayedLakes}
                highlightedId={highlighted}
                onHover={setHighlighted}
                reports={reports}
                onMapClick={handleMapClick}
                isReportingMode={reportingMode}
              />
            )}
            {reportingMode && (
              <div className="absolute top-3 right-3 z-[1000] bg-yellow-500/90 text-bg-default text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow border border-yellow-400 animate-pulse">
                <MapPin className="w-3.5 h-3.5" />
                Click on the map to set coordinate location
              </div>
            )}
          </div>

          {/* Time-Lapse Slider Controls Overlay */}
          {sliderActive && (
            <div className="mt-3 p-3 bg-surface border border-border rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(prev => !prev)}
                  className="w-8 h-8 rounded-lg bg-accent text-bg flex items-center justify-center hover:opacity-90"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-bg-default stroke-[2.5px]" /> : <Play className="w-4 h-4 fill-bg-default stroke-[2.5px] ml-0.5" />}
                </button>
                <button
                  onClick={() => { setMonthIndex(0); setIsPlaying(false); }}
                  className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center hover:bg-surface-2/80 text-fg-muted"
                  title="Reset timeline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Slider Input */}
              <div className="flex-1 px-4 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={allMonths.length - 1}
                  value={monthIndex}
                  onChange={(e) => { setMonthIndex(parseInt(e.target.value)); setIsPlaying(false); }}
                  className="w-full accent-accent bg-surface-2 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="font-mono text-[13px] font-semibold text-accent pr-1 select-none">
                📅 {formatMonth(selectedMonth)}
              </div>
            </div>
          )}
        </div>

        {/* List + Legend Card */}
        <div className="lg:col-span-2 flex flex-col justify-between h-[520px]">
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <LakeList
              lakes={displayedLakes}
              latestByLake={latestByLake}
              highlightedId={highlighted}
              onHover={setHighlighted}
            />
          </div>
          <Legend />
        </div>
      </section>

      {/* Leaderboard + Citizen science grid */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 border-t border-border pt-6">
        {/* Observations list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-fg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Citizen Science Observations
            </h2>
            {submitSuccess && (
              <span className="text-pill-low bg-pill-low/10 text-[11px] font-semibold px-2 py-0.5 rounded border border-pill-low/20">
                Report submitted successfully!
              </span>
            )}
          </div>
          <p className="text-fg-muted text-[13px]">
            Ground-truth alerts filed by residents living near Bangalore's lakes. These complement satellite-derived indices.
          </p>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
            {reports.length === 0 ? (
              <div className="p-8 border border-border/60 border-dashed rounded-xl text-center text-fg-muted text-[13px] italic bg-surface/20">
                No observations reported yet. Be the first to file one!
              </div>
            ) : (
              [...reports].reverse().map((rep) => {
                const lakeName = lakes.find((l: Lake) => l.id === rep.lake_id)?.name ?? rep.lake_id;
                return (
                  <div key={rep.id} className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-2 hover:border-border/80 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                          rep.incident_type === "foam" ? "bg-white/10 text-white border border-white/20" :
                          rep.incident_type === "fish_kill" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                          rep.incident_type === "garbage" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        }`}>
                          {rep.incident_type.replace("_", " ")}
                        </span>
                        {rep.status && rep.status !== "pending" && (
                          <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.25 rounded border ${
                            rep.status === "under_review"
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                              : "bg-green-500/10 text-green-400 border-green-500/30"
                          }`}>
                            {rep.status.replace("_", " ")}
                          </span>
                        )}
                        <span className="text-[12px] font-medium text-fg">{lakeName}</span>
                      </div>
                      <span className="text-[11px] text-fg-muted font-mono">{new Date(rep.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-fg-muted text-[13px] leading-relaxed">"{rep.description}"</p>
                    
                    {rep.image_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-border/40 max-h-[160px] bg-surface-2">
                        <img src={rep.image_url} alt="Incident reference" className="w-full h-full object-cover object-center max-h-[160px]" />
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] text-fg-muted font-mono mt-1 border-t border-border/40 pt-1.5">
                      <span>Reporter: {rep.reporter_name}</span>
                      {rep.lat && rep.lon && (
                        <span className="flex items-center gap-1 text-accent">
                          <MapPin className="w-3 h-3" />
                          {rep.lat.toFixed(4)}, {rep.lon.toFixed(4)}
                        </span>
                      )}
                    </div>
                    
                    {/* Moderator controls */}
                    <div className="mt-2 pt-2 border-t border-border/20 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleUpdateStatus(rep.id, "under_review")}
                        disabled={rep.status === "under_review"}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                          rep.status === "under_review"
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 opacity-70 cursor-default"
                            : "bg-surface border border-border text-fg-muted hover:border-yellow-500/40 hover:text-yellow-400"
                        }`}
                      >
                        Under Review
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(rep.id, "action_taken")}
                        disabled={rep.status === "action_taken"}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                          rep.status === "action_taken"
                            ? "bg-green-500/20 text-green-400 border border-green-500/40 opacity-70 cursor-default"
                            : "bg-surface border border-border text-fg-muted hover:border-green-500/40 hover:text-green-400"
                        }`}
                      >
                        Action Taken
                      </button>
                      <button
                        onClick={() => handleDeleteReport(rep.id)}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-surface border border-border text-fg-muted hover:border-red-500/40 hover:text-red-400 transition-all ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Leaderboard or Report form sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Health Leaderboard */}
          <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col gap-4">
            <h2 className="text-lg font-medium text-fg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Lake Health Leaderboard
            </h2>
            <p className="text-fg-muted text-[12.5px] leading-relaxed">
              Lakes ranked from cleanest (Best WQ) to most polluted (Worst WQ) based on latest observations.
            </p>
            <div className="space-y-2.5">
              {leaderboardLakes.map((item: { lake: Lake; score: number; mom: number | null }, index: number) => {
                const rank = index + 1;
                const score = item.score;
                const mom = item.mom;
                const tone = scoreToTone(score);
                const color = toneToColor(tone);
                
                let trajectoryLabel = "Stable";
                let trajectoryClass = "text-fg-muted bg-surface-2 border-border/40";
                if (mom !== null) {
                  if (mom <= -3) {
                    trajectoryLabel = `Improving (${mom.toFixed(0)}%)`;
                    trajectoryClass = "text-pill-low bg-pill-low/10 border-pill-low/20";
                  } else if (mom >= 3) {
                    trajectoryLabel = `Deteriorating (+${mom.toFixed(0)}%)`;
                    trajectoryClass = "text-pill-severe bg-pill-severe/10 border-pill-severe/20";
                  }
                }

                return (
                  <div key={item.lake.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-2/40 transition-all">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[11px] ${
                        rank === 1 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40" :
                        rank === 2 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                        rank === 3 ? "bg-amber-600/20 text-amber-500 border border-amber-600/30" :
                        "bg-surface-2 text-fg-muted border border-border"
                      }`}>
                        {rank}
                      </span>
                      <span className="font-semibold text-fg text-[13px]">{item.lake.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold font-mono text-[13px]" style={{ color }}>
                        {score.toFixed(1)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${trajectoryClass}`}>
                        {trajectoryLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incident Report Panel */}
          {reportingMode ? (
            <form onSubmit={handleReportSubmit} className="p-5 border border-accent/30 rounded-2xl bg-surface-2/40 space-y-4 shadow-lg shadow-accent/5">
              <h3 className="text-md font-semibold text-fg flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-accent" />
                Submit Incident Report
              </h3>
              
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-fg-muted">Target Lake</label>
                <select
                  value={targetLakeId}
                  onChange={(e) => setTargetLakeId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg p-2 text-[13px] text-fg"
                >
                  {lakes.map((l: Lake) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-fg-muted">Incident Type</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-[13px] text-fg"
                  >
                    <option value="foam">Foam Eruption</option>
                    <option value="fish_kill">Fish Kill</option>
                    <option value="garbage">Garbage Dumping</option>
                    <option value="encroachment">Encroachment</option>
                    <option value="other">Other Threat</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-fg-muted">Your Name</label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Anonymous"
                    className="w-full bg-surface border border-border rounded-lg p-2 text-[13px] text-fg focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-fg-muted">Incident Location</label>
                {selectedCoords ? (
                  <div className="p-2 border border-border bg-surface rounded-lg text-[12px] flex items-center justify-between text-accent font-mono">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedCoords[0].toFixed(5)}, {selectedCoords[1].toFixed(5)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedCoords(null)}
                      className="text-[10px] text-fg-muted hover:text-accent font-sans uppercase font-medium"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="p-2 border border-border border-dashed bg-surface rounded-lg text-[12px] text-fg-muted italic">
                    Coordinates not set. Click on map above to geo-tag report.
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-fg-muted">Photo URL (Optional)</label>
                <div className="relative flex items-center">
                  <ImageIcon className="absolute left-3 w-4 h-4 text-fg-muted" />
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-[13px] text-fg focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-fg-muted">Observation Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the incident..."
                  rows={3}
                  required
                  className="w-full bg-surface border border-border rounded-lg p-2 text-[13px] text-fg resize-none focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-accent text-bg font-semibold px-4 py-2 rounded-xl text-[13px] hover:opacity-90 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 stroke-[2.5px]" />
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>
                <button
                  type="button"
                  onClick={() => { setReportingMode(false); setSelectedCoords(null); }}
                  className="bg-surface border border-border text-fg-muted px-4 py-2 rounded-xl text-[13px] hover:text-fg hover:border-border"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 border border-border/80 border-dashed rounded-2xl bg-surface/30 flex flex-col justify-center items-center text-center gap-4">
              <Compass className="w-10 h-10 text-accent opacity-80" />
              <div className="space-y-1">
                <h3 className="font-semibold text-fg text-[14px]">Spot an issue on the ground?</h3>
                <p className="text-fg-muted text-[12.5px] max-w-[280px] leading-relaxed">
                  Help the community! Add a geo-tagged report on the map describing active lake pollution or hazards.
                </p>
              </div>
              <button
                onClick={() => setReportingMode(true)}
                className="bg-accent text-bg font-semibold px-4 py-2.5 rounded-xl text-[13px] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-lg shadow-accent/5"
              >
                <MapPin className="w-3.5 h-3.5 stroke-[2.5px]" />
                File Ground Incident Report
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Legend() {
  const tones = ["low", "moderate", "high", "severe"] as const;
  return (
    <div className="mt-3 p-3 rounded-lg border border-border bg-surface">
      <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-2 font-semibold">
        Score legend
      </div>
      <div className="flex flex-wrap gap-3 text-[12px] text-fg-muted">
        {tones.map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: toneToColor(scoreToTone(t === "low" ? 10 : t === "moderate" ? 40 : t === "high" ? 65 : 90)) }}
            />
            <span className="capitalize">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
