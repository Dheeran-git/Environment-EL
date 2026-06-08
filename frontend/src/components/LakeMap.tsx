import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup, useMapEvents } from "react-leaflet";
import { useEffect, useMemo } from "react";
import L, { type PathOptions } from "leaflet";
import { useNavigate } from "react-router-dom";
import type { Lake, CitizenReport } from "../lib/types";
import { scoreToTone, toneToColor } from "../lib/scoring";

interface Props {
  lakes: Lake[];
  highlightedId?: string | null;
  onHover?: (id: string | null) => void;
  reports?: CitizenReport[];
  onMapClick?: (lat: number, lon: number) => void;
  isReportingMode?: boolean;
}

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946];

function FitBounds({ lakes }: { lakes: Lake[] }) {
  const map = useMap();
  useEffect(() => {
    if (!lakes.length) return;
    const layer = L.geoJSON(
      lakes.map((l) => ({
        type: "Feature" as const,
        geometry: l.geometry,
        properties: { id: l.id },
      })),
    );
    try {
      map.fitBounds(layer.getBounds(), { padding: [24, 24] });
    } catch {
      /* ignore empty bounds */
    }
  }, [lakes, map]);
  return null;
}

function MapClickEvents({ onMapClick, enabled }: { onMapClick?: (lat: number, lon: number) => void; enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (enabled && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Generate a color-coded circular marker icon for citizen reports
const createReportIcon = (type: string) => {
  let color = "#eb5757"; // Red for general
  if (type === "foam") color = "#ffffff"; // White for foam
  else if (type === "fish_kill") color = "#ff9f43"; // Orange for dead fish
  else if (type === "garbage") color = "#ee5253"; // Red for garbage
  else if (type === "encroachment") color = "#feca57"; // Yellow for encroachment

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #0f1011; box-shadow: 0 0 6px rgba(0,0,0,0.6);"></div>`,
    className: "custom-report-icon",
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

export default function LakeMap({ lakes, highlightedId, onHover, reports = [], onMapClick, isReportingMode = false }: Props) {
  const navigate = useNavigate();

  const features = useMemo(
    () =>
      lakes.map((l) => ({
        type: "Feature" as const,
        geometry: l.geometry,
        properties: {
          id: l.id,
          name: l.name,
          score: l.computed_pollution_score,
        },
      })),
    [lakes],
  );

  return (
    <MapContainer
      center={BANGALORE_CENTER}
      zoom={11}
      className={`h-full w-full rounded-lg border border-border overflow-hidden ${isReportingMode ? "cursor-crosshair" : ""}`}
      zoomControl={true}
    >
      <TileLayer
        attribution="Tiles &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      
      {features.map((f) => {
        const color = toneToColor(scoreToTone(f.properties.score));
        const isHighlighted = highlightedId === f.properties.id;
        const style: PathOptions = {
          color: color,
          weight: isHighlighted ? 3 : 1.5,
          fillColor: color,
          fillOpacity: isHighlighted ? 0.55 : 0.35,
        };
        return (
          <GeoJSON
            key={f.properties.id + (isHighlighted ? "-hl" : "")}
            data={f}
            style={style}
            eventHandlers={{
              click: () => {
                if (!isReportingMode) {
                  navigate(`/lakes/${f.properties.id}`);
                }
              },
              mouseover: () => onHover?.(f.properties.id),
              mouseout: () => onHover?.(null),
            }}
            onEachFeature={(_feat, layer) => {
              layer.bindTooltip(
                `<div style="font-family:Inter;font-size:12px">
                   <strong>${f.properties.name}</strong><br/>
                   <span style="color:#8a8f98">score:</span>
                   <span style="font-family:JetBrains Mono;color:${color}">
                     ${f.properties.score?.toFixed(1) ?? "—"}
                   </span>
                 </div>`,
                { sticky: true, direction: "top", opacity: 0.95 },
              );
            }}
          />
        );
      })}

      {/* Render citizen reports on map */}
      {reports.map((rep) => {
        if (rep.lat !== null && rep.lon !== null) {
          return (
            <Marker 
              key={rep.id} 
              position={[rep.lat, rep.lon]} 
              icon={createReportIcon(rep.incident_type)}
            >
              <Popup>
                <div className="p-2 text-[12px] font-sans text-fg leading-normal min-w-[180px] bg-surface rounded">
                  <div className="flex justify-between items-center pb-1.5 border-b border-border">
                    <span className="font-semibold capitalize text-accent">
                      🚨 {rep.incident_type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-fg-muted italic text-[11.5px]">"{rep.description}"</p>
                  {rep.image_url && (
                    <div className="mt-2 rounded overflow-hidden max-h-[100px] border border-border/40 bg-surface-2">
                      <img src={rep.image_url} alt="Incident reference" className="w-full h-full object-cover max-h-[100px]" />
                    </div>
                  )}
                  <div className="mt-3 text-[10px] text-fg-muted font-mono flex justify-between border-t border-border/40 pt-1.5">
                    <span>By: {rep.reporter_name}</span>
                    <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        }
        return null;
      })}

      <MapClickEvents onMapClick={onMapClick} enabled={isReportingMode} />
      <FitBounds lakes={lakes} />
    </MapContainer>
  );
}
