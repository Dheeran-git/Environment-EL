// Kere Design System — component primitives, ported to TSX.
// Each component injects its own scoped CSS once and styles via design tokens.
import React from "react";
import type { CSSProperties, ReactNode } from "react";

/* inject a component's CSS once per document */
function useStyles(id: string, css: string) {
  React.useLayoutEffect(() => {
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/* ------------------------------------------------------------------ scale */
type Band = { max: number; color: string; label: string };
const SCALE: Band[] = [
  { max: 25, color: "var(--data-pristine)", label: "Pristine" },
  { max: 50, color: "var(--data-moderate)", label: "Moderate" },
  { max: 75, color: "var(--data-high)", label: "High" },
  { max: 101, color: "var(--data-severe)", label: "Severe" },
];
export function band(score: number): Band {
  return SCALE.find((b) => score < b.max) || SCALE[SCALE.length - 1];
}

/* ------------------------------------------------------------------ Button */
const BUTTON_CSS = `
.kere-btn{font-family:var(--font-ui);font-weight:var(--fw-semibold);display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:var(--radius-pill);border:1px solid transparent;cursor:pointer;white-space:nowrap;line-height:1;transition:background var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out),box-shadow var(--dur-fast) var(--ease-out);}
.kere-btn:active{transform:translateY(1px) scale(0.985);}
.kere-btn:focus-visible{outline:none;box-shadow:var(--ring);}
.kere-btn[disabled]{opacity:0.45;cursor:not-allowed;transform:none;box-shadow:none;}
.kere-btn--sm{font-size:13px;padding:8px 16px;}
.kere-btn--md{font-size:15px;padding:11px 22px;}
.kere-btn--lg{font-size:17px;padding:15px 30px;}
.kere-btn--primary{background:var(--primary);color:var(--text-on-teal);box-shadow:var(--shadow-teal);}
.kere-btn--primary:hover:not([disabled]){background:var(--primary-hover);}
.kere-btn--secondary{background:var(--surface);color:var(--primary-ink);border-color:var(--border-strong);}
.kere-btn--secondary:hover:not([disabled]){border-color:var(--primary);background:var(--primary-wash);}
.kere-btn--ghost{background:transparent;color:var(--primary-ink);}
.kere-btn--ghost:hover:not([disabled]){background:var(--primary-wash);}
.kere-btn--accent{background:var(--accent);color:var(--ink);box-shadow:var(--shadow-marigold);}
.kere-btn--accent:hover:not([disabled]){background:var(--accent-deep);}
.kere-btn__icon{display:inline-flex;align-items:center;}
`;
export function Button({
  children, variant = "primary", size = "md", icon = null, iconRight = null,
  disabled = false, type = "button", onClick, style,
}: {
  children?: ReactNode; variant?: "primary" | "secondary" | "ghost" | "accent";
  size?: "sm" | "md" | "lg"; icon?: ReactNode; iconRight?: ReactNode;
  disabled?: boolean; type?: "button" | "submit" | "reset";
  onClick?: () => void; style?: CSSProperties;
}) {
  useStyles("kere-button-styles", BUTTON_CSS);
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`kere-btn kere-btn--${variant} kere-btn--${size}`} style={style}>
      {icon && <span className="kere-btn__icon">{icon}</span>}
      {children}
      {iconRight && <span className="kere-btn__icon">{iconRight}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ IconButton */
const ICONBTN_CSS = `
.kere-iconbtn{display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-pill);border:1px solid var(--border-hairline);background:var(--surface);color:var(--primary-ink);cursor:pointer;transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out);}
.kere-iconbtn:hover:not([disabled]){background:var(--primary-wash);border-color:var(--primary);}
.kere-iconbtn:active{transform:scale(0.92);}
.kere-iconbtn:focus-visible{outline:none;box-shadow:var(--ring);}
.kere-iconbtn[disabled]{opacity:0.4;cursor:not-allowed;}
.kere-iconbtn--sm{width:32px;height:32px;}
.kere-iconbtn--md{width:40px;height:40px;}
.kere-iconbtn--lg{width:48px;height:48px;}
.kere-iconbtn--ghost{background:transparent;border-color:transparent;}
.kere-iconbtn--solid{background:var(--primary);border-color:var(--primary);color:var(--text-on-teal);}
.kere-iconbtn--solid:hover:not([disabled]){background:var(--primary-hover);border-color:var(--primary-hover);}
`;
export function IconButton({
  children, size = "md", variant = "outline", label, disabled = false, onClick, style,
}: {
  children?: ReactNode; size?: "sm" | "md" | "lg"; variant?: "outline" | "ghost" | "solid";
  label?: string; disabled?: boolean; onClick?: () => void; style?: CSSProperties;
}) {
  useStyles("kere-iconbtn-styles", ICONBTN_CSS);
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      className={`kere-iconbtn kere-iconbtn--${size} kere-iconbtn--${variant}`} style={style}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Tag */
const TAG_CSS = `
.kere-tag{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-ui);font-size:13px;font-weight:var(--fw-medium);line-height:1;padding:6px 12px;border-radius:var(--radius-pill);background:var(--surface-alt);color:var(--ink);border:1px solid var(--border-hairline);}
.kere-tag--teal{background:var(--primary-wash);color:var(--primary-ink);border-color:transparent;}
.kere-tag--marigold{background:var(--accent-wash);color:var(--ink);border-color:transparent;}
.kere-tag__dot{width:7px;height:7px;border-radius:50%;flex:none;}
`;
export function Tag({
  children, tone = "neutral", dotColor, icon, style,
}: {
  children?: ReactNode; tone?: "neutral" | "teal" | "marigold";
  dotColor?: string; icon?: ReactNode; style?: CSSProperties;
}) {
  useStyles("kere-tag-styles", TAG_CSS);
  const toneClass = tone === "teal" ? "kere-tag--teal" : tone === "marigold" ? "kere-tag--marigold" : "";
  return (
    <span className={`kere-tag ${toneClass}`} style={style}>
      {dotColor && <span className="kere-tag__dot" style={{ background: dotColor }} />}
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Badge */
type BadgeStatus = "good" | "caution" | "warning" | "critical" | "unknown";
const SHAPES: Record<BadgeStatus, { fill: string; wash: string; glyph: string; label: string }> = {
  good: { fill: "var(--data-pristine)", wash: "var(--data-pristine-wash)", glyph: "●", label: "Good" },
  caution: { fill: "var(--data-moderate)", wash: "var(--data-moderate-wash)", glyph: "◆", label: "Caution" },
  warning: { fill: "var(--data-high)", wash: "var(--data-high-wash)", glyph: "▲", label: "Warning" },
  critical: { fill: "var(--data-severe)", wash: "var(--data-severe-wash)", glyph: "■", label: "Critical" },
  unknown: { fill: "var(--data-unknown)", wash: "var(--surface-alt)", glyph: "—", label: "No data" },
};
const BADGE_CSS = `
.kere-badge{display:inline-flex;align-items:center;gap:7px;font-family:var(--font-ui);font-size:12px;font-weight:var(--fw-semibold);line-height:1;letter-spacing:0.01em;padding:6px 12px 6px 10px;border-radius:var(--radius-pill);color:var(--ink);}
.kere-badge--solid{color:#fff;}
.kere-badge__glyph{font-size:10px;line-height:1;}
`;
export function Badge({
  status = "unknown", children, solid = false, style,
}: { status?: BadgeStatus; children?: ReactNode; solid?: boolean; style?: CSSProperties }) {
  useStyles("kere-badge-styles", BADGE_CSS);
  const s = SHAPES[status] || SHAPES.unknown;
  const styleObj: CSSProperties = solid ? { background: s.fill, ...style } : { background: s.wash, ...style };
  return (
    <span className={`kere-badge ${solid ? "kere-badge--solid" : ""}`} style={styleObj}>
      <span className="kere-badge__glyph" style={{ color: solid ? "#fff" : s.fill }}>{s.glyph}</span>
      {children || s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ Card */
const CARD_CSS = `
.kere-card{background:var(--surface-card);border:1px solid var(--border-hairline);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);transition:box-shadow var(--dur-base) var(--ease-out),transform var(--dur-base) var(--ease-out),border-color var(--dur-base) var(--ease-out);}
.kere-card--pad{padding:24px;}
.kere-card--panel{background:var(--surface-panel);box-shadow:none;}
.kere-card--lg{border-radius:var(--radius-xl);}
.kere-card--interactive{cursor:pointer;}
.kere-card--interactive:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px);border-color:var(--border-strong);}
.kere-card--accent{border-top:3px solid var(--accent);}
`;
export function Card({
  children, variant = "default", padded = true, large = false, interactive = false, onClick, style,
}: {
  children?: ReactNode; variant?: "default" | "panel" | "accent"; padded?: boolean;
  large?: boolean; interactive?: boolean; onClick?: () => void; style?: CSSProperties;
}) {
  useStyles("kere-card-styles", CARD_CSS);
  const cls = [
    "kere-card", padded ? "kere-card--pad" : "", large ? "kere-card--lg" : "",
    interactive ? "kere-card--interactive" : "",
    variant === "panel" ? "kere-card--panel" : "", variant === "accent" ? "kere-card--accent" : "",
  ].join(" ");
  return <div className={cls} onClick={onClick} style={style}>{children}</div>;
}

/* ------------------------------------------------------------------ AlertBanner */
const ALERT_TONES: Record<string, { bar: string; wash: string }> = {
  info: { bar: "var(--primary)", wash: "var(--primary-wash)" },
  caution: { bar: "var(--data-moderate)", wash: "var(--data-moderate-wash)" },
  warning: { bar: "var(--data-high)", wash: "var(--data-high-wash)" },
  critical: { bar: "var(--data-severe)", wash: "var(--data-severe-wash)" },
};
const ALERT_CSS = `
.kere-alert{display:flex;align-items:flex-start;gap:14px;border-radius:var(--radius-lg);padding:16px 18px;border:1px solid var(--border-hairline);}
.kere-alert__icon{flex:none;width:38px;height:38px;border-radius:var(--radius-pill);display:flex;align-items:center;justify-content:center;color:#fff;}
.kere-alert__body{flex:1;min-width:0;font-family:var(--font-ui);}
.kere-alert__title{font-weight:var(--fw-semibold);font-size:15px;color:var(--ink);margin:0 0 2px;}
.kere-alert__msg{font-size:14px;color:var(--ink-muted);margin:0;line-height:1.45;}
.kere-alert__meta{font-family:var(--font-mono);font-size:11px;color:var(--ink-muted);margin-top:8px;letter-spacing:0.02em;}
`;
export function AlertBanner({
  tone = "info", title, message, meta, icon, style,
}: {
  tone?: "info" | "caution" | "warning" | "critical"; title?: ReactNode;
  message?: ReactNode; meta?: ReactNode; icon?: ReactNode; style?: CSSProperties;
}) {
  useStyles("kere-alert-styles", ALERT_CSS);
  const t = ALERT_TONES[tone] || ALERT_TONES.info;
  const defaultIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
  return (
    <div className="kere-alert" style={{ background: t.wash, ...style }} role="status">
      <span className="kere-alert__icon" style={{ background: t.bar }}>{icon || defaultIcon}</span>
      <div className="kere-alert__body">
        <p className="kere-alert__title">{title}</p>
        {message && <p className="kere-alert__msg">{message}</p>}
        {meta && <div className="kere-alert__meta">{meta}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ MetricStat */
const STAT_CSS = `
.kere-stat{font-family:var(--font-ui);}
.kere-stat__label{font-size:11px;font-weight:var(--fw-semibold);text-transform:uppercase;letter-spacing:var(--ls-wide);color:var(--ink-muted);margin:0 0 6px;}
.kere-stat__value{font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-weight:var(--fw-semibold);color:var(--ink);line-height:1;display:flex;align-items:baseline;gap:4px;}
.kere-stat__unit{font-size:0.5em;color:var(--ink-muted);font-weight:var(--fw-medium);}
.kere-stat__delta{display:inline-flex;align-items:center;gap:3px;font-family:var(--font-mono);font-size:12px;font-weight:var(--fw-medium);margin-top:8px;}
.kere-stat__delta svg{width:13px;height:13px;}
`;
export function MetricStat({
  label, value, unit, delta = null, deltaGoodWhenDown = true, size = 36, style,
}: {
  label: ReactNode; value: ReactNode; unit?: ReactNode; delta?: number | null;
  deltaGoodWhenDown?: boolean; size?: number; style?: CSSProperties;
}) {
  useStyles("kere-stat-styles", STAT_CSS);
  const hasDelta = delta !== null && delta !== undefined && !Number.isNaN(delta);
  const up = hasDelta && (delta as number) > 0;
  const good = hasDelta && ((deltaGoodWhenDown && (delta as number) < 0) || (!deltaGoodWhenDown && (delta as number) > 0));
  const neutral = hasDelta && delta === 0;
  const color = neutral ? "var(--ink-muted)" : good ? "var(--data-pristine)" : "var(--data-high)";
  const sign = up ? "+" : "";
  return (
    <div className="kere-stat" style={style}>
      <p className="kere-stat__label">{label}</p>
      <div className="kere-stat__value" style={{ fontSize: size }}>
        {value}{unit && <span className="kere-stat__unit">{unit}</span>}
      </div>
      {hasDelta && (
        <span className="kere-stat__delta" style={{ color }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {up ? <polyline points="17 7 7 17" /> : neutral ? <line x1="6" y1="12" x2="18" y2="12" /> : <polyline points="7 7 17 17" />}
            {!neutral && (up ? <polyline points="17 17 17 7 7 7" /> : <polyline points="7 17 17 17 17 7" />)}
          </svg>
          {sign}{Math.abs(delta as number).toFixed(1)}% MoM
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ ScoreDial */
const DIAL_CSS = `
.kere-dial{position:relative;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-display);}
.kere-dial__num{position:absolute;display:flex;flex-direction:column;align-items:center;line-height:1;}
.kere-dial__score{font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-weight:var(--fw-semibold);color:var(--ink);}
.kere-dial__cap{font-family:var(--font-ui);font-size:11px;font-weight:var(--fw-semibold);text-transform:uppercase;letter-spacing:var(--ls-wide);margin-top:4px;}
`;
export function ScoreDial({
  score = 0, size = 160, stroke = 12, animate = true, showLabel = true, style,
}: {
  score?: number; size?: number; stroke?: number; animate?: boolean; showLabel?: boolean; style?: CSSProperties;
}) {
  useStyles("kere-dial-styles", DIAL_CSS);
  const [shown, setShown] = React.useState(animate ? 0 : score);
  React.useEffect(() => {
    if (!animate) { setShown(score); return; }
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(score); return; }
    let raf = 0; let start = 0;
    const dur = 1100;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(score * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score, animate]);
  const b = band(score);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - shown / 100);
  return (
    <div className="kere-dial" style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={b.color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke 0.4s var(--ease-water)" }} />
      </svg>
      <div className="kere-dial__num">
        <span className="kere-dial__score" style={{ fontSize: size * 0.3 }}>{shown.toFixed(1)}</span>
        {showLabel && <span className="kere-dial__cap" style={{ color: b.color }}>{b.label}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ VerdictCard */
type Trend = "improved" | "worsened" | "unchanged" | "insufficient_data";
const VERDICT_SCALE = [
  { max: 25, color: "var(--data-pristine)", label: "Pristine", verdict: "Clean and clear" },
  { max: 50, color: "var(--data-moderate)", label: "Moderate", verdict: "Holding steady" },
  { max: 75, color: "var(--data-high)", label: "High", verdict: "Under stress" },
  { max: 101, color: "var(--data-severe)", label: "Severe", verdict: "Critically polluted" },
];
function verdictBand(score: number) {
  return VERDICT_SCALE.find((b) => score < b.max) || VERDICT_SCALE[VERDICT_SCALE.length - 1];
}
const TREND_MAP: Record<Trend, { color: string; label: string; glyph: string }> = {
  improved: { color: "var(--data-pristine)", label: "Improving", glyph: "↘" },
  worsened: { color: "var(--data-severe)", label: "Worsening", glyph: "↗" },
  unchanged: { color: "var(--data-moderate)", label: "Unchanged", glyph: "→" },
  insufficient_data: { color: "var(--ink-muted)", label: "Insufficient data", glyph: "·" },
};
const VERDICT_CSS = `
.kere-verdict{position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--border-hairline);border-radius:var(--radius-xl);box-shadow:var(--shadow-md);padding:32px 34px;}
.kere-verdict__eyebrow{font-family:var(--font-ui);font-size:11px;font-weight:var(--fw-semibold);text-transform:uppercase;letter-spacing:var(--ls-wide);color:var(--ink-muted);margin:0 0 10px;}
.kere-verdict__headline{font-family:var(--font-display);font-optical-sizing:auto;font-weight:var(--fw-semibold);letter-spacing:var(--ls-tight);line-height:var(--lh-tight);color:var(--ink);margin:0 0 18px;text-wrap:pretty;}
.kere-verdict__row{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;}
.kere-verdict__score{font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-weight:var(--fw-semibold);line-height:0.9;}
.kere-verdict__score small{font-size:0.36em;color:var(--ink-muted);font-weight:var(--fw-medium);}
.kere-verdict__meta{display:flex;flex-direction:column;gap:10px;align-items:flex-end;}
.kere-verdict__trend{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-ui);font-size:14px;font-weight:var(--fw-semibold);padding:6px 12px;border-radius:var(--radius-pill);}
.kere-verdict__bar{position:absolute;left:0;top:0;height:4px;width:100%;}
`;
export function VerdictCard({
  lakeName, score = 0, headline, trend = "unchanged", asOf,
  headlineSize = 44, scoreSize = 64, style,
}: {
  lakeName: string; score?: number; headline?: string; trend?: Trend;
  asOf?: string; headlineSize?: number; scoreSize?: number; style?: CSSProperties;
}) {
  useStyles("kere-verdict-styles", VERDICT_CSS);
  const b = verdictBand(score);
  const t = TREND_MAP[trend] || TREND_MAP.unchanged;
  const text = headline || `${lakeName} is ${b.verdict.toLowerCase()}.`;
  return (
    <div className="kere-verdict kere-bathymetry" style={style}>
      <div className="kere-verdict__bar" style={{ background: b.color }} />
      <p className="kere-verdict__eyebrow">State of {lakeName} · Latest verdict</p>
      <h2 className="kere-verdict__headline" style={{ fontSize: headlineSize }}>{text}</h2>
      <div className="kere-verdict__row">
        <div className="kere-verdict__score" style={{ fontSize: scoreSize, color: b.color }}>
          {score.toFixed(1)}<small> / 100 · {b.label}</small>
        </div>
        <div className="kere-verdict__meta">
          <span className="kere-verdict__trend" style={{ color: t.color, background: "var(--surface-alt)" }}>
            <span aria-hidden="true">{t.glyph}</span> {t.label}
          </span>
          {asOf && <span className="kere-num" style={{ fontSize: 12, color: "var(--ink-muted)" }}>AS OF {asOf}</span>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ LakeCard */
const LAKECARD_CSS = `
.kere-lakecard{position:relative;display:block;width:100%;text-align:left;border:none;cursor:pointer;background:var(--surface);border:1px solid var(--border-hairline);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);padding:0;overflow:hidden;transition:box-shadow var(--dur-base) var(--ease-water),transform var(--dur-base) var(--ease-water),border-color var(--dur-base) var(--ease-water);}
.kere-lakecard:hover{box-shadow:var(--shadow-lg);transform:translateY(-3px);border-color:var(--border-strong);}
.kere-lakecard:focus-visible{outline:none;box-shadow:var(--ring);}
.kere-lakecard__media{position:relative;height:96px;background:var(--surface-alt);overflow:hidden;}
.kere-lakecard__media img{width:100%;height:100%;object-fit:cover;display:block;}
.kere-lakecard__chip{position:absolute;top:12px;right:12px;}
.kere-lakecard__body{padding:16px 18px 18px;}
.kere-lakecard__name{font-family:var(--font-display);font-optical-sizing:auto;font-weight:var(--fw-semibold);font-size:24px;letter-spacing:var(--ls-tight);color:var(--ink);margin:0;line-height:1.05;}
.kere-lakecard__ward{font-family:var(--font-ui);font-size:13px;color:var(--ink-muted);margin:2px 0 14px;}
.kere-lakecard__foot{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;}
.kere-lakecard__score{font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-weight:var(--fw-semibold);font-size:30px;line-height:1;}
.kere-lakecard__score small{font-size:0.42em;color:var(--ink-muted);font-weight:var(--fw-medium);}
.kere-lakecard__delta{font-family:var(--font-mono);font-size:12px;font-weight:var(--fw-medium);}
.kere-lakecard__glyph{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;vertical-align:middle;}
`;
export function LakeCard({
  name, ward, score = 0, delta = null, image, onClick, style,
}: {
  name: string; ward?: string; score?: number; delta?: number | null;
  image?: string | null; onClick?: () => void; style?: CSSProperties;
}) {
  useStyles("kere-lakecard-styles", LAKECARD_CSS);
  const b = band(score);
  const hasDelta = delta !== null && delta !== undefined && !Number.isNaN(delta);
  const good = hasDelta && (delta as number) < 0;
  const dColor = !hasDelta ? "var(--ink-muted)" : good ? "var(--data-pristine)" : "var(--data-high)";
  return (
    <button type="button" className="kere-lakecard" onClick={onClick} style={style}>
      <div className="kere-lakecard__media" style={{ background: image ? undefined : `linear-gradient(135deg, ${b.color} 0%, var(--primary) 120%)` }}>
        {image && <img src={image} alt="" />}
        <span className="kere-lakecard__chip" style={{ background: "rgba(255,255,255,0.92)", borderRadius: "var(--radius-pill)", padding: "5px 11px", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: b.color, display: "inline-flex", alignItems: "center" }}>
          <span className="kere-lakecard__glyph" style={{ background: b.color }} />{b.label}
        </span>
      </div>
      <div className="kere-lakecard__body">
        <h3 className="kere-lakecard__name">{name}</h3>
        {ward && <p className="kere-lakecard__ward">{ward}</p>}
        <div className="kere-lakecard__foot">
          <div className="kere-lakecard__score" style={{ color: b.color }}>{score.toFixed(1)}<small> /100</small></div>
          {hasDelta && (
            <span className="kere-lakecard__delta" style={{ color: dColor }}>
              {(delta as number) > 0 ? "▲" : (delta as number) < 0 ? "▼" : "—"} {Math.abs(delta as number).toFixed(1)}% MoM
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ LeaderboardRow */
const ROW_CSS = `
.kere-row{display:grid;grid-template-columns:36px 1fr 120px auto;align-items:center;gap:16px;width:100%;text-align:left;border:none;background:none;cursor:pointer;padding:14px 12px;border-radius:var(--radius-md);transition:background var(--dur-fast) var(--ease-out);font-family:var(--font-ui);}
.kere-row:hover{background:var(--surface-alt);}
.kere-row:focus-visible{outline:none;box-shadow:var(--ring);}
.kere-row__rank{font-family:var(--font-mono);font-size:15px;font-weight:var(--fw-semibold);color:var(--ink-muted);text-align:center;}
.kere-row__name{font-family:var(--font-display);font-optical-sizing:auto;font-weight:var(--fw-semibold);font-size:19px;letter-spacing:var(--ls-tight);color:var(--ink);line-height:1.1;}
.kere-row__ward{font-size:12px;color:var(--ink-muted);margin-top:1px;}
.kere-row__track{height:8px;border-radius:var(--radius-pill);background:var(--hairline);overflow:hidden;}
.kere-row__fill{height:100%;border-radius:var(--radius-pill);transition:width var(--dur-slow) var(--ease-water);}
.kere-row__score{font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-weight:var(--fw-semibold);font-size:18px;min-width:54px;text-align:right;}
.kere-row__glyph{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;}
`;
export function LeaderboardRow({
  rank, name, ward, score = 0, onClick, style,
}: { rank: number; name: string; ward?: string; score?: number; onClick?: () => void; style?: CSSProperties }) {
  useStyles("kere-row-styles", ROW_CSS);
  const b = band(score);
  return (
    <button type="button" className="kere-row" onClick={onClick} style={style}>
      <span className="kere-row__rank">{String(rank).padStart(2, "0")}</span>
      <span>
        <div className="kere-row__name"><span className="kere-row__glyph" style={{ background: b.color }} />{name}</div>
        {ward && <div className="kere-row__ward">{ward}</div>}
      </span>
      <span className="kere-row__track" aria-hidden="true">
        <span className="kere-row__fill" style={{ width: `${score}%`, background: b.color }} />
      </span>
      <span className="kere-row__score" style={{ color: b.color }}>{score.toFixed(1)}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ IncidentItem */
const INCIDENT_STATUS: Record<string, { label: string; color: string; wash: string }> = {
  pending: { label: "Pending", color: "var(--data-moderate)", wash: "var(--data-moderate-wash)" },
  under_review: { label: "Under review", color: "var(--primary-ink)", wash: "var(--primary-wash)" },
  action_taken: { label: "Action taken", color: "var(--data-pristine)", wash: "var(--data-pristine-wash)" },
};
const INCIDENT_CSS = `
.kere-incident{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--border-hairline);font-family:var(--font-ui);}
.kere-incident:last-child{border-bottom:none;}
.kere-incident__icon{flex:none;width:40px;height:40px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;background:var(--surface-alt);color:var(--primary-ink);}
.kere-incident__main{flex:1;min-width:0;}
.kere-incident__top{display:flex;align-items:center;gap:10px;justify-content:space-between;}
.kere-incident__type{font-weight:var(--fw-semibold);font-size:15px;color:var(--ink);}
.kere-incident__status{font-size:11px;font-weight:var(--fw-semibold);text-transform:uppercase;letter-spacing:0.04em;padding:4px 10px;border-radius:var(--radius-pill);white-space:nowrap;}
.kere-incident__desc{font-size:14px;color:var(--ink);margin:6px 0 0;line-height:1.45;}
.kere-incident__meta{font-family:var(--font-mono);font-size:11.5px;color:var(--ink-muted);margin-top:8px;letter-spacing:0.02em;display:flex;gap:10px;flex-wrap:wrap;}
`;
export function IncidentItem({
  type, description, reporter, when, status = "pending", coords, style,
}: {
  type: string; description?: string; reporter?: string; when?: string;
  status?: string; coords?: string; style?: CSSProperties;
}) {
  useStyles("kere-incident-styles", INCIDENT_CSS);
  const s = INCIDENT_STATUS[status] || INCIDENT_STATUS.pending;
  const defaultIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
  return (
    <div className="kere-incident" style={style}>
      <span className="kere-incident__icon">{defaultIcon}</span>
      <div className="kere-incident__main">
        <div className="kere-incident__top">
          <span className="kere-incident__type">{type}</span>
          <span className="kere-incident__status" style={{ color: s.color, background: s.wash }}>{s.label}</span>
        </div>
        {description && <p className="kere-incident__desc">{description}</p>}
        <div className="kere-incident__meta">
          {reporter && <span>BY {reporter}</span>}
          {when && <span>· {when}</span>}
          {coords && <span>· {coords}</span>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ TrendChart */
export type TrendPoint = { month: string; score: number; anomaly?: boolean };
export type TrendEvent = { month: string; title: string };
const TREND_CSS = `
.kere-trend{font-family:var(--font-ui);width:100%;}
.kere-trend__svg{display:block;width:100%;overflow:visible;}
.kere-trend__line{fill:none;stroke:var(--primary);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round;}
.kere-trend__area{fill:url(#kereTrendFill);opacity:0.5;}
.kere-trend__grid{stroke:var(--hairline);stroke-width:1;}
.kere-trend__axis{font-family:var(--font-mono);font-size:10px;fill:var(--ink-muted);}
.kere-trend__event{stroke:var(--accent);stroke-width:1.5;stroke-dasharray:3 3;}
.kere-trend__evtdot{fill:var(--accent);}
.kere-trend__anom{fill:var(--data-high);stroke:#fff;stroke-width:1.5;}
.kere-trend__legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:12px;color:var(--ink-muted);}
.kere-trend__legend span{display:inline-flex;align-items:center;gap:6px;}
.kere-trend__sw{width:14px;height:0;border-top-width:2px;border-top-style:solid;display:inline-block;}
@keyframes kereDraw{to{stroke-dashoffset:0;}}
`;
export function TrendChart({
  data = [], events = [], height = 200, animate = true, showLegend = true, style,
}: {
  data?: TrendPoint[]; events?: TrendEvent[]; height?: number;
  animate?: boolean; showLegend?: boolean; style?: CSSProperties;
}) {
  useStyles("kere-trend-styles", TREND_CSS);
  const W = 640, H = height, padL = 34, padR = 14, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const scores = data.map((d) => d.score);
  const min = Math.max(0, Math.min(...scores, 0));
  const max = Math.min(100, Math.max(...scores, 100));
  const xAt = (i: number) => padL + (data.length <= 1 ? 0 : (i / (data.length - 1)) * iw);
  const yAt = (v: number) => padT + ih - ((v - min) / (max - min || 1)) * ih;
  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(d.score).toFixed(1)}`).join(" ");
  const areaPath = data.length ? `${linePath} L${xAt(data.length - 1).toFixed(1)} ${(padT + ih).toFixed(1)} L${xAt(0).toFixed(1)} ${(padT + ih).toFixed(1)} Z` : "";
  const monthIndex = (m: string) => data.findIndex((d) => d.month === m);
  const gridLines = [0, 25, 50, 75, 100].filter((v) => v >= min && v <= max);
  return (
    <div className="kere-trend" style={style}>
      <svg className="kere-trend__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly pollution-score trend">
        <defs>
          <linearGradient id="kereTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((v) => (
          <g key={v}>
            <line className="kere-trend__grid" x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} />
            <text className="kere-trend__axis" x={padL - 6} y={yAt(v) + 3} textAnchor="end">{v}</text>
          </g>
        ))}
        {events.map((e, i) => {
          const idx = monthIndex(e.month); if (idx < 0) return null;
          const x = xAt(idx);
          return (<g key={i}><line className="kere-trend__event" x1={x} y1={padT} x2={x} y2={padT + ih} /><circle className="kere-trend__evtdot" cx={x} cy={padT} r={3.5} /></g>);
        })}
        {areaPath && <path className="kere-trend__area" d={areaPath} />}
        {linePath && (
          <path className="kere-trend__line" d={linePath}
            style={animate ? { strokeDasharray: 2000, strokeDashoffset: 2000, animation: "kereDraw 1.4s var(--ease-water) forwards" } : undefined} />
        )}
        {data.map((d, i) => d.anomaly ? <circle key={i} className="kere-trend__anom" cx={xAt(i)} cy={yAt(d.score)} r={4.5} /> : null)}
        {data.map((d, i) => (i % Math.ceil(data.length / 6 || 1) === 0) ? (
          <text key={`l${i}`} className="kere-trend__axis" x={xAt(i)} y={H - 8} textAnchor="middle">{(d.month || "").slice(2)}</text>
        ) : null)}
      </svg>
      {showLegend && (
        <div className="kere-trend__legend">
          <span><i className="kere-trend__sw" style={{ borderColor: "var(--primary)" }} /> Pollution score</span>
          <span><i className="kere-trend__sw" style={{ borderColor: "var(--accent)", borderTopStyle: "dashed" }} /> Restoration event</span>
          <span><i style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--data-high)", display: "inline-block" }} /> Anomaly (&gt;20% MoM)</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ BandToggle */
const BAND_CSS = `
.kere-bandtoggle{display:inline-flex;gap:4px;padding:4px;background:var(--surface-alt);border:1px solid var(--border-hairline);border-radius:var(--radius-pill);font-family:var(--font-ui);}
.kere-bandtoggle__btn{display:inline-flex;flex-direction:column;align-items:center;gap:1px;border:none;background:none;cursor:pointer;padding:8px 18px;border-radius:var(--radius-pill);color:var(--ink-muted);transition:background var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out);}
.kere-bandtoggle__btn:hover{color:var(--ink);}
.kere-bandtoggle__btn:focus-visible{outline:none;box-shadow:var(--ring);}
.kere-bandtoggle__btn[data-active="true"]{background:var(--surface);color:var(--primary-ink);box-shadow:var(--shadow-xs);}
.kere-bandtoggle__lbl{font-family:var(--font-mono);font-size:13px;font-weight:var(--fw-semibold);letter-spacing:0.02em;}
.kere-bandtoggle__hint{font-size:10px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.8;}
`;
export type BandDef = { id: string; label: string; hint?: string };
const DEFAULT_BANDS: BandDef[] = [
  { id: "rgb", label: "RGB", hint: "True colour" },
  { id: "ndwi", label: "NDWI", hint: "Water" },
  { id: "ndvi", label: "NDVI", hint: "Vegetation" },
];
export function BandToggle({
  bands = DEFAULT_BANDS, value, onChange, style,
}: { bands?: BandDef[]; value?: string; onChange?: (id: string) => void; style?: CSSProperties }) {
  useStyles("kere-bandtoggle-styles", BAND_CSS);
  const active = value || bands[0]?.id;
  return (
    <div className="kere-bandtoggle" role="tablist" style={style}>
      {bands.map((b) => (
        <button key={b.id} type="button" role="tab" aria-selected={active === b.id}
          data-active={active === b.id} className="kere-bandtoggle__btn"
          onClick={() => onChange && onChange(b.id)}>
          <span className="kere-bandtoggle__lbl">{b.label}</span>
          {b.hint && <span className="kere-bandtoggle__hint">{b.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Input */
const INPUT_CSS = `
.kere-field{display:flex;flex-direction:column;gap:6px;font-family:var(--font-ui);}
.kere-field__label{font-size:13px;font-weight:var(--fw-semibold);color:var(--ink);}
.kere-input{font-family:var(--font-ui);font-size:15px;color:var(--ink);background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius-md);padding:11px 14px;width:100%;transition:border-color var(--dur-fast) var(--ease-out),box-shadow var(--dur-fast) var(--ease-out);}
.kere-input::placeholder{color:var(--ink-muted);opacity:0.7;}
.kere-input:hover{border-color:var(--primary);}
.kere-input:focus{outline:none;border-color:var(--primary);box-shadow:var(--ring);}
`;
export function Input({
  label, value, placeholder, onChange, style,
}: {
  label?: string; value?: string; placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; style?: CSSProperties;
}) {
  useStyles("kere-input-styles", INPUT_CSS);
  const fieldId = React.useId();
  return (
    <div className="kere-field" style={style}>
      {label && <label className="kere-field__label" htmlFor={fieldId}>{label}</label>}
      <input id={fieldId} className="kere-input" value={value} placeholder={placeholder} onChange={onChange} />
    </div>
  );
}

/* ------------------------------------------------------------------ Select */
const SELECT_CSS = `
.kere-select-wrap{position:relative;display:flex;flex-direction:column;gap:6px;font-family:var(--font-ui);}
.kere-select-label{font-size:13px;font-weight:var(--fw-semibold);color:var(--ink);}
.kere-select-box{position:relative;}
.kere-select{appearance:none;font-family:var(--font-ui);font-size:15px;color:var(--ink);background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius-md);padding:11px 40px 11px 14px;width:100%;cursor:pointer;transition:border-color var(--dur-fast) var(--ease-out),box-shadow var(--dur-fast) var(--ease-out);}
.kere-select:hover{border-color:var(--primary);}
.kere-select:focus{outline:none;border-color:var(--primary);box-shadow:var(--ring);}
.kere-select-chevron{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ink-muted);display:flex;}
`;
export function Select({
  label, options, value, onChange, style,
}: {
  label?: string; options: { value: string; label: string }[]; value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; style?: CSSProperties;
}) {
  useStyles("kere-select-styles", SELECT_CSS);
  const fieldId = React.useId();
  return (
    <div className="kere-select-wrap" style={style}>
      {label && <label className="kere-select-label" htmlFor={fieldId}>{label}</label>}
      <div className="kere-select-box">
        <select id={fieldId} className="kere-select" value={value} onChange={onChange}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="kere-select-chevron">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </div>
    </div>
  );
}
