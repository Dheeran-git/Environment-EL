import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";
import L, { type PathOptions } from "leaflet";
import { useNavigate } from "react-router-dom";
import type { Lake } from "../lib/types";
import { scoreToTone, toneToColor } from "../lib/scoring";

interface Props {
  lakes: Lake[];
  highlightedId?: string | null;
  onHover?: (id: string | null) => void;
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

export default function LakeMap({ lakes, highlightedId, onHover }: Props) {
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
      className="h-full w-full rounded-lg border border-border overflow-hidden"
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
              click: () => navigate(`/lakes/${f.properties.id}`),
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
      <FitBounds lakes={lakes} />
    </MapContainer>
  );
}
