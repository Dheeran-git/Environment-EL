import sys
import json
import math
import random
from pathlib import Path
from datetime import date, timedelta

# Add src to python path to import bangalore_lakes modules
sys.path.append(str(Path(__file__).parent / "src"))

from bangalore_lakes.analytics.timeseries import LakeMonthlyObservation, write_timeseries_json, write_timeseries_csv
from bangalore_lakes.analytics.scoring import compute_pollution_score
from bangalore_lakes.lakes import load_collection
from bangalore_lakes.config import get_settings

def generate_mock_timeseries():
    settings = get_settings()
    collection = load_collection(settings.lakes_geojson)
    
    # Target directory
    run_id = "run_20260608_230000"
    run_dir = Path("outputs") / "analytics" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate monthly windows from Jan 2020 to May 2026
    start_year = 2020
    end_date = date(2026, 5, 31)
    
    windows = []
    y = start_year
    m = 1
    while True:
        start = date(y, m, 1)
        if start > end_date:
            break
        # next month
        if m == 12:
            end = date(y + 1, 1, 1) - timedelta(days=1)
            windows.append((start, end))
            y += 1
            m = 1
        else:
            end = date(y, m + 1, 1) - timedelta(days=1)
            windows.append((start, end))
            m += 1

    all_obs = []
    lake_counts = {}
    
    # Seed for reproducibility
    random.seed(42)
    
    # We define lake-specific baseline pollution score, restoration date (if any) and baseline after restoration
    lake_configs = {
        "bellandur": {
            "base_before": 88.0,
            "base_after": 72.0,
            "event_date": date(2020, 11, 15),
            "std_dev": 2.5
        },
        "varthur": {
            "base_before": 91.0,
            "base_after": 58.0,
            "event_date": date(2021, 6, 10),
            "std_dev": 3.0
        },
        "hebbal": {
            "base_before": 68.0,
            "base_after": 52.0,
            "event_date": date(2022, 2, 1),
            "std_dev": 2.0
        },
        "agara": {
            "base_before": 72.0,
            "base_after": 36.0,
            "event_date": date(2021, 12, 20),
            "std_dev": 2.2
        },
        "sankey": {
            "base_before": 24.0,
            "base_after": 24.0,
            "event_date": None,
            "std_dev": 1.5
        },
        "ulsoor": {
            "base_before": 58.0,
            "base_after": 58.0,
            "event_date": None,
            "std_dev": 2.0
        }
    }
    
    for lake in collection.lakes:
        cfg = lake_configs.get(lake.id, {
            "base_before": 50.0,
            "base_after": 50.0,
            "event_date": None,
            "std_dev": 2.0
        })
        
        lake_obs = []
        for start, end in windows:
            # Determine target score based on event date
            if cfg["event_date"] and start >= cfg["event_date"]:
                # Transition smoothly over 6 months from base_before to base_after
                months_since = (start.year - cfg["event_date"].year) * 12 + (start.month - cfg["event_date"].month)
                if months_since < 6:
                    weight = months_since / 6.0
                    target = cfg["base_before"] * (1 - weight) + cfg["base_after"] * weight
                else:
                    target = cfg["base_after"]
            else:
                target = cfg["base_before"]
            
            # Seasonal variation: higher pollution in summer (Mar-May), lower in monsoon (Jun-Sep) due to dilution
            month = start.month
            if month in (3, 4, 5): # Summer
                seasonal = 4.0
            elif month in (6, 7, 8, 9): # Monsoon
                seasonal = -6.0
            else: # Winter/Pre-summer
                seasonal = 1.0
                
            # Random noise
            noise = random.normalvariate(0, cfg["std_dev"])
            
            # Final score
            score = max(5.0, min(98.0, target + seasonal + noise))
            
            # Reverse-engineer spectral indices to yield this exact score
            # S/100 = 0.35 * inv_ndwi + 0.25 * ndvi_norm + 0.40 * ndti_norm
            # We set ndwi = 1 - 2 * (S/100), ndvi = 2 * (S/100) - 1, ndti = 2 * (S/100) - 1
            S_norm = score / 100.0
            ndwi = 1.0 - 2.0 * S_norm
            ndvi = 2.0 * S_norm - 1.0
            ndti = 2.0 * S_norm - 1.0
            
            # Occasionally omit data to simulate cloud cover / missing scenes in monsoons
            # e.g., 20% chance in monsoon months
            if month in (6, 7, 8, 9) and random.random() < 0.25:
                continue
                
            lake_obs.append(
                LakeMonthlyObservation(
                    lake_id=lake.id,
                    month_start=start,
                    month_end=end,
                    ndwi=round(ndwi, 4),
                    ndvi=round(ndvi, 4),
                    ndti=round(ndti, 4),
                    pollution_score=round(score, 2),
                    pixel_count=random.randint(5000, 15000),
                    scene_count=random.randint(2, 4)
                )
            )
            
        write_timeseries_json(run_dir / "lakes" / lake.id / "monthly_timeseries.json", lake_obs)
        all_obs.extend(lake_obs)
        lake_counts[lake.id] = len(lake_obs)
        
    csv_path = write_timeseries_csv(run_dir / "all_lakes_monthly.csv", all_obs)
    
    # Write the manifest
    manifest_path = run_dir / "timeseries_manifest.json"
    manifest_data = {
        "run_id": run_id,
        "phase": "analytics-timeseries",
        "start_year": start_year,
        "end_date": end_date.isoformat(),
        "cloud_pct_threshold": 20.0,
        "scale_m": 10,
        "lake_counts": lake_counts,
        "records_total": len(all_obs),
        "artifacts": {
            "csv": csv_path.relative_to(run_dir).as_posix(),
            "lakes_dir": "lakes/",
        },
        "gee_project_id": "mock-project",
        "gee_account": "mock-account@domain.com",
        "host": "localhost"
    }
    manifest_path.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")
    print(f"Timeseries generation complete. Manifest written to {manifest_path}")
    return run_dir

if __name__ == "__main__":
    generate_mock_timeseries()
