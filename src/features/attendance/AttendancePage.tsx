import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Check, Clock3, RotateCcw, Search } from "lucide-react";
import FilterSelect from "../../components/shared/FilterSelect";
import { useGymData } from "../../contexts/GymDataContext";
import type { Customer, VisitRecord } from "../../types";

type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void; onOpenCustomer?: (customerId: string) => void; beforeContent?: ReactNode; initialVisitId?: string; onInitialVisitHandled?: () => void };
const PAGE_SIZE = 25;
const badge = (value: string) => value === "Completed" || value === "Synced" ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : value === "Checked in" || value === "Pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
const dateKey = (value: string) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10); };
function parseTime(value: string) { const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i); if (!match) return null; let hour = Number(match[1]); const minute = Number(match[2]); if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12; if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0; return hour * 60 + minute; }
function durationLabel(timeIn: string, timeOut: string) { const start = parseTime(timeIn); const end = parseTime(timeOut); if (start === null || end === null || end < start) return "—"; const minutes = end - start; return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`; }

export default function AttendancePage({ isAdmin, branch: assignedBranch = "Makati Central", onAction, onOpenCustomer, beforeContent, initialVisitId, onInitialVisitHandled }: Props) {
  const { visits, customers, branches, updateVisit, addAuditLog } = useGymData();
  const [selected, setSelected] = useState<VisitRecord | null>(() => visits.find((event) => event.id === initialVisitId) ?? null); const [query, setQuery] = useState(""); const [status, setStatus] = useState("All statuses"); const [source, setSource] = useState("All sources"); const [branch, setBranch] = useState(isAdmin ? "All branches" : assignedBranch); const [fromDate, setFromDate] = useState(""); const [toDate, setToDate] = useState(""); const [page, setPage] = useState(1);
  const filtered = useMemo(() => visits.filter((event) => { const text = `${event.customer} ${event.customerId}`.toLowerCase(); const eventDate = dateKey(event.date); const sourceMatch = source === "All sources" || (source === "RFID" ? event.source.startsWith("RFID") : event.source === "Manual"); return (branch === "All branches" || event.branch === branch) && text.includes(query.toLowerCase()) && (status === "All statuses" || event.status === status) && sourceMatch && (!fromDate || eventDate >= fromDate) && (!toDate || eventDate <= toDate); }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id)), [visits, branch, query, status, source, fromDate, toDate]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE); const setFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); }; const resetFilters = () => { setQuery(""); setStatus("All statuses"); setSource("All sources"); setBranch(isAdmin ? "All branches" : assignedBranch); setFromDate(""); setToDate(""); setPage(1); };
  if (selected) return <AttendanceDetails customer={customers.find((customer) => customer.id === selected.customerId)} event={selected} onBack={() => { setSelected(null); onInitialVisitHandled?.(); }} onOpenCustomer={onOpenCustomer} onSave={(updated, action) => { updateVisit(updated.id, { timeIn: updated.timeIn, timeOut: updated.timeOut, source: updated.source, status: updated.status, reason: updated.reason }); addAuditLog({ time: `${updated.date} · ${new Date().toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" })}`, user: isAdmin ? "Admin User" : "Front Desk", role: isAdmin ? "Admin" : "Front Desk", branch: updated.branch, action, record: updated.id, summary: updated.reason ?? "Attendance record updated." }); setSelected(updated); onAction(action === "Attendance voided" ? "Attendance event voided" : "Attendance correction saved"); }} />;
  const activeRows = filtered.filter((event) => event.status !== "Voided");
  return (
    <div>
      <PageHeader branch={branch} />
      {beforeContent}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Check-ins in period" value={activeRows.length} />
        <Stat label="Currently checked in" value={activeRows.filter((event) => event.status === "Checked in").length} />
        <Stat label="Completed visits" value={activeRows.filter((event) => event.status === "Completed" && event.timeOut !== "—").length} />
        <Stat label="Manual entries" value={activeRows.filter((event) => event.source === "Manual").length} />
      </div>
      <section className="data-table-section">
        <div className="data-table-toolbar">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h3 className="font-semibold">Attendance records</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {filtered.length} result{filtered.length === 1 ? "" : "s"} · page {page} of {pageCount}
              </p>
            </div>
            <button type="button" onClick={resetFilters} className="flex items-center gap-2 self-start rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">
              <RotateCcw size={14} /> Clear filters
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="flex min-w-[210px] flex-1 items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
              <Search size={14} className="text-[var(--text-muted)]" />
              <input value={query} onChange={(event) => setFilter(setQuery, event.target.value)} placeholder="Search customer or ID" className="w-full bg-transparent text-xs outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs">
              <span className="text-[var(--text-muted)]">From</span>
              <input type="date" value={fromDate} onChange={(event) => setFilter(setFromDate, event.target.value)} />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs">
              <span className="text-[var(--text-muted)]">To</span>
              <input type="date" value={toDate} onChange={(event) => setFilter(setToDate, event.target.value)} />
            </label>
            {isAdmin && <FilterSelect value={branch} onChange={(value) => setFilter(setBranch, value)} options={["All branches", ...branches.map((item) => item.name)]} />}
            <FilterSelect value={source} onChange={(value) => setFilter(setSource, value)} options={["All sources", "RFID", "Manual"]} />
            <FilterSelect value={status} onChange={(value) => setFilter(setStatus, value)} options={["All statuses", "Checked in", "Completed", "Voided"]} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1120px]">
            <thead>
              <tr>
                {["Customer", "Date", "Branch", "Time-in", "Time-out", "Duration", "Source", "Method", "Status", "Actions"].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {pageRows.map((event) => (
                <tr key={event.id} className="hover:bg-[var(--bg)]">
                  <td>
                    <button type="button" onClick={() => onOpenCustomer?.(event.customerId)} className="text-left font-semibold text-[var(--accent)] hover:underline">
                      {event.customer}
                    </button>
                    <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">{event.customerId}</p>
                  </td>
                  <td>{event.date}</td>
                  <td className="text-[var(--text-muted)]">{event.branch}</td>
                  <td>{event.timeIn}</td>
                  <td className="text-[var(--text-muted)]">{event.timeOut}</td>
                  <td className="text-[var(--text-muted)]">{durationLabel(event.timeIn, event.timeOut)}</td>
                  <td className="text-[var(--text-muted)]">{event.source.startsWith("RFID") ? "RFID" : "Manual"}</td>
                  <td className="text-[var(--text-muted)]">{event.source.startsWith("RFID") ? event.source.replace("RFID · ", "") : "Front Desk"}</td>
                  <td><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(event.status)}`}>{event.status}</span></td>
                  <td className="text-right">
                    <button type="button" onClick={() => setSelected(event)} className="font-semibold text-[var(--accent)]">View details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pageRows.length && <p className="p-10 text-center text-sm text-[var(--text-muted)]">No attendance records match the current filters.</p>}
        </div>
        {filtered.length > 0 && (
          <div className="data-table-pagination">
            <p className="text-xs text-[var(--text-muted)]">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
              <button type="button" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function PageHeader({ branch }: { branch: string }) { return <div className="page-header"><p className="mb-1 text-sm font-medium text-[var(--accent)]">{branch}</p><h2 className="text-2xl font-bold tracking-tight">Attendance History</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Review check-ins, correct records, and maintain a traceable attendance history.</p></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="summary-card"><p className="summary-card-label">{label}</p><p className="summary-card-value">{value}</p></div>; }

function AttendanceDetails({ event, customer, onBack, onSave, onOpenCustomer }: { event: VisitRecord; customer?: Customer; onBack: () => void; onSave: (event: VisitRecord, action: string) => void; onOpenCustomer?: (customerId: string) => void }) {
  const [timeIn, setTimeIn] = useState(event.timeIn); const [timeOut, setTimeOut] = useState(event.timeOut === "—" ? "" : event.timeOut); const [reason, setReason] = useState(""); const [error, setError] = useState("");
  const submit = (voidRecord = false) => { setError(""); if (!reason.trim()) return setError(voidRecord ? "A reason is required before voiding this record." : "A reason is required for attendance corrections."); const start = parseTime(timeIn); const end = timeOut ? parseTime(timeOut) : null; if (start === null) return setError("Use a valid time-in such as 09:42 AM."); if (timeOut && (end === null || end < start)) return setError("Time-out must be later than time-in."); onSave({ ...event, timeIn, timeOut: timeOut || "—", status: voidRecord ? "Voided" : timeOut ? "Completed" : "Checked in", source: voidRecord ? "Manual" : event.source, reason }, voidRecord ? "Attendance voided" : "Attendance corrected"); };
  const recordTimeOut = () => { const now = new Date().toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" }); setTimeOut(now); setReason("Recorded by front desk at close of session."); };
  return <div className="mx-auto w-full max-w-4xl"><button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={16} /> Back to attendance</button><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-xs text-[var(--text-muted)]">{event.id}</p><button type="button" onClick={() => onOpenCustomer?.(event.customerId)} className="mt-1 text-left text-2xl font-bold hover:text-[var(--accent)]">{event.customer}</button><p className="mt-1 text-sm text-[var(--text-muted)]">{event.customerId} · {event.date} · {event.branch}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge(event.status)}`}>{event.status}</span></div><section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Info label="Phone" value={customer?.phone ?? "Not available"} /><Info label="Customer type" value={customer?.type ?? event.type} /><Info label="Source" value={event.source} /><Info label="Duration" value={durationLabel(event.timeIn, event.timeOut)} /></div><div className="mt-6 grid gap-5 border-t border-[var(--border)] pt-5 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-medium">Time-in</span><input value={timeIn} onChange={(inputEvent) => setTimeIn(inputEvent.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Time-out</span><input value={timeOut} onChange={(inputEvent) => setTimeOut(inputEvent.target.value)} placeholder="Leave blank for open session" className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label></div>{event.status === "Checked in" && <button type="button" onClick={recordTimeOut} className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"><Clock3 size={15} /> Use current time-out</button>}<div className="mt-6 border-t border-[var(--border)] pt-5"><h3 className="font-semibold">Correction and audit reason</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Corrections and voids are retained in the audit log.</p><textarea value={reason} onChange={(inputEvent) => setReason(inputEvent.target.value)} placeholder="Reason for correction or void" className="mt-3 min-h-24 w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm" />{error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => submit(false)} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)]"><Check size={15} /> Save correction</button>{event.status !== "Voided" && <button type="button" onClick={() => submit(true)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700">Void record</button>}</div></div></section></div>;
}


function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] text-[var(--text-muted)]">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
