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
  const { visits, customers, memberships, branches, updateVisit, recordManualAttendance } = useGymData();
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
  const [logging, setLogging] = useState(false);
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

  if (logging) return <ManualAttendanceForm isAdmin={isAdmin} assignedBranch={assignedBranch} customers={customers} memberships={memberships} branches={branches} onBack={() => setLogging(false)} onSave={(input) => { const result = recordManualAttendance(input); if (!result.ok) return result.error; setLogging(false); onAction("Manual attendance recorded"); return null; }} />;

  return (
    <div>
      <PageHeader branch={branch} title="Attendance" subtitle="Review attendance events and maintain a traceable correction history." onAction={() => setLogging(true)} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Check-ins in period", rows.filter((event) => event.status !== "Voided").length],
          ["Unique visitors", new Set(rows.map((event) => event.customer)).size],
          ["Currently checked in", rows.filter((event) => event.status === "Checked in").length],
          ["Manual corrections", rows.filter((event) => event.source === "Manual").length],
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
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Event ID", "Customer", "Branch", "Date", "Time-in", "Time-out", "Source", "Status", ""].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{rows.map((event) => <tr key={event.id} tabIndex={0} onClick={() => setSelected(event)} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") { keyboardEvent.preventDefault(); setSelected(event); } }} className="cursor-pointer hover:bg-[var(--bg)] focus:bg-[var(--bg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"><td className="px-5 py-4 font-medium text-[var(--text-muted)]">{event.id}</td><td className="px-5 py-4 font-semibold">{event.customer}</td><td className="px-5 py-4 text-[var(--text-muted)]">{event.branch}</td><td className="px-5 py-4 text-[var(--text-muted)]">{event.date}</td><td className="px-5 py-4">{event.in}</td><td className="px-5 py-4 text-[var(--text-muted)]">{event.out}</td><td className="px-5 py-4 text-[var(--text-muted)]">{event.source}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(event.status)}`}>{event.status}</span></td><td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}><button onClick={() => setSelected(event)} className="font-semibold text-[var(--accent)]">Details</button></td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-10 text-center text-sm text-[var(--text-muted)]">No attendance records match the current filters.</p>}</div>
      </section>
    </div>
  );
}

function PageHeader({ branch, title, subtitle, onAction }: { branch: string; title: string; subtitle: string; onAction: () => void }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-sm font-medium text-[var(--accent)]">{branch}</p><h2 className="text-2xl font-bold tracking-tight">{title}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p></div><button onClick={onAction} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]"><Plus size={16} /> Log attendance</button></div>;
}

function ManualAttendanceForm({ isAdmin, assignedBranch, customers, memberships, branches, onBack, onSave }: { isAdmin: boolean; assignedBranch: string; customers: Array<{ id: string; name: string; phone: string; branch: string; classification?: "Regular" | "Student" }>; memberships: Array<{ customerId: string; status: string; plan: string }>; branches: Array<{ name: string; status: string }>; onBack: () => void; onSave: (input: { customerId: string; branch: string; type: "Member" | "Walk-in"; date: string; timeIn: string; timeOut: string; note?: string }) => string | null }) {
  const today = new Date();
  const [customerId, setCustomerId] = useState("");
  const [type, setType] = useState<"Member" | "Walk-in">("Member");
  const [branch, setBranch] = useState(isAdmin ? "" : assignedBranch);
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [timeIn, setTimeIn] = useState(today.toTimeString().slice(0, 5));
  const [timeOut, setTimeOut] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const selected = customers.find((customer) => customer.id === customerId);
  const membership = memberships.find((item) => item.customerId === customerId && ["Active", "Pending", "Expired", "Suspended"].includes(item.status));
  const submit = () => { setError(""); if (!customerId || !selected) return setError("Select an existing customer."); if (!branch) return setError("Select a branch."); if (type === "Member" && (!membership || membership.status !== "Active")) return setError(`This customer does not have an active membership. Current status: ${membership?.status ?? "None"}.`); const result = onSave({ customerId, branch, type, date: new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" }), timeIn, timeOut: timeOut || "—", note: note.trim() || undefined }); if (result) setError(result); };
  return <div className="mx-auto max-w-3xl"><button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={16} /> Back to attendance</button><div className="mb-6"><p className="mb-1 text-sm font-medium text-[var(--accent)]">Manual entry</p><h2 className="text-2xl font-bold">Log attendance</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Attendance is recorded separately from payment and membership changes.</p></div><section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-medium">Customer</span><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"><option value="">Select existing customer</option>{customers.filter((customer) => !isAdmin ? customer.branch === assignedBranch : true).map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.id}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Attendance type</span><select value={type} onChange={(event) => setType(event.target.value as "Member" | "Walk-in")} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"><option>Member</option><option>Walk-in</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Branch</span><select value={branch} onChange={(event) => setBranch(event.target.value)} disabled={!isAdmin} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"><option value="">Select branch</option>{branches.filter((item) => item.status === "Active" && (isAdmin || item.name === assignedBranch)).map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Time-in</span><input type="time" value={timeIn} onChange={(event) => setTimeIn(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Time-out (optional)</span><input type="time" value={timeOut} onChange={(event) => setTimeOut(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label></div>{selected && <div className="mt-4 rounded-lg bg-[var(--bg)] p-3 text-xs text-[var(--text-muted)]">Category: <strong className="text-[var(--text)]">{selected.classification ?? "Not recorded"}</strong> · Membership: <strong className="text-[var(--text)]">{membership?.status ?? "None"}</strong>{membership?.plan ? ` · ${membership.plan}` : ""}</div>}<label className="mt-4 block"><span className="mb-1.5 block text-xs font-medium">Note or reason (optional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm" placeholder="Why was this attendance recorded manually?" /></label>{error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}<button onClick={submit} className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]">Save attendance</button></section></div>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }

function AttendanceDetails({ event, onBack, onSave }: { event: AttendanceEvent; onBack: () => void; onSave: (event: AttendanceEvent) => void }) {
  const [timeIn, setTimeIn] = useState(event.in);
  const [timeOut, setTimeOut] = useState(event.out);
  const [reason, setReason] = useState("");
  return <div className="mx-auto max-w-4xl"><button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={16} /> Back to attendance</button><div className="mb-6"><p className="font-mono text-xs text-[var(--text-muted)]">{event.id}</p><h2 className="mt-1 text-2xl font-bold">{event.customer}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{event.date} · {event.branch}</p></div><section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="grid gap-5 sm:grid-cols-2"><Info label="Event source" value={event.source} /><Info label="Sync state" value={event.sync} /><label className="block"><span className="mb-1.5 block text-xs font-medium">Time-in</span><input value={timeIn} onChange={(event) => setTimeIn(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Time-out</span><input value={timeOut} onChange={(event) => setTimeOut(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label></div><div className="mt-6 border-t border-[var(--border)] pt-5"><h3 className="font-semibold">Correction audit</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Jordan Davis · Oct 20, 2026 · Manual changes require a reason.</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for correction or void" className="mt-3 w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm" /><div className="mt-3 flex flex-wrap gap-2"><button disabled={!reason.trim()} onClick={() => onSave({ ...event, in: timeIn, out: timeOut, source: "Manual", status: "Completed", reason })} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40"><Check size={15} /> Save correction</button><button disabled={!reason.trim()} onClick={() => onSave({ ...event, status: "Voided", source: "Manual", reason })} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40">Void event</button></div></div></section></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] text-[var(--text-muted)]">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
