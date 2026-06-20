import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Sparkles, Layers, ImageOff, Loader2 } from "lucide-react";
import { api } from "../lib/api";

interface SatelliteImageryProps {
  lakeId: string;
}

export default function SatelliteImagery({ lakeId }: SatelliteImageryProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [currentBand, setCurrentBand] = useState<"ndwi" | "algal">("ndwi");

  // Fetch real thumbnail URLs from the backend artifacts API
  const artifactsQuery = useQuery({
    queryKey: ["lake-artifacts", lakeId],
    queryFn: () => api.getLakeArtifacts(lakeId),
    retry: false,
    staleTime: 60_000,
  });

  const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");
  const makeUrl = (path: string | null) => (path ? apiBase + path : null);

  const thumbUrl = makeUrl(artifactsQuery.data?.thumb_url ?? null);
  const ndwiUrl  = makeUrl(artifactsQuery.data?.thumb_ndwi_url ?? null);
  const ndviUrl  = makeUrl(artifactsQuery.data?.thumb_ndvi_url ?? null);

  // Overlay image: use real false-color if available, CSS-filter fallback on old runs
  const overlayUrl = currentBand === "algal" ? (ndviUrl ?? thumbUrl) : (ndwiUrl ?? thumbUrl);
  const overlayFilter = !ndwiUrl
    ? currentBand === "algal"
      ? "hue-rotate(110deg) saturate(2.2) contrast(1.2) brightness(0.9)"
      : "hue-rotate(200deg) saturate(2.5) contrast(1.3) brightness(1.05)"
    : undefined;

  const isLoading = artifactsQuery.isLoading;
  const hasImage = !!thumbUrl;

  return (
    <div className="space-y-4">
      {/* Selector Tabs */}
      <div className="flex justify-between items-center bg-surface p-2.5 rounded-xl border border-border">
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentBand("ndwi")}
            className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold flex items-center gap-1.5 transition-all ${
              currentBand === "ndwi"
                ? "bg-accent/10 border-accent text-accent shadow-md"
                : "bg-surface-2 border-border/60 text-fg-muted hover:text-fg hover:border-border"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            False-Color Water Index (NDWI)
          </button>
          <button
            onClick={() => setCurrentBand("algal")}
            className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold flex items-center gap-1.5 transition-all ${
              currentBand === "algal"
                ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-md"
                : "bg-surface-2 border-border/60 text-fg-muted hover:text-fg hover:border-border"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Algal Bloom Chlorophyll (NDVI Mode)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {artifactsQuery.data?.day2_run_id && (
            <span className="text-[10px] text-fg-muted font-mono hidden sm:inline bg-surface-2 border border-border px-2 py-0.5 rounded">
              run: {artifactsQuery.data.day2_run_id}
            </span>
          )}
          <span className="text-[11px] text-fg-muted font-mono font-medium hidden sm:inline">
            Satellite Resolution: 10m/px (ESA Sentinel-2)
          </span>
        </div>
      </div>

      {/* Main Image Area */}
      {isLoading ? (
        <div className="w-full h-[360px] rounded-2xl border border-border bg-surface-2 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-fg-muted">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="text-[12px]">Loading satellite imagery…</span>
          </div>
        </div>
      ) : !hasImage ? (
        <div className="w-full h-[360px] rounded-2xl border border-border bg-surface-2 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-fg-muted text-center px-6">
            <ImageOff className="w-10 h-10 text-fg-muted/50" />
            <p className="text-[13px] font-medium text-fg">No satellite thumbnail available</p>
            <p className="text-[12px] leading-relaxed">
              Run <code className="font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">bangalore-lakes fetch-lakes</code> to generate
              Sentinel-2 clipped imagery for this lake.
            </p>
          </div>
        </div>
      ) : (
        /* Interactive Curtain Slider Wrapper */
        <div className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-border select-none bg-surface-2 shadow-xl">

          {/* Base Layer: RGB True Color */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src={thumbUrl!}
              alt={`${lakeId} RGB True Color Satellite View`}
              className="w-full h-full object-cover object-center pointer-events-none"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute bottom-3 left-3 bg-black/70 border border-border/40 text-[11px] font-semibold font-mono px-2.5 py-1 rounded-md text-white z-10 select-none">
              True Color (RGB)
            </div>
          </div>

          {/* Top Overlay Layer: real NDWI or NDVI false-color image */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-75"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={overlayUrl!}
              alt="False Color Satellite Analysis"
              className="w-full h-full object-cover object-center pointer-events-none"
              style={{ filter: overlayFilter }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div
              className="absolute bottom-3 right-3 bg-black/70 border border-border/40 text-[11px] font-semibold font-mono px-2.5 py-1 rounded-md z-10 select-none"
              style={{ color: currentBand === "algal" ? "#2ecc71" : "#00e5ff" }}
            >
              {currentBand === "ndwi"
                ? ndwiUrl ? "NDWI False Color (B3/B8/B11)" : "NDWI Simulated"
                : ndviUrl ? "NDVI Algal Bloom (B8/B4/B3)"  : "NDVI Simulated"}
            </div>
          </div>

          {/* Drag Line Split Indicator */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white z-20 pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-border shadow-2xl flex items-center justify-center cursor-ew-resize">
              <span className="text-[10px] text-bg-default font-extrabold select-none">◀▶</span>
            </div>
          </div>

          {/* Invisible Range Input Slider */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={(e) => setSliderPosition(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
            title="Drag slider to compare band views"
          />
        </div>
      )}

      {/* Explanatory Info Card */}
      <div className="p-4 rounded-xl border border-border bg-surface flex items-start gap-3">
        <Eye className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="text-[12.5px] leading-relaxed text-fg-muted">
          {currentBand === "ndwi" ? (
            <p>
              💡 <strong>Normalized Difference Water Index (NDWI)</strong> targets bands in the Near-Infrared (NIR) and Short-Wave Infrared (SWIR) spectra. NDWI is highly sensitive to liquid water molecules, reflecting water surfaces in bright neon blue while highlighting dry urban ground in dark reds and browns.
            </p>
          ) : (
            <p>
              💡 <strong>Normalized Difference Vegetation Index (NDVI)</strong> highlights chlorophyll concentrations. In this false-color band, dense algal blooms and surface floating weeds are mapped as bright green fields, distinguishing them from the dark open water channels.
            </p>
          )}
          {hasImage && (
            <p className="mt-1.5 text-[11px] font-mono text-fg-muted/70">
              Source: Sentinel-2 composite · {artifactsQuery.data?.day2_run_id ?? "latest run"} · 10m/px · ESA Copernicus
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
