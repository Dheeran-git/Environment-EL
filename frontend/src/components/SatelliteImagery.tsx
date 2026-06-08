import { useState } from "react";
import { Eye, Sparkles, Layers } from "lucide-react";

export default function SatelliteImagery() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [currentBand, setCurrentBand] = useState<"ndwi" | "algal">("ndwi");

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
        
        <span className="text-[11px] text-fg-muted font-mono font-medium hidden sm:inline">
          Satellite Resolution: 10m/px (ESA Sentinel-2)
        </span>
      </div>

      {/* Interactive Curtain Slider Wrapper */}
      <div className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-border select-none bg-surface-2 shadow-xl">
        
        {/* Base Layer: RGB True Color */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src="/lake_satellite_rgb.png" 
            alt="RGB True Color Satellite View" 
            className="w-full h-full object-cover object-center pointer-events-none"
          />
          <div className="absolute bottom-3 left-3 bg-black/70 border border-border/40 text-[11px] font-semibold font-mono px-2.5 py-1 rounded-md text-white z-10 select-none">
            True Color (RGB)
          </div>
        </div>

        {/* Top Overlay Layer: NDWI or Algal (Chlorophyll) View */}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-75"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src="/lake_satellite_ndwi.png" 
            alt="False Color Satellite Analysis" 
            className="w-full h-full object-cover object-center pointer-events-none"
            style={{ 
              // Custom green-hue shift filter for Algal Bloom mock
              filter: currentBand === "algal" ? "hue-rotate(110deg) saturate(1.8) contrast(1.15)" : undefined 
            }}
          />
          <div className="absolute bottom-3 right-3 bg-black/70 border border-border/40 text-[11px] font-semibold font-mono px-2.5 py-1 rounded-md z-10 select-none"
               style={{ color: currentBand === "algal" ? "#2ecc71" : "#00e5ff" }}>
            {currentBand === "ndwi" ? "False Color (NDWI Water Index)" : "Algal Chlorophyll (NDVI Highlight)"}
          </div>
        </div>

        {/* Drag Line Split Indicator */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-white z-20 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Handle Badge */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-border shadow-2xl flex items-center justify-center cursor-ew-resize">
            <span className="text-[10px] text-bg-default font-extrabold select-none select-none">◀▶</span>
          </div>
        </div>

        {/* Invisible Range Input Slider mapping to drag events */}
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

      {/* Explanatory Info Card */}
      <div className="p-4 rounded-xl border border-border bg-surface flex items-start gap-3">
        <Eye className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="text-[12.5px] leading-relaxed text-fg-muted">
          {currentBand === "ndwi" ? (
            <p>
              💡 **Normalized Difference Water Index (NDWI)** targets bands in the Near-Infrared (NIR) and Short-Wave Infrared (SWIR) spectra. NDWI is highly sensitive to liquid water molecules, reflecting water surfaces in bright neon blue while highlighting dry urban ground in dark reds and browns.
            </p>
          ) : (
            <p>
              💡 **Normalized Difference Vegetation Index (NDVI)** highlights chlorophyll concentrations. In this false-color band, dense algal blooms and surface floating weeds are mapped as bright green fields, distinguishing them from the dark open water channels.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
