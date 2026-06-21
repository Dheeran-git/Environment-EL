import json

import requests

overpass_endpoints = [
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]

overpass_query = """[out:json][timeout:60];
(
  relation["natural"="water"]["name"~"Bellandur|Varthur|Hebbal|Ulsoor|Halasuru|Sankey",i](12.80,77.45,13.15,77.80);
  way["natural"="water"]["name"~"Bellandur|Varthur|Hebbal|Ulsoor|Halasuru|Sankey",i](12.80,77.45,13.15,77.80);
  relation["water"="lake"]["name"~"Bellandur|Varthur|Hebbal|Ulsoor|Halasuru|Sankey",i](12.80,77.45,13.15,77.80);
  way["water"="lake"]["name"~"Bellandur|Varthur|Hebbal|Ulsoor|Halasuru|Sankey",i](12.80,77.45,13.15,77.80);
  way["water"="tank"]["name"~"Sankey",i](12.80,77.45,13.15,77.80);
);
out body;
>;
out skel qt;"""

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

for ep in overpass_endpoints:
    print(f"Trying endpoint: {ep} ...")
    try:
        response = requests.post(ep, data={"data": overpass_query}, headers=headers, timeout=30)
        print("Status Code:", response.status_code)
        if response.status_code == 200:
            data = response.json()
            with open("raw_overpass.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print("Successfully saved raw_overpass.json!")
            break
        else:
            print("Response:", response.text[:200])
    except Exception as e:
        print("Error on endpoint:", e)
