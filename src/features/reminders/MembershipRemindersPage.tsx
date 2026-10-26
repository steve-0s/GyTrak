import { useMemo, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import Modal from "../../components/shared/Modal";
import CustomerCombobox from "../../components/shared/CustomerCombobox";
import { useGymData } from "../../contexts/GymDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { daysUntil, renderTemplate, reminderStage } from "../../lib/reminders";
import type { Membership, ReminderChannel, ReminderRecord, ReminderStage } from "../../types";

type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void };
const stages: Array<[string, ReminderStage | "all"]> = [["All reminders", "all"], ["Upcoming", "7 days before"], ["Due today", "Due today"], ["Overdue", "1 day overdue"], ["3 days overdue", "3 days overdue"], ["Missing contact", "all"], ["Skipped / failed", "all"]];
const badge = (value: string) => value === "Simulated" ? "bg-blue-50 text-blue-700" : value === "Skipped" || value === "Failed" ? "bg-red-50 text-red-700" : value === "Due today" ? "bg-amber-50 text-amber-700" : "bg-[var(--accent-subtle)] text-[var(--accent)]";

export default function MembershipRemindersPage({ isAdmin, branch: assignedBranch = "Makati Central", onAction }: Props) {
  const { role, account } = useAuth();
  const { customers, memberships, payments, branches, reminderRecords, reminderSettings, addReminder } = useGymData();
  const [query, setQuery] = useState(""); const [customerId, setCustomerId] = useState(""); const [filter, setFilter] = useState("All reminders"); const [branch, setBranch] = useState(isAdmin ? "All branches" : assignedBranch); const [selected, setSelected] = useState<Membership | null>(null); const [showHistory, setShowHistory] = useState(false);
  const scoped = memberships.filter((m) => branch === "All branches" || m.branch === branch);
  const rows = useMemo(() => scoped.filter((m) => { const c = customers.find((x) => x.id === m.customerId); const days = daysUntil(m.end); const stage = days === null ? null : reminderStage(days); const missing = !c?.email && !c?.phone; const matchFilter = filter === "All reminders" || (filter === "Upcoming" && days !== null && days > 0 && days <= 7) || (filter === "Due today" && days === 0) || (filter === "Overdue" && days !== null && days < 0) || (filter === "Missing contact" && missing) || (filter === "Skipped / failed" && reminderRecords.some((r) => r.membershipId === m.id && (r.status === "Skipped" || r.status === "Failed"))) || (filter === "Paid" && m.payment === "Paid") || (filter === "Unpaid" && m.payment === "Pending"); return matchFilter && (!customerId || m.customerId === customerId) && `${m.plan} ${m.branch}`.toLowerCase().includes(query.toLowerCase()); }), [scoped, customers, filter, query, customerId, reminderRecords]);
  const metrics = { upcoming: scoped.filter((m) => { const d = daysUntil(m.end); return d !== null && d > 0 && d <= 7; }).length, due: scoped.filter((m) => daysUntil(m.end) === 0).length, overdue: scoped.filter((m) => { const d = daysUntil(m.end); return d !== null && d < 0; }).length, manual: reminderRecords.filter((r) => r.source === "manual").length, automatic: reminderRecords.filter((r) => r.source === "simulated automatic").length, skipped: reminderRecords.filter((r) => r.status === "Skipped" || r.status === "Failed").length, missing: scoped.filter((m) => { const c = customers.find((x) => x.id === m.customerId); return !c?.email && !c?.phone; }).length };
  const eligible = (m: Membership) => { const d = daysUntil(m.end); return d !== null && Boolean(reminderStage(d)); };
  return <div>
    <div className="page-header page-header--actions"><div><p className="mb-1 text-sm font-medium text-[var(--accent)]">{branch}</p><h2 className="text-2xl font-bold">Membership reminders</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Manage scheduled member follow-ups, contact channels, and reminder activity.</p></div><div className="page-header-actions"><button onClick={() => setShowHistory(true)} className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm font-semibold">View history ({reminderRecords.length})</button></div></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{[["Upcoming", metrics.upcoming], ["Due today", metrics.due], ["Overdue", metrics.overdue], ["Manual sent", metrics.manual], ["Simulated", metrics.automatic], ["Skipped / failed", metrics.skipped], ["Missing contact", metrics.missing]].map(([label, value]) => <div key={String(label)} className="summary-card"><p className="summary-card-label">{label}</p><p className="summary-card-value">{value}</p></div>)}</div>
    <section className="data-table-section">
      <div className="data-table-toolbar flex flex-wrap gap-2">
        <div className="min-w-[220px] flex-1"><CustomerCombobox customers={customers.filter((customer) => branch === "All branches" || customer.branch === branch)} value={customerId} onChange={setCustomerId} placeholder="Filter by customer" aria-label="Filter reminders by customer" /></div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plan or branch" className="min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
          {stages.map(([label]) => <option key={label}>{label}</option>)}
          <option>Paid</option><option>Unpaid</option>
        </select>
        {isAdmin ? (
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setCustomerId(""); }} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <option>All branches</option>
            {branches.filter((b) => b.status === "Active").map((b) => <option key={b.id}>{b.name}</option>)}
          </select>
        ) : (
          <span className="rounded-lg bg-[var(--accent-subtle)] px-3 py-2 text-xs font-semibold text-[var(--accent)]">Assigned branch · {assignedBranch}</span>
        )}
      </div>
      <div className="table-viewport overflow-x-auto">
        <table className="data-table data-table--compact min-w-[1050px]">
          <thead><tr>{["Member", "Plan", "Branch", "Expiration", "Status", "Payment", "Contact", "Next stage", "Last reminder", "Action"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((m) => {
              const c = customers.find((x) => x.id === m.customerId);
              const d = daysUntil(m.end);
              const stage = d === null ? null : reminderStage(d);
              const last = reminderRecords.find((r) => r.membershipId === m.id);
              return <tr key={m.id} className="hover:bg-[var(--bg)]">
                <td><button onClick={() => setSelected(m)} className="font-semibold text-[var(--accent)] hover:underline">{m.customer}</button><p className="text-xs text-[var(--text-muted)]">{m.id}</p></td>
                <td>{m.plan}</td><td>{m.branch}</td><td>{m.end}</td>
                <td><span className={`rounded-full px-2 py-1 text-xs ${badge(stage ?? m.status)}`}>{stage ?? m.status}</span></td>
                <td>{m.payment}</td>
                <td className="text-xs">{c?.email ? "Email" : ""}{c?.email && c?.phone ? " · " : ""}{c?.phone ? "Phone" : "—"}</td>
                <td className="text-xs">{eligible(m) ? stage : "Not scheduled"}</td>
                <td className="text-xs text-[var(--text-muted)]">{last ? new Date(last.attemptedAt).toLocaleDateString("en-PH") : "—"}</td>
                <td><button disabled={!c || (!c.email && !c.phone)} onClick={() => setSelected(m)} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-[var(--on-accent)] disabled:cursor-not-allowed disabled:opacity-40">Send reminder</button></td>
              </tr>;
            })}
          </tbody>
        </table>
        {!rows.length && <div className="p-10 text-center text-sm text-[var(--text-muted)]">No memberships match this filter.</div>}
      </div>
    </section>
    {selected && <ReminderModal membership={selected} customers={customers} payments={payments} settings={reminderSettings} userId={account?.id} role={role} onClose={() => setSelected(null)} onSend={(record) => { addReminder(record); setSelected(null); onAction("Reminder simulated — no email or SMS was sent"); }} />}
    {showHistory && <HistoryModal records={reminderRecords.filter((r) => branch === "All branches" || r.branch === branch)} onClose={() => setShowHistory(false)} />}
  </div>;
}

