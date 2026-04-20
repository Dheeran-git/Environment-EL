import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Waves, LayoutDashboard, BookOpen, Activity } from "lucide-react";
import { api } from "../lib/api";

export default function Sidebar() {
  const health = useQuery({ queryKey: ["health"], queryFn: api.getHealth });
  const lakes = useQuery({ queryKey: ["lakes"], queryFn: api.getLakes });

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-2 px-2 py-1.5 rounded text-[13px] transition-colors",
      isActive
        ? "bg-surface-2 text-fg"
        : "text-fg-muted hover:text-fg hover:bg-surface-2/60",
    ].join(" ");

  return (
    <aside className="w-[240px] shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
        <Waves className="w-4 h-4 text-accent" />
        <span className="font-semibold tracking-tight">Bangalore Lakes</span>
      </div>

      <nav className="p-2 flex flex-col gap-0.5">
        <NavLink to="/" end className={navItemClass}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </NavLink>
        <NavLink to="/methodology" className={navItemClass}>
          <BookOpen className="w-4 h-4" />
          Methodology
        </NavLink>
      </nav>

      <div className="px-3 pt-4 pb-1 text-[11px] uppercase tracking-wider text-fg-muted">
        Lakes
      </div>
      <nav className="px-2 flex flex-col gap-0.5 overflow-y-auto scrollbar-thin">
        {lakes.data?.lakes.map((lake) => (
          <NavLink
            key={lake.id}
            to={`/lakes/${lake.id}`}
            className={navItemClass}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="truncate">{lake.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-3 border-t border-border text-[11px] text-fg-muted font-mono">
        {health.data ? (
          <div className="flex justify-between">
            <span>v{health.data.version}</span>
            <span>{health.data.lake_count} lakes</span>
          </div>
        ) : (
          <span>loading…</span>
        )}
      </div>
    </aside>
  );
}
