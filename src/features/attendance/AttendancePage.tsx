import { useMemo, useState } from "react";
import { ArrowLeft, Check, Plus, Search } from "lucide-react";
import FilterSelect from "../../components/shared/FilterSelect";
import { useGymData } from "../../contexts/GymDataContext";

type AttendanceEvent = {
  id: string;
  customer: string;
  branch: string;
  date: string;
  in: string;
  out: string;
  source: "RFID · Scanner 1" | "Manual";
  status: "Checked in" | "Completed" | "Voided";
  sync: "Synced" | "Pending" | "Failed";
  reason?: string;
};

type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void };
const badge = (value: string) => value === "Completed" || value === "Synced" ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : value === "Checked in" || value === "Pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";

export default function AttendancePage({ isAdmin, branch: assignedBranch = "Makati Central", onAction }: Props) {
  const { visits, updateVisit } = useGymData();
  const events = useMemo(() => visits.map((event) => ({
    id: event.id,
    customer: event.customer,
    branch: event.branch,
    date: event.date,
    in: event.timeIn,
    out: event.timeOut,
    source: event.source,
    status: event.status,
    sync: event.sync,
    reason: "reason" in event ? event.reason : undefined,
  })), [visits]);
  const [selected, setSelected] = useState<AttendanceEvent | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [source, setSource] = useState("All sources");
  const [branch, setBranch] = useState(isAdmin ? "All branches" : assignedBranch);
  const rows = events.filter((event) =>
    (branch === "All branches" || event.branch === branch) &&
    event.customer.toLowerCase().includes(query.toLowerCase()) &&
    (status === "All statuses" || event.status === status) &&
    (source === "All sources" || event.source === source),
  );

  if (selected) {
    return <AttendanceDetails event={selected} onBack={() => setSelected(null)} onSave={(updated) => {
      updateVisit(updated.id, { timeIn: updated.in, timeOut: updated.out, source: updated.source, status: updated.status, reason: updated.reason });
      setSelected(updated);
      onAction(updated.status === "Voided" ? "Attendance event voided" : "Attendance correction saved");
    }} />;
  }

  return (
    <div>
      <PageHeader branch={branch} title="Attendance" subtitle="Review attendance events and maintain a traceable correction history." onAction={() => onAction("Manual attendance form opened")} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Check-ins in period", events.filter((event) => event.status !== "Voided").length],
          ["Unique visitors", new Set(events.map((event) => event.customer)).size],
          ["Currently checked in", events.filter((event) => event.status === "Checked in").length],
          ["Manual corrections", events.filter((event) => event.source === "Manual").length],
        ].map(([label, value]) => <div key={label}><Stat label={label as string} value={value as number} /></div>)}
      </div>
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:p-5">
          <h3 className="font-semibold">Attendance records</h3>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2"><Search size={14} className="text-[var(--text-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer" className="w-32 bg-transparent text-xs outline-none" /></label>
            {isAdmin && <FilterSelect value={branch} onChange={setBranch} options={["All branches", "Makati Central", "BGC High Street", "Cebu IT Park", "Quezon Avenue"]} />}
            <FilterSelect value={source} onChange={setSource} options={["All sources", "RFID · Scanner 1", "Manual"]} />
            <FilterSelect value={status} onChange={setStatus} options={["All statuses", "Checked in", "Completed", "Voided"]} />
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Event ID", "Customer", "Branch", "Date", "Time-in", "Time-out", "Source", "Status", ""].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{rows.map((event) => <tr key={event.id} className="hover:bg-[var(--bg)]"><td className="px-5 py-4 font-medium text-[var(--text-muted)]">{event.id}</td><td className="px-5 py-4 font-semibold">{event.customer}</td><td className="px-5 py-4 text-[var(--text-muted)]">{event.branch}</td><td className="px-5 py-4 text-[var(--text-muted)]">{event.date}</td><td className="px-5 py-4">{event.in}</td><td className="px-5 py-4 text-[var(--text-muted)]">{event.out}</td><td className="px-5 py-4 text-[var(--text-muted)]">{event.source}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(event.status)}`}>{event.status}</span></td><td className="px-5 py-4 text-right"><button onClick={() => setSelected(event)} className="font-semibold text-[var(--accent)]">Details</button></td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-10 text-center text-sm text-[var(--text-muted)]">No attendance records match the current filters.</p>}</div>
      </section>
    </div>
  );
}

function PageHeader({ branch, title, subtitle, onAction }: { branch: string; title: string; subtitle: string; onAction: () => void }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-sm font-medium text-[var(--accent)]">{branch}</p><h2 className="text-2xl font-bold tracking-tight">{title}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p></div><button onClick={onAction} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]"><Plus size={16} /> Manual correction</button></div>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }

function AttendanceDetails({ event, onBack, onSave }: { event: AttendanceEvent; onBack: () => void; onSave: (event: AttendanceEvent) => void }) {
  const [timeIn, setTimeIn] = useState(event.in);
  const [timeOut, setTimeOut] = useState(event.out);
  const [reason, setReason] = useState("");
  return <div className="mx-auto max-w-4xl"><button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={16} /> Back to attendance</button><div className="mb-6"><p className="font-mono text-xs text-[var(--text-muted)]">{event.id}</p><h2 className="mt-1 text-2xl font-bold">{event.customer}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{event.date} · {event.branch}</p></div><section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="grid gap-5 sm:grid-cols-2"><Info label="Event source" value={event.source} /><Info label="Sync state" value={event.sync} /><label className="block"><span className="mb-1.5 block text-xs font-medium">Time-in</span><input value={timeIn} onChange={(event) => setTimeIn(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Time-out</span><input value={timeOut} onChange={(event) => setTimeOut(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label></div><div className="mt-6 border-t border-[var(--border)] pt-5"><h3 className="font-semibold">Correction audit</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Jordan Davis · Oct 20, 2026 · Manual changes require a reason.</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for correction or void" className="mt-3 w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm" /><div className="mt-3 flex flex-wrap gap-2"><button disabled={!reason.trim()} onClick={() => onSave({ ...event, in: timeIn, out: timeOut, source: "Manual", status: "Completed", reason })} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40"><Check size={15} /> Save correction</button><button disabled={!reason.trim()} onClick={() => onSave({ ...event, status: "Voided", source: "Manual", reason })} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40">Void event</button></div></div></section></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] text-[var(--text-muted)]">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