function ReminderModal({ membership, customers, payments, settings, userId, role, onClose, onSend }: { membership: Membership; customers: ReturnType<typeof useGymData>["customers"]; payments: ReturnType<typeof useGymData>["payments"]; settings: ReturnType<typeof useGymData>["reminderSettings"]; userId?: string; role: string; onClose: () => void; onSend: (record: ReminderRecord) => void }) {
  const customer = customers.find((c) => c.id === membership.customerId)!; const [channels, setChannels] = useState<ReminderChannel[]>(customer.email && settings.channels.email ? ["email"] : customer.phone && settings.channels.sms ? ["SMS"] : []); const [note, setNote] = useState(""); const days = daysUntil(membership.end); const stage = days === null ? "7 days before" : reminderStage(days) ?? "7 days before"; const hasPayment = payments.some((p) => p.membershipId === membership.id && (p.status ?? "Paid") === "Paid"); const message = renderTemplate(channels.includes("SMS") ? settings.smsTemplate : settings.emailTemplate, membership, customer, settings); const toggle = (channel: ReminderChannel) => setChannels((current) => current.includes(channel) ? current.filter((x) => x !== channel) : [...current, channel]);
  return <Modal label="Simulate membership reminder" onClose={onClose} wide><div className="space-y-4"><div className="rounded-lg bg-[var(--accent-subtle)] p-3 text-xs text-[var(--accent)]"><Bell size={14} className="mr-1 inline"/> This is a frontend simulation. No message will be delivered.</div><div className="grid gap-3 sm:grid-cols-2"><Info label="Member" value={membership.customer}/><Info label="Plan / expiration" value={`${membership.plan} · ${membership.end}`}/><Info label="Status" value={`${membership.status} · ${hasPayment ? "Payment recorded" : membership.payment}`}/><Info label="Contact" value={`${customer.email || "No email"} · ${customer.phone || "No phone"}`}/></div>{hasPayment && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">A payment is recorded for this membership. The preview contains no payment-demand language.</p>}<div><p className="mb-2 text-xs font-semibold">Channels</p><div className="flex gap-2">{(["email", "SMS"] as ReminderChannel[]).map((channel) => { const available = channel === "email" ? Boolean(customer.email && settings.channels.email) : Boolean(customer.phone && settings.channels.sms); return <button key={channel} disabled={!available} onClick={() => toggle(channel)} className={`rounded-lg border px-3 py-2 text-sm ${channels.includes(channel) ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]" : "border-[var(--border)]"} disabled:cursor-not-allowed disabled:opacity-40`}>{channel}{!available && " · unavailable"}</button>})}</div></div><label className="block"><span className="mb-1 block text-xs font-medium">Internal note (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20 w-full rounded-lg border border-[var(--border)] bg-transparent p-2 text-sm"/></label><div className="rounded-lg border border-[var(--border)] p-3"><p className="mb-2 text-xs font-semibold">Message preview · {stage}</p><p className="text-sm leading-relaxed">{message}</p></div><div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Cancel</button><button disabled={!channels.length} onClick={() => onSend({ id: `REM-${Date.now()}`, customerId: membership.customerId, membershipId: membership.id, branch: membership.branch, stage, source: "manual", channel: channels[0], initiatedBy: userId ?? role, eligibleDate: membership.end, attemptedAt: new Date().toISOString(), status: "Simulated", message, note: note || undefined })} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40">Simulate reminder</button></div></div></Modal>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function HistoryModal({ records, onClose }: { records: ReminderRecord[]; onClose: () => void }) { return <Modal label="Reminder history" onClose={onClose} wide><div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]"><tr>{["Date", "Member", "Stage", "Channel", "Source", "Status", "Reason"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{records.map((r) => <tr key={r.id} className="border-b border-[var(--border)]"><td className="px-3 py-2">{new Date(r.attemptedAt).toLocaleString("en-PH")}</td><td className="px-3 py-2">{r.customerId}</td><td className="px-3 py-2">{r.stage}</td><td className="px-3 py-2">{r.channel}</td><td className="px-3 py-2">{r.source}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${badge(r.status)}`}>{r.status}</span></td><td className="px-3 py-2 text-xs text-[var(--text-muted)]">{r.reason ?? "—"}</td></tr>)}</tbody></table>{!records.length && <p className="p-8 text-center text-sm text-[var(--text-muted)]">No reminder attempts yet.</p>}</div></Modal>; }
