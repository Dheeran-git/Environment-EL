# Demo Walkthrough (90 seconds)

A tight five-beat script for recording the end-to-end demo. Each beat is
~15-20s; aim for a single unbroken screen capture at 1440×900.

## Setup (do once before recording)

```bash
# Terminal 1 — backend
make serve                           # http://127.0.0.1:8000

# Terminal 2 — frontend
make frontend-dev                    # http://localhost:5173
```

Open the browser at `http://localhost:5173`, press `F11` for full-screen, and
make sure DevTools is closed.

## Beat 1 — Dashboard (0:00 – 0:15)

Open the dashboard.

- Point to the three KPI tiles (lakes tracked, avg score, anomalies).
- Hover the map polygon for Bellandur; the matching row in the list highlights.
  Hover the row; the polygon highlights. Same component, two ways in.
- Call out the Linear-inspired UI: dark surfaces, single indigo accent, mono
  numerics.

> Narration: *"Six named Bangalore lakes, live Sentinel-2 scores, one page."*

## Beat 2 — Bellandur deep-dive (0:15 – 0:40)

Click Bellandur on the map.

- Header shows the latest score pill + anomaly badge (if this month spiked
  >20% MoM).
- Four stat tiles — latest score, MoM change, months observed, scenes this
  month.
- Scroll to the trend chart. Point at the dashed red ReferenceLine at
  2020-11 — that's the BBMP restoration event.
- Hover a red dot: tooltip shows MoM % and verdict. Call out the indigo line
  trending downward after the event.

> Narration: *"November 2020 restoration — chart shows a measurable drop in
> the following six months."*

## Beat 3 — Verdict card (0:40 – 0:55)

Scroll up to the verdict card.

- "Improved" label with an indigo confidence bar.
- Read the tooltip text: *"Compares mean pollution score in the 6 months before
  and after each restoration event."*
- Click back to the dashboard, then into **Ulsoor** — point at "Insufficient
  data". Explain: no dated intervention on file, so no verdict.

## Beat 4 — Methodology (0:55 – 1:15)

Sidebar → Methodology.

- Scroll past the three index formulas (NDWI / NDVI / NDTI).
- Point to the weighted-sum formula (0.35 / 0.25 / 0.40).
- Point to the anomaly rule (>20% MoM) and verdict heuristic (6-month
  pre/post, ±5 threshold).

> Narration: *"The score is a weighted sum of three normalized indices —
> documented, reproducible, not a black box."*

## Beat 5 — Close (1:15 – 1:30)

Back to dashboard. Hover the Varthur row.

- "Same story: two neighbouring lakes, both with documented restoration events,
  both trending in the same direction."
- End on the map, zoomed to fit all six polygons.

> Narration: *"Backend on Render, frontend on Vercel, data from Earth Engine.
> `bangalore-lakes.vercel.app`."*

## Recording checklist

- Close DevTools, hide bookmarks bar.
- Disable notifications (system + browser).
- Clear React-Query cache between takes: hard-refresh with `Cmd/Ctrl + Shift + R`.
- Record at 30 fps, 1440×900, export as MP4 (H.264) for portability.
