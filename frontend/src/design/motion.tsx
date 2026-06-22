// Kere — motion layer. react-bits-style effects (ShinyText, CountUp) and a
// palette-matched "caustics" Aurora background. All gated on prefers-reduced-motion.
import React from "react";
import type { CSSProperties, ReactNode } from "react";

function useStyles(id: string, css: string) {
  React.useLayoutEffect(() => {
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/* ------------------------------------------------------------- Aurora / caustics
   Soft drifting teal + marigold light, like sun on shallow water. Sits behind a
   hero; very low opacity so text stays crisp. */
const AURORA_CSS = `
.kere-aurora{position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit;}
.kere-aurora__blob{position:absolute;border-radius:50%;filter:blur(46px);opacity:0.5;mix-blend-mode:multiply;will-change:transform;}
.kere-aurora__b1{width:46%;height:150%;left:-6%;top:-28%;background:radial-gradient(circle at 50% 50%,rgba(14,124,134,0.55),transparent 62%);animation:kereDrift1 16s var(--ease-water) infinite alternate;}
.kere-aurora__b2{width:42%;height:150%;left:34%;top:-36%;background:radial-gradient(circle at 50% 50%,rgba(54,183,168,0.5),transparent 62%);animation:kereDrift2 19s var(--ease-water) infinite alternate;}
.kere-aurora__b3{width:40%;height:150%;right:-8%;top:-24%;background:radial-gradient(circle at 50% 50%,rgba(242,165,22,0.42),transparent 60%);animation:kereDrift3 22s var(--ease-water) infinite alternate;}
@keyframes kereDrift1{from{transform:translate(0,0) scale(1)}to{transform:translate(14%,8%) scale(1.12)}}
@keyframes kereDrift2{from{transform:translate(0,4%) scale(1.05)}to{transform:translate(-12%,-6%) scale(0.95)}}
@keyframes kereDrift3{from{transform:translate(0,0) scale(1)}to{transform:translate(-10%,10%) scale(1.1)}}
@media (prefers-reduced-motion: reduce){.kere-aurora__blob{animation:none !important;}}
`;
export function Aurora({ style }: { style?: CSSProperties }) {
  useStyles("kere-aurora-styles", AURORA_CSS);
  return (
    <div className="kere-aurora" style={style} aria-hidden="true">
      <div className="kere-aurora__blob kere-aurora__b1" />
      <div className="kere-aurora__blob kere-aurora__b2" />
      <div className="kere-aurora__blob kere-aurora__b3" />
    </div>
  );
}

/* ------------------------------------------------------------- ShinyText
   A slow light-sweep across text. Used on the editorial headline. */
const SHINY_CSS = `
.kere-shiny{background:linear-gradient(110deg,var(--ink) 38%,var(--primary) 46%,var(--accent-deep) 52%,var(--ink) 60%);background-size:240% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:kereShine 7.5s linear infinite;}
@keyframes kereShine{to{background-position:-240% 0;}}
@media (prefers-reduced-motion: reduce){.kere-shiny{animation:none;color:var(--ink);-webkit-text-fill-color:var(--ink);}}
`;
export function ShinyText({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  useStyles("kere-shiny-styles", SHINY_CSS);
  return <span className="kere-shiny" style={style}>{children}</span>;
}

/* ------------------------------------------------------------- CountUp
   Counts a number up from 0 on mount (eased), tabular mono figures. */
export function CountUp({
  value, decimals = 1, duration = 1100, style,
}: { value: number; decimals?: number; duration?: number; style?: CSSProperties }) {
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(value); return; }
    let raf = 0; let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span className="kere-num" style={style}>{shown.toFixed(decimals)}</span>
  );
}

/* ------------------------------------------------------------- Reveal
   Fades + lifts children into view on scroll (IntersectionObserver). */
export function Reveal({
  children, delay = 0, style,
}: { children: ReactNode; delay?: number; style?: CSSProperties }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } });
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? "none" : "translateY(16px)",
      transition: `opacity 0.6s var(--ease-water) ${delay}ms, transform 0.6s var(--ease-water) ${delay}ms`,
      ...style,
    }}>{children}</div>
  );
}
