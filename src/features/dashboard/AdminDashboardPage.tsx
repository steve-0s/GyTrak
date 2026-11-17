import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, CalendarDays, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGymData } from "../../contexts/GymDataContext";
import { isCollectedPayment } from "../../lib/financial";
import {
  businessDateKey,
  chartBucket,
  dashboardDateKey,
  dateInWindow,
  dateRangeStart,
  daysFromToday,
} from "../../lib/dashboardMetrics";
import type { Membership, VisitRecord } from "../../types";

type Granularity = "Daily" | "Weekly" | "Monthly" | "Yearly";
type Props = {
  onAction: (message: string) => void;
  onOpenMembership?: (membershipId: string) => void;
};

const formatPHP = (value: number) => `₱${value.toLocaleString("en-PH")}`;
const formatNumber = (value: number) => value.toLocaleString("en-PH");
export default function AdminDashboardPage({ onAction, onOpenMembership }: Props) {
  const { branches, customers, memberships, visits, walkIns, payments, registrations } = useGymData();
  const [branch, setBranch] = useState("All Branches");
  const [granularity, setGranularity] = useState<Granularity>("Daily");
  const today = businessDateKey();
  const start = dateRangeStart(granularity, today);
  const visibleBranches = branches.filter((item) => branch === "All Branches" || item.name === branch);
  const branchNames = new Set(visibleBranches.map((item) => item.name));
  const scopedCustomers = customers.filter((item) => branchNames.has(item.branch));
  const scopedMemberships = memberships.filter((item) => branchNames.has(item.branch));
  const scopedVisits = visits.filter((item) => branchNames.has(item.branch));
  const scopedWalkIns = walkIns.filter((item) => branchNames.has(item.branch));
  const membershipById = new Map(memberships.map((item) => [item.id, item]));
  const scopedPayments = payments.filter((payment) => {
    const paymentBranch = payment.branch || membershipById.get(payment.membershipId)?.branch;
    return paymentBranch ? branchNames.has(paymentBranch) : false;
  });
  const collectedPayments = scopedPayments.filter(isCollectedPayment);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthCollectedPayments = collectedPayments.filter((payment) => dateInWindow(payment.date, monthStart, today));
  const todayVisits = scopedVisits.filter((visit) => dashboardDateKey(visit.date) === today && visit.status !== "Voided");
  const activeMemberships = scopedMemberships.filter((item) =>
    item.status === "Active" && membershipIsCurrent(item, today),
  );
  const overdueMemberships = scopedMemberships.filter((item) =>
    (item.outstandingBalance ?? 0) > 0 && (item.status === "Expired" || daysFromToday(dashboardDateKey(item.nextDueDate ?? item.end) ?? item.end, today) < 0),
  );
  const dueWithin30 = scopedMemberships.filter((item) => {
    const days = daysFromToday(dashboardDateKey(item.end) ?? item.end, today);
    return item.status === "Active" && days >= 0 && days <= 30;
  });
  const monthWalkIns = scopedWalkIns.filter((item) => dateInWindow(item.date, monthStart, today));
  const monthWalkInRevenueWithoutPaymentRecord = monthWalkIns.filter((item) => item.payment === "Paid" &&
    !scopedPayments.some((payment) => payment.category === "Walk-in" && payment.reference === item.id))
    .reduce((sum, item) => sum + item.fee, 0);
  const monthCollected = monthCollectedPayments.reduce((sum, payment) => sum + payment.amount, 0) + monthWalkInRevenueWithoutPaymentRecord;
  const periodWalkIns = scopedWalkIns.filter((item) => dateInWindow(item.date, start, today));
  const pendingRegistrations = registrations.filter((item) =>
    (!item.branch || branchNames.has(item.branch)) && ["Pending", "Needs correction"].includes(item.status),
  );

  const revenueTrend = useMemo(() => {
    const totals = new Map<string, { label: string; amount: number }>();
    for (const payment of collectedPayments) {
      const key = dashboardDateKey(payment.date);
      if (!key || key < start || key > today) continue;
      const bucket = chartBucket(key, granularity);
      const current = totals.get(bucket.id) ?? { label: bucket.label, amount: 0 };
      current.amount += payment.amount;
      totals.set(bucket.id, current);
    }
    for (const visit of periodWalkIns) {
      if (visit.payment !== "Paid" || scopedPayments.some((payment) => payment.category === "Walk-in" && payment.reference === visit.id)) continue;
      const key = dashboardDateKey(visit.date);
      if (!key) continue;
      const bucket = chartBucket(key, granularity);
      const current = totals.get(bucket.id) ?? { label: bucket.label, amount: 0 };
      current.amount += visit.fee;
      totals.set(bucket.id, current);
    }
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [collectedPayments, granularity, periodWalkIns, scopedPayments, start, today]);
  const attendanceTrend = useMemo(() => {
    const totals = new Map<string, { label: string; count: number }>();
    for (const visit of scopedVisits) {
      if (visit.status === "Voided") continue;
      const key = dashboardDateKey(visit.date);
      if (!key || key < start || key > today) continue;
      const bucket = chartBucket(key, granularity);
      const current = totals.get(bucket.id) ?? { label: bucket.label, count: 0 };
      current.count += 1;
      totals.set(bucket.id, current);
    }
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [granularity, scopedVisits, start, today]);
  const branchRows = visibleBranches.map((item) => {
    const records = memberships.filter((membership) => membership.branch === item.name);
    const branchPayments = collectedPayments.filter((payment) =>
      (payment.branch || membershipById.get(payment.membershipId)?.branch) === item.name &&
      dateInWindow(payment.date, start, today),
    );
    const branchWalkIns = walkIns.filter((visit) => visit.branch === item.name && dateInWindow(visit.date, start, today));
    const walkInAmount = branchWalkIns.filter((visit) => visit.payment === "Paid" &&
      !payments.some((payment) => payment.category === "Walk-in" && payment.reference === visit.id))
      .reduce((sum, visit) => sum + visit.fee, 0);
    const visitsInPeriod = visits.filter((visit) => visit.branch === item.name && visit.status !== "Voided" && dateInWindow(visit.date, start, today));
    return {
      name: item.name,
      status: item.status,
      visits: visitsInPeriod.length,
      members: records.filter((record) => record.status === "Active" && membershipIsCurrent(record, today)).length,
      revenue: branchPayments.reduce((sum, payment) => sum + payment.amount, 0) + walkInAmount,
    };
  });
  const attentionMemberships = scopedMemberships.filter((item) => {
    const days = daysFromToday(dashboardDateKey(item.end) ?? item.end, today);
    return (item.status === "Active" && days >= 0 && days <= 30) ||
      (item.status === "Expired" && (item.outstandingBalance ?? 0) > 0);
  }).sort((a, b) => (dashboardDateKey(a.end) ?? a.end).localeCompare(dashboardDateKey(b.end) ?? b.end));
  const cards = [
    { label: "Customers", value: formatNumber(scopedCustomers.length), note: "Across selected branches" },
    { label: "Active memberships", value: formatNumber(activeMemberships.length), note: "Current and in term" },
    { label: "Today's attendance", value: formatNumber(todayVisits.length), note: "Recorded non-void visits" },
    { label: "Collected this month", value: formatPHP(monthCollected), note: "Paid records · current month" },
  ];

  return (
    <div>
      <div className="page-header page-header--actions">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Business performance from recorded membership, payment, and attendance data.</p>
        </div>
        <div className="page-header-actions">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <CalendarDays size={15} className="text-[var(--text-muted)]" />
            <select aria-label="Analytics granularity" value={granularity} onChange={(event) => setGranularity(event.target.value as Granularity)} className="bg-transparent text-sm outline-none">
              {(["Daily", "Weekly", "Monthly", "Yearly"] as const).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <select aria-label="Branch" value={branch} onChange={(event) => setBranch(event.target.value)} className="bg-transparent text-sm outline-none">
              <option>All Branches</option>
              {branches.map((item) => <option key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button onClick={() => onAction("Dashboard data refreshed")} aria-label="Refresh dashboard" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text-muted)] hover:bg-[var(--bg)]"><RefreshCw size={17} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="summary-card">
            <p className="summary-card-label">{card.label}</p><p className="summary-card-value">{card.value}</p><p className="summary-card-context">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Collected Revenue" subtitle={`${granularity} totals · paid records only · PHP`}>
          {revenueTrend.length ? <div className="h-52 min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrend} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={(value) => `₱${Number(value) / 1000}k`} />
                <Tooltip formatter={(value: unknown) => formatPHP(Number(value ?? 0))} contentStyle={tooltipStyle} />
                <Bar dataKey="amount" name="Collected" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <EmptyState text="No paid records in the selected date range." />}
        </ChartCard>
        <ChartCard title="Attendance Trend" subtitle={`${granularity} totals · recorded non-void visits`}>
          {attendanceTrend.length ? <div className="h-52 min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" name="Visits" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--accent)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div> : <EmptyState text="No attendance records in the selected date range." />}
        </ChartCard>
      </div>

      <div className="mt-5">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Branch Performance" subtitle={`${granularity} visits and revenue`} action="Manage branches" onAction={() => onAction("Branch details opened")} />
          <div className="hidden overflow-x-auto lg:block">
            <table className="data-table data-table--compact min-w-[640px]">
              <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Branch", "Status", "Visits", "Active members", "Revenue"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {branchRows.map((row) => <tr key={row.name} className="hover:bg-[var(--bg)]">
                  <td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3 text-[var(--text-muted)]">{row.status}</td><td className="px-4 py-3">{formatNumber(row.visits)}</td><td className="px-4 py-3">{formatNumber(row.members)}</td><td className="px-4 py-3 font-medium">{formatPHP(row.revenue)}</td>
                </tr>)}
                {branchRows.length === 0 && <tr><td colSpan={5}><EmptyState text="No branches match this filter." /></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[var(--border)] lg:hidden">
            {branchRows.map((row) => <div key={row.name} className="p-4">
              <div className="flex items-start justify-between gap-3"><p className="font-semibold">{row.name}</p><span className="text-xs text-[var(--text-muted)]">{row.status}</span></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-[var(--text-muted)]">Visits</p><p className="mt-1 font-semibold">{formatNumber(row.visits)}</p></div>
                <div><p className="text-[var(--text-muted)]">Active members</p><p className="mt-1 font-semibold">{formatNumber(row.members)}</p></div>
                <div><p className="text-[var(--text-muted)]">Revenue</p><p className="mt-1 font-semibold">{formatPHP(row.revenue)}</p></div>
              </div>
            </div>)}
            {branchRows.length === 0 && <EmptyState text="No branches match this filter." />}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Membership Follow-up" subtitle="Upcoming expirations and overdue balances" action="View memberships" onAction={() => onAction("Expiring memberships opened")} />
          <div className="divide-y divide-[var(--border)]">
            {attentionMemberships.slice(0, 5).map((item) => <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 px-5 py-3.5"><div className="min-w-0"><p className="truncate text-xs font-semibold">{item.customer} <span className="font-normal text-[var(--text-muted)]">· {item.plan}</span></p><p className="mt-1 text-[11px] text-[var(--text-muted)]">Expires {item.end} · balance {formatPHP(item.outstandingBalance ?? 0)}</p></div><button onClick={() => onOpenMembership?.(item.id)} className="shrink-0 text-xs font-semibold text-[var(--accent)]">Details</button></div>)}
            {attentionMemberships.length === 0 && <EmptyState text="No memberships need follow-up." />}
          </div>
        </section>
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Needs Attention" subtitle="Current workflow queues" />
          <div className="space-y-1 p-3">
            <AttentionButton title="Renewals due soon" detail={`${dueWithin30.length} active memberships ending within 30 days`} action="Expiring memberships opened" onAction={onAction} />
            <AttentionButton title="Overdue balances" detail={`${overdueMemberships.length} memberships need payment follow-up`} action="Expiring memberships opened" onAction={onAction} />
            <AttentionButton title="Pending registrations" detail={`${pendingRegistrations.length} require review`} action="Pending registrations opened" onAction={onAction} />
          </div>
        </section>
      </div>
      <p className="mt-5 text-[11px] text-[var(--text-muted)]">Dashboard metrics use available mock records and Asia/Manila calendar dates. Expiration and revenue history are limited to the fields currently stored in the frontend model.</p>
    </div>
  );
}

function membershipIsCurrent(item: Membership, today: string) {
  const start = dashboardDateKey(item.start);
  const end = dashboardDateKey(item.end);
  return (!start || start <= today) && (!end || end >= today);
}

function SectionHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p></div>{action && onAction && <button onClick={onAction} className="shrink-0 text-xs font-semibold text-[var(--accent)]">{action} <ArrowUpRight size={13} className="inline" /></button>}</div>;
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><div className="mb-4"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p></div>{children}</section>;
}

function AttentionButton({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: (message: string) => void }) {
  return <button onClick={() => onAction(action)} className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-[var(--bg)]"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" /><span className="flex-1"><span className="block text-xs font-semibold">{title}</span><span className="mt-1 block text-[11px] text-[var(--text-muted)]">{detail}</span></span><ArrowUpRight size={14} className="text-[var(--accent)]" /></button>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-8 text-center text-xs text-[var(--text-muted)]">{text}</div>;
}

const tooltipStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 12,
};
