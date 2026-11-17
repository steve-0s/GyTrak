import { ArrowUpRight, CheckCircle2, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGymData } from "../../contexts/GymDataContext";
import { isCollectedPayment } from "../../lib/financial";
import {
  businessDateKey,
  dashboardDateKey,
  daysFromToday,
  formatBusinessDate,
  hourLabel,
  timeHourBucket,
} from "../../lib/dashboardMetrics";

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
  const { registrations, visits, walkIns, memberships, payments } = useGymData();
  const today = businessDateKey();
  const branchVisits = visits.filter((record) => record.branch === assignedBranch);
  const branchWalkIns = walkIns.filter((visit) => visit.branch === assignedBranch);
  const branchMemberships = memberships.filter((item) => item.branch === assignedBranch);
  const branchPayments = payments.filter((payment) =>
    (payment.branch || branchMemberships.find((item) => item.id === payment.membershipId)?.branch) === assignedBranch,
  );
  const todayVisits = branchVisits.filter((record) => dashboardDateKey(record.date) === today && record.status !== "Voided");
  const todayWalkIns = branchWalkIns.filter((visit) => dashboardDateKey(visit.date) === today);
  const todayPayments = branchPayments.filter((payment) =>
    dashboardDateKey(payment.date) === today && isCollectedPayment(payment),
  );
  const membershipRevenue = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const walkInRevenueWithoutPaymentRecord = todayWalkIns.filter((visit) => visit.payment === "Paid" &&
    !branchPayments.some((payment) => payment.category === "Walk-in" && payment.reference === visit.id))
    .reduce((sum, visit) => sum + visit.fee, 0);
  const todayRevenue = membershipRevenue + walkInRevenueWithoutPaymentRecord;
  const pendingPayments = branchPayments.filter((payment) => payment.status === "Pending").length;
  const activeMemberships = branchMemberships.filter((item) => item.status === "Active" &&
    (!dashboardDateKey(item.start) || dashboardDateKey(item.start)! <= today) &&
    (!dashboardDateKey(item.end) || dashboardDateKey(item.end)! >= today));
  const openSessions = todayVisits.filter((record) => record.status === "Checked in");

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
    (!item.branch || item.branch === assignedBranch) && ["Pending", "Needs correction"].includes(item.status),
  );
  const stats = [
    { label: "Today's attendance", value: todayVisits.length.toLocaleString("en-PH"), context: "Recorded, non-void attendance" },
    { label: "Walk-ins today", value: todayWalkIns.length.toLocaleString("en-PH"), context: "Branch walk-in records" },
    { label: "Active memberships", value: activeMemberships.length.toLocaleString("en-PH"), context: "Current and in term" },
    { label: "Collected today", value: php(todayRevenue), context: "Paid membership and walk-in records" },
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
          <button onClick={() => onAction("Walk-in registration opened")} className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"><Plus size={16} /> Register walk-in</button>
          <button onClick={() => onAction("Manual attendance form opened")} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--bg)]">Record attendance</button>
          <button onClick={() => onAction("New customer form opened")} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--bg)]">Add customer</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => <div key={item.label} className="summary-card"><p className="summary-card-label">{item.label}</p><p className="summary-card-value">{item.value}</p><p className="summary-card-context">{item.context}</p></div>)}
      </div>
      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,.7fr)]">
        <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-semibold">Today's attendance</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Check-ins by hour · {assignedBranch}</p></div>
            <button onClick={() => onAction("Complete attendance page opened")} className="text-xs font-semibold text-[var(--accent)]">View attendance <ArrowUpRight size={13} className="inline" /></button>
          </div>
          {attendanceByHour.length ? <div className="mt-3 h-48 min-w-0 sm:h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendanceByHour} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="Check-ins" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState text="No attendance has been recorded today." />}
        </section>
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Needs Attention" subtitle="Items requiring follow-up" />
          <div className="p-2">
            <StatusTile label="Registration review" value={pendingRegistrations.length} detail="Requests from all branches" onClick={() => onAction("Customers opened")} />
            <StatusTile label="Open check-ins" value={openSessions.length} detail="Waiting for time-out" onClick={() => onAction("Complete attendance page opened")} />
            <StatusTile label="Membership follow-up" value={attentionMemberships.length} detail="Expiring or overdue" onClick={() => onAction("Membership reminders opened")} />
            <StatusTile label="Pending payments" value={pendingPayments} detail="Branch payment records" onClick={() => onAction("Memberships opened")} />
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Today's Walk-ins" subtitle={`${todayWalkIns.length} visits · ${php(todayRevenue)} collected`} />
          <div className="divide-y divide-[var(--border)]">
            {todayWalkIns.slice(0, 5).map((visit) => <div key={visit.id} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{visit.customer}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{visit.timeIn} · {visit.status}</p></div>
              <div className="shrink-0 text-right"><p className="text-sm font-semibold">{php(visit.fee)}</p><p className={`mt-1 text-xs ${visit.payment === "Paid" ? "text-[var(--accent)]" : "text-amber-600"}`}>{visit.payment}</p></div>
            </div>)}
            {todayWalkIns.length === 0 && <EmptyState text="No walk-ins recorded today." />}
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Membership Follow-up" subtitle="Expiring and overdue memberships" action="View memberships" onAction={() => onAction("Memberships opened")} />
          <div className="divide-y divide-[var(--border)]">
            {attentionMemberships.slice(0, 5).map((item) => <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{item.customer}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{item.plan} · ends {item.end}</p></div>
              <button onClick={() => onOpenMembership?.(item.id)} className="shrink-0 text-xs font-semibold text-[var(--accent)]">Details</button>
            </div>)}
            {attentionMemberships.length === 0 && <EmptyState text="No memberships need follow-up." />}
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Registration Review" subtitle={`${pendingRegistrations.length} requests awaiting review`} action="Review all" onAction={() => onAction("Customers opened")} />
          <div className="divide-y divide-[var(--border)]">
            {pendingRegistrations.slice(0, 4).map((item) => <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{item.possibleCustomerIds.length ? "Possible duplicate" : item.status}</p></div>
              <button onClick={() => onAction("Customers opened")} className="shrink-0 text-xs font-semibold text-[var(--accent)]">Review</button>
            </div>)}
            {pendingRegistrations.length === 0 && <EmptyState text="No registrations waiting for review." />}
          </div>
        </section>
      </div>
      <p className="mt-5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]"><CheckCircle2 size={14} className="text-[var(--accent)]" />Operational records are scoped to {assignedBranch}; unassigned profile registrations are shared with staff across branches. Dates use Asia/Manila.</p>
    </div>
  );
}

function SectionHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p></div>{action && onAction && <button onClick={onAction} className="shrink-0 text-xs font-semibold text-[var(--accent)]">{action} <ArrowUpRight size={13} className="inline" /></button>}</div>;
}

function StatusTile({ label, value, detail, onClick }: { label: string; value: number | string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--bg)]"><span className="min-w-0"><span className="block text-xs font-medium">{label}</span><span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{detail}</span></span><strong className="shrink-0 text-sm">{value}</strong></button>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-8 text-center text-xs text-[var(--text-muted)]">{text}</div>;
}
