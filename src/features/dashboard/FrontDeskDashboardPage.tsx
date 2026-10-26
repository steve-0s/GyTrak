import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, CheckCircle2, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CustomerCombobox from "../../components/shared/CustomerCombobox";
import { useGymData } from "../../contexts/GymDataContext";
import {
  addDateDays,
  businessDateKey,
  dashboardDateKey,
  daysFromToday,
  formatBusinessDate,
  hourLabel,
  timeHourBucket,
} from "../../lib/dashboardMetrics";
import type { Membership, PaymentRecord } from "../../types";

type Props = {
  branch?: string;
  onAction: (message: string) => void;
  onOpenMembership?: (membershipId: string) => void;
};

const php = (amount: number) => `₱${amount.toLocaleString("en-PH")}`;
const tooltipStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 12,
};

export default function FrontDeskDashboardPage({
  branch: assignedBranch = "Makati Central",
  onAction,
  onOpenMembership,
}: Props) {
  const { registrations, visits, walkIns, memberships, customers, reminderRecords, payments } = useGymData();
  const today = businessDateKey();
  const yesterday = addDateDays(today, -1);
  const branchVisits = visits.filter((record) => record.branch === assignedBranch);
  const branchWalkIns = walkIns.filter((visit) => visit.branch === assignedBranch);
  const branchMemberships = memberships.filter((item) => item.branch === assignedBranch);
  const branchPayments = payments.filter((payment) =>
    (payment.branch || branchMemberships.find((item) => item.id === payment.membershipId)?.branch) === assignedBranch,
  );
  const todayVisits = branchVisits.filter((record) => dashboardDateKey(record.date) === today && record.status !== "Voided");
  const todayWalkIns = branchWalkIns.filter((visit) => dashboardDateKey(visit.date) === today);
  const todayPayments = branchPayments.filter((payment) =>
    dashboardDateKey(payment.date) === today && (payment.status ?? "Paid") === "Paid" && payment.category !== "Promo discount",
  );
  const membershipRevenue = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const walkInRevenueWithoutPaymentRecord = todayWalkIns.filter((visit) => visit.payment === "Paid" &&
    !branchPayments.some((payment) => payment.category === "Walk-in" && payment.reference === visit.id))
    .reduce((sum, visit) => sum + visit.fee, 0);
  const todayRevenue = membershipRevenue + walkInRevenueWithoutPaymentRecord;
  const pendingPayments = branchPayments.filter((payment) => payment.status === "Pending").length;
  const outstanding = branchMemberships.reduce((sum, item) => sum + Math.max(0, item.outstandingBalance ?? 0), 0);
  const activeMemberships = branchMemberships.filter((item) => item.status === "Active" &&
    (!dashboardDateKey(item.start) || dashboardDateKey(item.start)! <= today) &&
    (!dashboardDateKey(item.end) || dashboardDateKey(item.end)! >= today));
  const openSessions = todayVisits.filter((record) => record.status === "Checked in");
  const syncQueue = branchVisits.filter((record) => record.sync === "Pending" || record.sync === "Failed");
  const uniqueToday = new Set(todayVisits.map((record) => record.customerId)).size;
  const [customerFilterId, setCustomerFilterId] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [dateFilter, setDateFilter] = useState("Today");
  const [visitType, setVisitType] = useState("All visit types");
  const [source, setSource] = useState("All sources");

  const filteredAttendance = useMemo(() => {
    const start = dateFilter === "Today" ? today : dateFilter === "Yesterday" ? yesterday : addDateDays(today, -6);
    return branchVisits.filter((record) => {
      const key = dashboardDateKey(record.date);
      return key !== null && key >= start && key <= (dateFilter === "Yesterday" ? yesterday : today) &&
        (!customerFilterId || record.customerId === customerFilterId) &&
        (status === "All statuses" || record.status === status) &&
        (visitType === "All visit types" || record.type === visitType) &&
        (source === "All sources" || (source === "RFID" ? record.source.startsWith("RFID") : record.source === "Manual"));
    }).sort((a, b) => `${dashboardDateKey(b.date)} ${b.timeIn}`.localeCompare(`${dashboardDateKey(a.date)} ${a.timeIn}`));
  }, [branchVisits, customerFilterId, dateFilter, source, status, today, visitType, yesterday]);

  const attendanceByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour: hourLabel(hour),
    count: todayVisits.filter((record) => timeHourBucket(record.timeIn) === hour).length,
  })).filter((item) => item.count > 0);
  const attentionMemberships = branchMemberships.filter((item) => {
    const days = daysFromToday(dashboardDateKey(item.end) ?? item.end, today);
    return (item.status === "Active" && days >= 0 && days <= 30) ||
      (item.status === "Expired" && (item.outstandingBalance ?? 0) > 0) ||
      ((item.outstandingBalance ?? 0) > 0 && item.status === "Pending");
  }).sort((a, b) => (dashboardDateKey(a.end) ?? a.end).localeCompare(dashboardDateKey(b.end) ?? b.end));
  const pendingRegistrations = registrations.filter((item) =>
    item.branch === assignedBranch && ["Pending", "Needs correction"].includes(item.status),
  );
  const paymentTargetMembership = branchMemberships.find((item) =>
    (item.outstandingBalance ?? 0) > 0 || item.payment === "Pending",
  );
  const branchReminderRecords = reminderRecords.filter((record) => record.branch === assignedBranch);
  const recentPayments = [...branchPayments].filter((payment) =>
    (payment.status ?? "Paid") === "Paid" && payment.category !== "Promo discount",
  ).sort((a, b) => (dashboardDateKey(b.date) ?? "").localeCompare(dashboardDateKey(a.date) ?? "")).slice(0, 5);
  const stats = [
    { label: "Today's attendance", value: todayVisits.length.toLocaleString("en-PH"), context: "Recorded, non-void attendance" },
    { label: "Unique visitors", value: uniqueToday.toLocaleString("en-PH"), context: "Distinct customer records today" },
    { label: "Active memberships", value: activeMemberships.length.toLocaleString("en-PH"), context: "Active and within membership dates" },
    { label: "Walk-ins today", value: todayWalkIns.length.toLocaleString("en-PH"), context: "Branch walk-in records" },
    { label: "Collected today", value: php(todayRevenue), context: "Paid membership and walk-in records" },
    { label: "Outstanding balance", value: php(outstanding), context: "Saved membership balance fields" },
    { label: "Pending payments", value: pendingPayments.toLocaleString("en-PH"), context: "Pending payment records" },
    { label: "Memberships needing follow-up", value: attentionMemberships.length.toLocaleString("en-PH"), context: "Upcoming expiry or outstanding balance" },
    { label: "Registration review", value: pendingRegistrations.length.toLocaleString("en-PH"), context: "Pending or needs correction" },
    { label: "Open sessions", value: openSessions.length.toLocaleString("en-PH"), context: "Checked in without checkout" },
  ];

  return (
    <div>
      <div className="page-header page-header--actions">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">{assignedBranch}</p>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Branch activity for {formatBusinessDate(today)}.</p>
        </div>
        <div className="page-header-actions">
          <button onClick={() => onAction("Walk-in registration opened")} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"><Plus size={16} /> Register walk-in</button>
          <button onClick={() => onAction("New customer form opened")} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--bg)]">Add customer</button>
          <button onClick={() => onAction("Membership creation opened")} className="hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--bg)] sm:block">Enroll member</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((item) => <div key={item.label} className="summary-card"><p className="summary-card-label">{item.label}</p><p className="summary-card-value">{item.value}</p><p className="summary-card-context">{item.context}</p></div>)}
      </div>
      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Quick actions</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Available within {assignedBranch}</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <QuickAction label="Record attendance" onClick={() => onAction("Manual attendance form opened")} />
          <QuickAction label="Open memberships" onClick={() => onAction("Memberships opened")} />
          <QuickAction label="Take payment" onClick={() => paymentTargetMembership && onOpenMembership
            ? onOpenMembership(paymentTargetMembership.id)
            : onAction("Memberships opened")} />
          <QuickAction label="Review registrations" onClick={() => onAction("Customers opened")} />
          <QuickAction label="Membership reminders" onClick={() => onAction("Membership reminders opened")} />
          <QuickAction label="RFID keyfobs" onClick={() => onAction("Keyfob assignment opened")} />
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-semibold">Today's attendance by hour</h3><p className="mt-1 text-xs text-[var(--text-muted)]">From actual time-in records · {assignedBranch}</p></div>
          <button onClick={() => onAction("Complete attendance page opened")} className="text-xs font-semibold text-[var(--accent)]">View attendance <ArrowUpRight size={13} className="inline" /></button>
        </div>
        {attendanceByHour.length ? <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendanceByHour} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="Check-ins" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState text="No attendance has been recorded today." />}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center">
          <div><h3 className="font-semibold">Attendance</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{filteredAttendance.length} matching events · {assignedBranch}</p></div>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[200px]"><CustomerCombobox customers={branchVisits.map((visit) => customers.find((customer) => customer.id === visit.customerId)).filter((customer): customer is NonNullable<typeof customer> => Boolean(customer))} value={customerFilterId} onChange={setCustomerFilterId} placeholder="Filter by customer" aria-label="Filter branch attendance by customer" /></div>
            <label className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5"><CalendarDays size={14} className="text-[var(--text-muted)]" /><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="bg-transparent text-xs outline-none"><option>Today</option><option>Yesterday</option><option>This week</option></select></label>
            <select aria-label="Attendance status filter" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-xs outline-none"><option>All statuses</option><option>Checked in</option><option>Completed</option><option>Voided</option></select>
            <select aria-label="Visit type filter" value={visitType} onChange={(event) => setVisitType(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-xs outline-none"><option>All visit types</option><option>Member</option><option>Walk-in</option></select>
            <select aria-label="Attendance source filter" value={source} onChange={(event) => setSource(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-xs outline-none"><option>All sources</option><option>RFID</option><option>Manual</option></select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table data-table--compact min-w-[760px]"><thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Date", "Customer", "Time-in", "Time-out", "Type", "Source", "Status", ""].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{filteredAttendance.slice(0, 10).map((record) => <tr key={record.id} className="hover:bg-[var(--bg)]"><td className="px-4 py-3 text-[var(--text-muted)]">{record.date}</td><td className="px-4 py-3 font-semibold">{record.customer}</td><td className="px-4 py-3 text-[var(--text-muted)]">{record.timeIn}</td><td className="px-4 py-3 text-[var(--text-muted)]">{record.timeOut}</td><td className="px-4 py-3">{record.type}</td><td className="px-4 py-3 text-[var(--text-muted)]">{record.source.startsWith("RFID") ? "RFID" : "Manual"}</td><td className="px-4 py-3">{record.status}</td><td className="px-4 py-3 text-right"><button onClick={() => onAction(`${record.customer} attendance details opened`)} className="font-semibold text-[var(--accent)]">Details</button></td></tr>)}</tbody></table>
          {filteredAttendance.length === 0 && <EmptyState text="No attendance records match the selected branch, date, and filters." />}
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Today's Walk-ins" subtitle={`${todayWalkIns.length} visits · ${php(todayRevenue)} collected across recorded payments`} action="Register walk-in" onAction={() => onAction("Walk-in registration opened")} />
          <div className="overflow-x-auto"><table className="data-table data-table--compact min-w-[480px]"><thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Customer", "Time", "Fee", "Payment", "Status"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{todayWalkIns.map((visit) => <tr key={visit.id}><td className="px-4 py-3 font-medium">{visit.customer}</td><td className="px-4 py-3 text-[var(--text-muted)]">{visit.timeIn}</td><td className="px-4 py-3">{php(visit.fee)}</td><td className={`px-4 py-3 font-medium ${visit.payment === "Paid" ? "text-[var(--accent)]" : "text-amber-500"}`}>{visit.payment}</td><td className="px-4 py-3">{visit.status}</td></tr>)}{todayWalkIns.length === 0 && <tr><td colSpan={5}><EmptyState text="No walk-ins have been recorded today." /></td></tr>}</tbody></table></div>
        </section>
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Recent Payments" subtitle="Paid records for this branch · discounts are not revenue" action="Open memberships" onAction={() => onAction("Memberships opened")} />
          <div className="overflow-x-auto"><table className="data-table data-table--compact min-w-[500px]"><thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Date", "Customer / service", "Category", "Method", "Amount"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{recentPayments.map((payment) => <PaymentRow key={payment.id} payment={payment} membership={branchMemberships.find((item) => item.id === payment.membershipId)} />)}{recentPayments.length === 0 && <tr><td colSpan={5}><EmptyState text="No paid payments are available." /></td></tr>}</tbody></table></div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Membership Attention" subtitle="Branch-scoped expirations and outstanding amounts" action="Open reminders" onAction={() => onAction("Membership reminders opened")} />
          <div className="divide-y divide-[var(--border)]">{attentionMemberships.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5"><div><p className="text-xs font-semibold">{item.customer} <span className="font-normal text-[var(--text-muted)]">· {item.plan}</span></p><p className="mt-1 text-[11px] text-[var(--text-muted)]">Expires {item.end} · balance {php(item.outstandingBalance ?? 0)}</p></div><button onClick={() => onOpenMembership?.(item.id)} className="shrink-0 text-xs font-semibold text-[var(--accent)]">Details</button></div>)}{attentionMemberships.length === 0 && <EmptyState text="No memberships currently need follow-up." />}</div>
        </section>
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Operations & reminders" subtitle="Recorded branch status; no live device connection is exposed" action="Open reminders" onAction={() => onAction("Membership reminders opened")} />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <StatusTile label="Pending / failed attendance sync" value={syncQueue.length} detail="From attendance records" onClick={() => onAction("Sync queue opened")} />
            <StatusTile label="Open check-in sessions" value={openSessions.length} detail="No checkout recorded" onClick={() => onAction("Complete attendance page opened")} />
            <StatusTile label="Reminder attempts" value={branchReminderRecords.length} detail="Recorded simulated/manual attempts" onClick={() => onAction("Membership reminders opened")} />
            <StatusTile label="Collected today" value={php(todayRevenue)} detail="Paid membership and walk-in records" onClick={() => onAction("Memberships opened")} />
          </div>
          <p className="border-t border-[var(--border)] px-5 py-3 text-[11px] text-[var(--text-muted)]">Live scanner/device connectivity is not present in the frontend mock data. Sync counts above reflect only saved visit records.</p>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <SectionHeader title="Registration Review" subtitle={`${assignedBranch} QR submissions awaiting staff action`} action="Review in Customers" onAction={() => onAction("Customers opened")} />
        <div className="grid gap-3 p-4 sm:grid-cols-2">{pendingRegistrations.slice(0, 4).map((item) => <div key={item.id} className="rounded-lg border border-[var(--border)] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{item.name}</p><span className="text-[11px] text-amber-500">{item.possibleCustomerIds.length ? "Possible duplicate" : item.status}</span></div><p className="mt-1 text-[11px] text-[var(--text-muted)]">{item.reference} · {new Date(item.submittedAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" })}</p><button onClick={() => onAction("Customers opened")} className="mt-3 text-xs font-semibold text-[var(--accent)]">Review submission</button></div>)}{pendingRegistrations.length === 0 && <EmptyState text="No profile registrations are waiting for review." />}</div>
      </section>
      <p className="mt-5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]"><CheckCircle2 size={14} className="text-[var(--accent)]" />All displayed operational records are scoped to {assignedBranch}. Dashboard date boundaries use Asia/Manila.</p>
    </div>
  );
}

function PaymentRow({ payment, membership }: { key: string; payment: PaymentRecord; membership?: Membership }) {
  return <tr><td className="px-4 py-3 text-[var(--text-muted)]">{payment.date}</td><td className="px-4 py-3 font-medium">{membership?.customer ?? payment.serviceName ?? payment.reference}</td><td className="px-4 py-3">{payment.category ?? "Membership"}</td><td className="px-4 py-3 text-[var(--text-muted)]">{payment.method}</td><td className="px-4 py-3 font-semibold">{php(payment.amount)}</td></tr>;
}

function SectionHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p></div>{action && onAction && <button onClick={onAction} className="shrink-0 text-xs font-semibold text-[var(--accent)]">{action} <ArrowUpRight size={13} className="inline" /></button>}</div>;
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold hover:bg-[var(--bg)]">{label}</button>;
}

function StatusTile({ label, value, detail, onClick }: { label: string; value: number | string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg bg-[var(--bg)] p-3 text-left"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p><p className="mt-1 text-[11px] text-[var(--text-muted)]">{detail}</p></button>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-8 text-center text-xs text-[var(--text-muted)]">{text}</div>;
}
