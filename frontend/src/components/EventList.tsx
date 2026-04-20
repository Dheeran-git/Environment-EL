import { ExternalLink, Flag } from "lucide-react";
import type { RestorationEvent } from "../lib/types";

interface Props {
  events: RestorationEvent[];
}

export default function EventList({ events }: Props) {
  if (!events.length) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-fg-muted text-[13px]">
        No restoration events recorded for this lake yet.
      </div>
    );
  }
  return (
    <ul className="rounded-lg border border-border bg-surface divide-y divide-border">
      {events.map((ev) => (
        <li key={`${ev.event_date}-${ev.title}`} className="p-3 flex items-start gap-3">
          <Flag className="w-4 h-4 mt-0.5 text-pill-severe shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[12px] text-fg-muted font-mono">
              {ev.event_date}
              {ev.confidence !== null && ev.confidence !== undefined && (
                <span>· confidence {(ev.confidence * 100).toFixed(0)}%</span>
              )}
            </div>
            <div className="text-[13px] mt-0.5 font-medium">{ev.title}</div>
            {ev.description && (
              <p className="text-[12px] text-fg-muted mt-1">{ev.description}</p>
            )}
          </div>
          {ev.source_url && (
            <a
              href={ev.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-fg-muted hover:text-accent"
              aria-label="Open source"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
