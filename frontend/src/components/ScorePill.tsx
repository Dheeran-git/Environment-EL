import { formatScore, scoreToTone, toneToColor } from "../lib/scoring";

interface Props {
  score: number | null | undefined;
  compact?: boolean;
}

export default function ScorePill({ score, compact = false }: Props) {
  const tone = scoreToTone(score);
  const color = toneToColor(tone);
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full font-mono tabular-nums",
        compact ? "px-1.5 py-0 text-[11px]" : "px-2 py-0.5 text-xs",
      ].join(" ")}
      style={{ background: `${color}22`, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {formatScore(score)}
    </span>
  );
}
