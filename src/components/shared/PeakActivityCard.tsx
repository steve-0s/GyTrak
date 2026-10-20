import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { allBranchAnalytics, branchAnalytics } from "../../data/mockData";

type PeakActivityCardProps = { branch?: keyof typeof branchAnalytics | "All Branches" };
type Tab = "hours" | "days" | "months";

export default function PeakActivityCard({ branch = "Makati Central" }: PeakActivityCardProps) {
  const [tab, setTab] = useState<Tab>("hours");
  const analytics = branch === "All Branches" ? allBranchAnalytics : branchAnalytics[branch];
  const data = useMemo(() => {
    if (tab === "hours") return analytics.hourly.map((item) => ({ label: item.hour, visits: item.visits }));
    if (tab === "days") return analytics.trend.map((item) => ({ label: item.day, visits: item.visits }));
    return analytics.monthly.map((item) => ({ label: item.label, visits: item.visits }));
  }, [analytics, tab]);
  const peak = data.reduce((current, item) => (item.visits > current.visits ? item : current), data[0]);
  const tabs: Array<[Tab, string]> = [["hours", "Hours"], ["days", "Days"], ["months", "Months"]];

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-semibold">Peak activity</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {tab === "hours" ? "Busiest time of day" : tab === "days" ? "Busiest day in the selected period" : "Busiest month in the current mock year"}
          </p>
        </div>
        <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1">
          {tabs.map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)} className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${tab === value ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm" : "text-[var(--text-muted)]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-lg font-bold">{peak?.label ?? "—"}</span>
        <span className="text-xs text-[var(--text-muted)]">{peak?.visits ?? 0} visits</span>
      </div>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={tab === "hours" ? 1 : 0} />
            <YAxis hide />
            <Tooltip cursor={{ fill: "var(--bg)" }} contentStyle={{ borderRadius: 8, borderColor: "var(--border)", background: "var(--surface)", fontSize: 12 }} />
            <Bar dataKey="visits" radius={[4, 4, 0, 0]}>
              {data.map((item) => <Cell key={item.label} fill="var(--accent)" fillOpacity={item.label === peak?.label ? 1 : 0.3} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
