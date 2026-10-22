import { Activity, type LucideIcon } from "lucide-react";
import type { RouteMeta } from "../../app/routes";

type Props = {
  navGroups: Array<{ label: string; items: RouteMeta[] }>;
  currentPage: string;
  onNavigate: (page: string) => void;
  icons: Record<string, LucideIcon>;
};

export default function Sidebar({
  navGroups,
  currentPage,
  onNavigate,
  icons,
}: Props) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-[var(--border)] px-7">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)]">
          <Activity size={19} />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight">GyTrak</p>
          <p className="text-[11px] uppercase tracking-[.18em] text-[var(--text-muted)]">
            Operations
          </p>
        </div>
      </div>
      <div className="px-4 pt-7">
        <nav className="mt-1 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-muted)]">
                {group.label}
              </p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const Icon = icons[item.icon as keyof typeof icons];
                  const selected = currentPage === item.label;
                  return (
                    <button
                      key={item.label}
                      onClick={() => onNavigate(item.label)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${selected ? "bg-[var(--accent-subtle)] font-semibold text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
                    >
                      <Icon size={18} strokeWidth={selected ? 2.4 : 1.8} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">System status</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--accent)]">
              <i className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Online
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
            All scanners are connected and synced.
          </p>
        </div>
      </div>
    </aside>
  );
}
