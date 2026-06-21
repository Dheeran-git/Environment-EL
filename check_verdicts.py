import json
import pathlib
from datetime import date

events = json.loads(
    pathlib.Path("src/bangalore_lakes/data/restoration/restoration_events.json").read_text()
)["events"]
base = pathlib.Path("outputs/analytics/20260620T140454Z/lakes")

for ev in events:
    lake_id = ev["lake_id"]
    event_date = date.fromisoformat(ev["event_date"])
    data = json.loads((base / lake_id / "monthly_timeseries.json").read_text())
    scores = [
        (date.fromisoformat(r["month_start"]), r["pollution_score"])
        for r in data
        if r["pixel_count"] > 0
    ]
    pre = [s for d, s in scores if d < event_date][-6:]
    post = [s for d, s in scores if d >= event_date][:6]
    if pre and post:
        pre_avg = sum(pre) / len(pre)
        post_avg = sum(post) / len(post)
        diff = pre_avg - post_avg
        label = "improved" if diff > 5 else ("worsened" if diff < -5 else "unchanged")
        print(f"LAKE: {lake_id}  |  event: {ev['event_date']}")
        print(
            f"  pre_avg={pre_avg:.2f}  post_avg={post_avg:.2f}  diff={diff:+.2f}  verdict={label}"
        )
        print(f"  pre scores  ({len(pre)} months): {[round(s,1) for s in pre]}")
        print(f"  post scores ({len(post)} months): {[round(s,1) for s in post]}")
    else:
        print(f"LAKE: {lake_id} | INSUFFICIENT DATA (pre={len(pre)}, post={len(post)})")
    print()
