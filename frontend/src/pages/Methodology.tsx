export default function Methodology() {
  return (
    <article className="p-6 max-w-[760px] mx-auto text-[14px] leading-[1.65]">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Methodology</h1>
        <p className="text-fg-muted mt-1">
          How we turn raw Sentinel-2 scenes into monthly pollution scores, anomaly
          flags, and "did restoration work?" verdicts.
        </p>
      </header>

      <Section title="1. Data source">
        <p>
          We use the <Mono>COPERNICUS/S2_SR_HARMONIZED</Mono> image collection in
          Google Earth Engine — surface-reflectance Sentinel-2 scenes harmonized
          across the 2022 processing baseline break. Scenes are filtered to
          <Mono>CLOUDY_PIXEL_PERCENTAGE &lt; 20</Mono> (configurable) and composited
          per calendar month with a pixel-wise median. All exports are projected
          to <Mono>EPSG:32643</Mono> (UTM 43N) at a 10 m pixel scale.
        </p>
      </Section>

      <Section title="2. Spectral indices">
        <p>
          For each monthly composite, clipped to each lake polygon, we compute
          three normalized-difference indices over the four analytics bands
          (<Mono>B3</Mono> Green, <Mono>B4</Mono> Red, <Mono>B8</Mono> NIR,
          <Mono> B11</Mono> SWIR):
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><Mono>NDWI = (Green − NIR) / (Green + NIR)</Mono> — water presence</li>
          <li><Mono>NDVI = (NIR − Red) / (NIR + Red)</Mono> — vegetation/algae proxy</li>
          <li><Mono>NDTI = (SWIR − Red) / (SWIR + Red)</Mono> — turbidity proxy</li>
        </ul>
        <p className="mt-2">
          A water mask (<Mono>NDWI &gt; 0</Mono>) is applied before reducing each
          index over the polygon, so scores reflect lit water pixels only.
        </p>
      </Section>

      <Section title="3. Pollution score (0–100)">
        <p>
          Each index is linearly normalized from its theoretical <Mono>[−1, +1]</Mono> range
          to <Mono>[0, 1]</Mono>, with NDWI inverted (less water = higher pollution).
          The final score is a weighted sum, clamped to <Mono>[0, 100]</Mono>:
        </p>
        <pre className="mt-2 p-3 rounded border border-border bg-surface font-mono text-[12px] overflow-x-auto">
{`score = 100 · clamp(
    0.35 · (1 − ndwi_norm)   // less water
  + 0.25 · ndvi_norm         // more vegetation/algae
  + 0.40 · ndti_norm         // more turbidity
)`}
        </pre>
        <p className="mt-2 text-fg-muted text-[13px]">
          Weights are chosen to emphasize turbidity (sediment/effluent) while
          still penalizing eutrophic greening and surface shrinkage.
        </p>
      </Section>

      <Section title="4. Anomaly detection">
        <p>
          For each month we compute the month-over-month change in pollution
          score. If <Mono>|MoM| &gt; 20%</Mono>, that observation is flagged as an
          anomaly. Flags surface on the dashboard and as red dots on the trend
          chart so sudden spikes (e.g. untreated inflow, algal bloom) are
          visually inescapable.
        </p>
      </Section>

      <Section title='5. "Did restoration work?" verdict'>
        <p>
          When a lake has a dated restoration event on file, we compare the mean
          pollution score in the six months <em>before</em> vs six months <em>after</em> the
          event:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>post−pre ≤ −5 → <span className="text-pill-low">improved</span></li>
          <li>post−pre ≥ +5 → <span className="text-pill-severe">worsened</span></li>
          <li>otherwise → <span className="text-pill-mod">unchanged</span></li>
          <li>fewer than 3 observations on either side → <span className="text-fg-muted">insufficient data</span></li>
        </ul>
        <p className="mt-2">
          Confidence is <Mono>min(1, |post − pre| / 25)</Mono> — a 25-point swing
          registers as fully confident.
        </p>
      </Section>

      <Section title="6. Restoration data provenance">
        <p>
          Event dates and titles come from a hand-curated registry of BBMP
          and Karnataka High Court announcements covering Bellandur, Varthur,
          Hebbal, and Agara. Ulsoor and Sankey don't yet have comparable
          documented interventions, so their verdict reads "insufficient data".
          See <Mono>src/bangalore_lakes/data/restoration/restoration_events.json</Mono>.
        </p>
      </Section>

      <Section title="Caveats">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Monsoon months (Jun–Oct) can leave a lake with zero usable scenes —
            these appear as gaps in the trend line, not zeroes.
          </li>
          <li>
            The pollution score is a relative ranking, not a calibrated
            concentration. A score of 70 does not mean "70 mg/L BOD".
          </li>
          <li>
            Small lakes (Ulsoor, Sankey) have &lt; 100 pixel footprints; their
            monthly means are noisier than Bellandur's.
          </li>
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-[11px] uppercase tracking-wider text-fg-muted mb-2">
        {title}
      </h2>
      <div className="text-fg">{children}</div>
    </section>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[12.5px] px-1 py-0.5 rounded bg-surface-2 text-fg">
      {children}
    </code>
  );
}
