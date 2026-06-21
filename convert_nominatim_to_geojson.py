"""
Convert the Nominatim lake polygons into the pipeline's bangalore_lakes.geojson format.
Simplifies polygons with too many vertices while preserving shape fidelity.
"""

import json

with open("nominatim_lakes.json", encoding="utf-8") as f:
    nominatim = json.load(f)


def simplify_polygon_ring(ring, max_points=60):
    """Simplify a polygon ring by keeping every Nth point. Always keeps first/last."""
    if len(ring) <= max_points:
        return ring
    step = max(1, len(ring) // max_points)
    simplified = [ring[i] for i in range(0, len(ring), step)]
    # Ensure the ring is closed
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return simplified


def compute_centroid(coords, geom_type):
    """Compute centroid from coordinates."""
    all_points = []
    if geom_type == "Polygon":
        all_points = coords[0]  # outer ring
    elif geom_type == "MultiPolygon":
        for poly in coords:
            all_points.extend(poly[0])  # outer ring of each polygon

    if not all_points:
        return [0, 0]

    lons = [p[0] for p in all_points]
    lats = [p[1] for p in all_points]
    return [round(sum(lons) / len(lons), 4), round(sum(lats) / len(lats), 4)]


def round_coords(coords, decimals=6):
    """Round all coordinate values."""
    if isinstance(coords[0], int | float):
        return [round(c, decimals) for c in coords]
    return [round_coords(c, decimals) for c in coords]


# Lake metadata (preserved from existing file)
lake_metadata = {
    "bellandur": {
        "name": "Bellandur Lake",
        "alt_names": [],
        "ward": "Bellandur",
        "bbmp_ward_no": 150,
        "official_area_ha": 364.0,
        "known_pollution_level": "severe",
        "source": "OSM",
        "notes": "Largest lake in Bangalore. Chronic foam and fire incidents from untreated sewage discharge.",
    },
    "varthur": {
        "name": "Varthur Lake",
        "alt_names": [],
        "ward": "Varthur",
        "bbmp_ward_no": 149,
        "official_area_ha": 220.0,
        "known_pollution_level": "severe",
        "source": "OSM",
        "notes": "Downstream of Bellandur; receives overflow. Also prone to foam and fire.",
    },
    "hebbal": {
        "name": "Hebbal Lake",
        "alt_names": [],
        "ward": "Hebbal",
        "bbmp_ward_no": 21,
        "official_area_ha": 75.0,
        "known_pollution_level": "high",
        "source": "OSM",
        "notes": "Adjacent to outer ring road and airport corridor. Subject to restoration efforts.",
    },
    "ulsoor": {
        "name": "Ulsoor Lake",
        "alt_names": ["Halasuru Lake"],
        "ward": "Halasuru",
        "bbmp_ward_no": 92,
        "official_area_ha": 50.0,
        "known_pollution_level": "high",
        "source": "OSM",
        "notes": "Central Bangalore, also known locally as Halasuru Lake. Irregular boat-shaped outline.",
    },
    "sankey": {
        "name": "Sankey Tank",
        "alt_names": ["Sankey Lake"],
        "ward": "Malleswaram",
        "bbmp_ward_no": 65,
        "official_area_ha": 15.0,
        "known_pollution_level": "moderate",
        "source": "OSM",
        "notes": "Built 1882 as a water-supply tank; tagged water=tank in OSM. Relatively well-maintained.",
    },
}

features = []
lake_order = ["bellandur", "varthur", "hebbal", "ulsoor", "sankey"]

for lake_id in lake_order:
    nom = nominatim[lake_id]
    meta = lake_metadata[lake_id]
    geom = nom["geojson"]

    # Simplify geometry
    if geom["type"] == "Polygon":
        simplified_coords = [
            simplify_polygon_ring(ring, max_points=50) for ring in geom["coordinates"]
        ]
        simplified_geom = {"type": "Polygon", "coordinates": round_coords(simplified_coords)}
    elif geom["type"] == "MultiPolygon":
        # For MultiPolygon, merge into a single polygon using the largest ring
        all_rings = []
        for poly in geom["coordinates"]:
            all_rings.append(poly[0])  # outer ring of each polygon
        # Find the largest ring by approximate area
        largest = max(all_rings, key=lambda r: len(r))
        simplified = simplify_polygon_ring(largest, max_points=50)
        simplified_geom = {"type": "Polygon", "coordinates": [round_coords(simplified)]}

    centroid = compute_centroid(geom["coordinates"], geom["type"])

    feature = {
        "type": "Feature",
        "properties": {
            "id": lake_id,
            "name": meta["name"],
            "alt_names": meta["alt_names"],
            "ward": meta["ward"],
            "bbmp_ward_no": meta["bbmp_ward_no"],
            "official_area_ha": meta["official_area_ha"],
            "known_pollution_level": meta["known_pollution_level"],
            "centroid": centroid,
            "source": meta["source"],
            "osm_id": f"{nom['osm_type']}/{nom['osm_id']}",
            "last_verified": "2026-06-20",
            "notes": meta["notes"],
        },
        "geometry": simplified_geom,
    }
    features.append(feature)

    orig_type = geom["type"]
    new_npts = len(simplified_geom["coordinates"][0])
    print(
        f"  {lake_id}: {orig_type} -> Polygon with {new_npts} vertices, centroid={centroid}, osm_id={nom['osm_type']}/{nom['osm_id']}"
    )

geojson = {
    "type": "FeatureCollection",
    "metadata": {
        "generated_at": "2026-06-20",
        "source": "OSM Nominatim polygon export (see PROVENANCE.md)",
        "overpass_query_hash": None,
        "schema_version": 1,
    },
    "features": features,
}

output_path = "src/bangalore_lakes/data/lakes/bangalore_lakes.geojson"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(geojson, f, indent=2)
    f.write("\n")

print(f"\nWrote {len(features)} features to {output_path}")
