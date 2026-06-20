"""
Fetch accurate lake polygons from OSM Nominatim API for Bangalore lakes.
Uses polygon=1 and polygon_geojson=1 to get actual boundary geometries.
"""
import requests
import json
import time

lakes = [
    {"name": "Sankey Tank Bangalore", "id": "sankey"},
    {"name": "Varthur Lake Bangalore", "id": "varthur"},
    {"name": "Hebbal Lake Bangalore", "id": "hebbal"},
    {"name": "Bellandur Lake Bangalore", "id": "bellandur"},
    {"name": "Ulsoor Lake Bangalore", "id": "ulsoor"},
]

headers = {
    "User-Agent": "BangaloreLakesWaterQuality/1.0 (research project)"
}

results = {}

for lake in lakes:
    print(f"\nFetching: {lake['name']} ...")
    params = {
        "q": lake["name"],
        "format": "json",
        "polygon_geojson": 1,
        "limit": 5,
    }
    resp = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params=params,
        headers=headers,
        timeout=30,
    )
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"  Results: {len(data)}")
        for i, item in enumerate(data):
            print(f"    [{i}] {item.get('display_name', '?')[:80]}")
            print(f"        type={item.get('type')}, class={item.get('class')}, osm_type={item.get('osm_type')}, osm_id={item.get('osm_id')}")
            geojson = item.get("geojson")
            if geojson:
                print(f"        geojson type={geojson.get('type')}, coords_len={len(str(geojson.get('coordinates',[])))}")
        # Pick the first result that has a Polygon/MultiPolygon geojson
        for item in data:
            geojson = item.get("geojson")
            if geojson and geojson.get("type") in ("Polygon", "MultiPolygon"):
                results[lake["id"]] = {
                    "display_name": item.get("display_name"),
                    "osm_type": item.get("osm_type"),
                    "osm_id": item.get("osm_id"),
                    "lat": item.get("lat"),
                    "lon": item.get("lon"),
                    "geojson": geojson,
                }
                print(f"  -> Selected: {item.get('display_name', '?')[:60]}")
                break
        else:
            print(f"  WARNING: No polygon found for {lake['name']}")
    else:
        print(f"  Error: {resp.text[:200]}")
    
    # Be nice to Nominatim: 1 request per second
    time.sleep(1.5)

# Save all results
with open("nominatim_lakes.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print(f"\n\nSaved {len(results)} lake polygons to nominatim_lakes.json")
for lid, info in results.items():
    geom = info["geojson"]
    coords = geom.get("coordinates", [])
    if geom["type"] == "Polygon":
        npts = len(coords[0]) if coords else 0
    else:
        npts = sum(len(ring) for poly in coords for ring in poly)
    print(f"  {lid}: {geom['type']} with {npts} vertices, centroid=({info['lon']}, {info['lat']})")
