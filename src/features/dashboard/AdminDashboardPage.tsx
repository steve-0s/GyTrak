import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, CalendarDays, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGymData } from "../../contexts/GymDataContext";
import {
  businessDateKey,
  chartBucket,
  dashboardDateKey,
  dateInWindow,
  dateRangeStart,
  daysFromToday,
  formatBusinessDate,
  hourLabel,
  timeHourBucket,
  weekDayLabel,
} from "../../lib/dashboardMetrics";
import type { Membership, PaymentRecord, VisitRecord } from "../../types";

type Granularity = "Daily" | "Weekly" | "Monthly" | "Yearly";
type Props = {
  onAction: (message: string) => void;
  onOpenMembership?: (membershipId: string) => void;
};

const formatPHP = (value: number) => `₱${value.toLocaleString("en-PH")}`;
const formatNumber = (value: number) => value.toLocaleString("en-PH");
const statusColors = ["#60A5FA", "#FBBF24", "#9CA3AF", "#F87171"];

export default function AdminDashboardPage({ onAction, onOpenMembership }: Props) {
  const { branches, customers, memberships, visits, walkIns, payments, registrations, auditLogs } = useGymData();
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
  const collectedPayments = scopedPayments.filter((payment) =>
    (payment.status ?? "Paid") === "Paid" && payment.category !== "Promo discount",
  );
  const rangePayments = collectedPayments.filter((payment) => dateInWindow(payment.date, start, today));
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthCollectedPayments = collectedPayments.filter((payment) => dateInWindow(payment.date, monthStart, today));
  const todayVisits = scopedVisits.filter((visit) => dashboardDateKey(visit.date) === today && visit.status !== "Voided");
  const todayWalkIns = scopedWalkIns.filter((item) => dashboardDateKey(item.date) === today);
  const activeMemberships = scopedMemberships.filter((item) =>
    item.status === "Active" && membershipIsCurrent(item, today),
  );
  const outstanding = scopedMemberships.reduce((sum, item) => sum + Math.max(0, item.outstandingBalance ?? 0), 0);
  const overdueMemberships = scopedMemberships.filter((item) =>
    (item.outstandingBalance ?? 0) > 0 && (item.status === "Expired" || daysFromToday(dashboardDateKey(item.nextDueDate ?? item.end) ?? item.end, today) < 0),
  );
  const dueWithin30 = scopedMemberships.filter((item) => {
    const days = daysFromToday(dashboardDateKey(item.end) ?? item.end, today);
    return item.status === "Active" && days >= 0 && days <= 30;
  });
  const newMemberships = scopedMemberships.filter((item) => dateInWindow(item.start, start, today));
  const todayWalkInRevenueWithoutPaymentRecord = todayWalkIns.filter((item) => item.payment === "Paid" &&
    !scopedPayments.some((payment) => payment.category === "Walk-in" && payment.reference === item.id))
    .reduce((sum, item) => sum + item.fee, 0);
  const todayCollected = collectedPayments.filter((item) => dashboardDateKey(item.date) === today)
    .reduce((sum, payment) => sum + payment.amount, 0) + todayWalkInRevenueWithoutPaymentRecord;
  const periodCollected = rangePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const monthWalkIns = scopedWalkIns.filter((item) => dateInWindow(item.date, monthStart, today));
  const monthWalkInRevenueWithoutPaymentRecord = monthWalkIns.filter((item) => item.payment === "Paid" &&
    !scopedPayments.some((payment) => payment.category === "Walk-in" && payment.reference === item.id))
    .reduce((sum, item) => sum + item.fee, 0);
  const monthCollected = monthCollectedPayments.reduce((sum, payment) => sum + payment.amount, 0) + monthWalkInRevenueWithoutPaymentRecord;
  const periodWalkIns = scopedWalkIns.filter((item) => dateInWindow(item.date, start, today));
  const paidWalkInRevenue = periodWalkIns.filter((item) => item.payment === "Paid" &&
    !scopedPayments.some((payment) => payment.category === "Walk-in" && payment.reference === item.id))
    .reduce((sum, item) => sum + item.fee, 0);
  const revenueTotal = periodCollected + paidWalkInRevenue;
  const pendingRegistrations = registrations.filter((item) =>
    branchNames.has(item.branch) && ["Pending", "Needs correction"].includes(item.status),
  );
  const pendingSync = scopedVisits.filter((item) => item.sync === "Pending" || item.sync === "Failed");

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
  const membershipStatuses = ["Active", "Pending", "Expired", "Suspended"].map((name, index) => ({
    name,
    value: scopedMemberships.filter((item) => item.status === name).length,
    color: statusColors[index],
  }));
  const membershipPlanCounts = [...new Set(scopedMemberships.map((item) => item.plan))].map((name) => ({
    name,
    count: scopedMemberships.filter((item) => item.plan === name).length,
  }));
  const weekdayVisits = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    day,
    count: scopedVisits.filter((item) => item.status !== "Voided" && dashboardDateKey(item.date) &&
      weekDayLabel(dashboardDateKey(item.date)!) === day).length,
  }));
  const hourlyVisits = Array.from({ length: 24 }, (_, hour) => ({
    hour: hourLabel(hour),
    count: todayVisits.filter((item) => timeHourBucket(item.timeIn) === hour).length,
  })).filter((item) => item.count > 0);
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
      unique: new Set(visitsInPeriod.map((visit) => visit.customerId)).size,
      members: records.filter((record) => record.status === "Active" && membershipIsCurrent(record, today)).length,
      newMemberships: records.filter((record) => dateInWindow(record.start, start, today)).length,
      revenue: branchPayments.reduce((sum, payment) => sum + payment.amount, 0) + walkInAmount,
      outstanding: records.reduce((sum, record) => sum + Math.max(0, record.outstandingBalance ?? 0), 0),
    };
  });
  const attentionMemberships = scopedMemberships.filter((item) => {
    const days = daysFromToday(dashboardDateKey(item.end) ?? item.end, today);
    return (item.status === "Active" && days >= 0 && days <= 30) ||
      (item.status === "Expired" && (item.outstandingBalance ?? 0) > 0);
  }).sort((a, b) => (dashboardDateKey(a.end) ?? a.end).localeCompare(dashboardDateKey(b.end) ?? b.end));
  const recentPayments = [...collectedPayments].sort((a, b) =>
    (dashboardDateKey(b.date) ?? "").localeCompare(dashboardDateKey(a.date) ?? ""),
  ).slice(0, 6);
  const recentActivity = auditLogs.filter((item) => branch === "All Branches" || item.branch === branch || item.branch === "All branches").slice(0, 6);
  const renewalActivity = auditLogs.filter((item) =>
    item.action.toLowerCase().includes("renew") &&
    (branch === "All Branches" || item.branch === branch || item.branch === "All branches"),
  );
  const cards = [
    { label: "Customers", value: formatNumber(scopedCustomers.length), note: "Records in selected branches", action: "Customers opened" },
    { label: "Active branches", value: formatNumber(visibleBranches.filter((item) => item.status === "Active").length), note: "Selected branches currently active", action: "Branch details opened" },
    { label: "Membership records", value: formatNumber(scopedMemberships.length), note: `${formatNumber(activeMemberships.length)} active and in term`, action: "Memberships opened" },
    { label: "Active memberships", value: formatNumber(activeMemberships.length), note: "Status active and term current", action: "Memberships opened" },
    { label: "Today's attendance", value: formatNumber(todayVisits.length), note: `${new Set(todayVisits.map((visit) => visit.customerId)).size} distinct visitors`, action: "Complete attendance page opened" },
    { label: "New memberships", value: formatNumber(newMemberships.length), note: `Started in selected ${granularity.toLowerCase()} window`, action: "Memberships opened" },
    { label: "Collected revenue", value: formatPHP(revenueTotal), note: `${formatPHP(todayCollected)} collected today`, action: "Reports opened" },
    { label: "Collected this month", value: formatPHP(monthCollected), note: "Paid records in current calendar month", action: "Reports opened" },
    { label: "Outstanding balance", value: formatPHP(outstanding), note: "Unpaid membership balance fields", action: "Memberships opened" },
    { label: "Renewals due in 30 days", value: formatNumber(dueWithin30.length), note: "Current active terms", action: "Expiring memberships opened" },
    { label: "Overdue memberships", value: formatNumber(overdueMemberships.length), note: "Expired or past due with balance", action: "Expiring memberships opened" },
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {cards.map((card) => (
          <button key={card.label} onClick={() => onAction(card.action)} className="summary-card text-left transition-colors hover:border-[var(--accent)]">
            <p className="summary-card-label">{card.label}</p><p className="summary-card-value">{card.value}</p><p className="summary-card-context">{card.note}</p>
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => onAction("Reports opened")} className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--on-accent)]">Open reports</button>
        <button onClick={() => onAction("Branch details opened")} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold">Manage branches</button>
        <button onClick={() => onAction("Membership reminders opened")} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold">Membership reminders</button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Collected Revenue" subtitle={`${granularity} totals · paid records only · PHP`}>
          {revenueTrend.length ? <div className="h-64">
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
          {attendanceTrend.length ? <div className="h-64">
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

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Branch Performance" subtitle={`${granularity} attendance and collected revenue · includes historical branches`} action="View branches" onAction={() => onAction("Branch details opened")} />
          <div className="overflow-x-auto">
            <table className="data-table data-table--compact dashboard-branch-performance-table min-w-[980px]">
              <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Branch", "Status", "Visits", "Unique visitors", "Active members", "New memberships", "Revenue", "Outstanding"].map((label) => <th key={label} className="font-semibold">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {branchRows.map((row) => <tr key={row.name} className="hover:bg-[var(--bg)]">
                  <td className="font-semibold">{row.name}</td><td className="text-[var(--text-muted)]">{row.status}</td><td>{formatNumber(row.visits)}</td><td>{formatNumber(row.unique)}</td><td>{formatNumber(row.members)}</td><td>{formatNumber(row.newMemberships)}</td><td className="font-medium">{formatPHP(row.revenue)}</td><td className="text-amber-500">{formatPHP(row.outstanding)}</td>
                </tr>)}
                {branchRows.length === 0 && <tr><td colSpan={8}><EmptyState text="No branches match this filter." /></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <div className="grid gap-5">
          <ChartCard title="Membership Status" subtitle="Counts by saved record status">
            <div className="flex flex-wrap items-center justify-center gap-5">
              {scopedMemberships.length ? <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={membershipStatuses} innerRadius={48} outerRadius={69} dataKey="value" stroke="var(--surface)" strokeWidth={3}>{membershipStatuses.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer>
              </div> : <EmptyState text="No membership records are available." />}
              <div className="min-w-36 space-y-3">{membershipStatuses.map((item) => <div key={item.name} className="flex items-center gap-2 text-xs"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-[var(--text-muted)]">{item.name}</span><strong className="ml-auto">{formatNumber(item.value)}</strong></div>)}</div>
            </div>
          </ChartCard>
          <ChartCard title="Memberships by Plan" subtitle="Existing membership records">
            {membershipPlanCounts.length ? <div className="h-44">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={membershipPlanCounts} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} /><YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="Memberships" fill="var(--accent)" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
            </div> : <EmptyState text="No plan records are available." />}
          </ChartCard>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Visits by Weekday" subtitle="All recorded attendance dates">
          {scopedVisits.length ? <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekdayVisits}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="Visits" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState text="No attendance records are available." />}
        </ChartCard>
        <ChartCard title="Today's Peak Hours" subtitle={`${formatBusinessDate(today)} · from recorded time-ins`}>
          {hourlyVisits.length ? <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={hourlyVisits}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="Visits" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState text="No attendance has been recorded today." />}
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Membership Attention" subtitle="Upcoming expirations and overdue balances" action="View memberships" onAction={() => onAction("Expiring memberships opened")} />
          <div className="overflow-x-auto">
            <table className="data-table data-table--compact min-w-[680px]"><thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Customer", "Membership", "Branch", "Expiration", "Balance", "Status", ""].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-[var(--border)]">{attentionMemberships.slice(0, 8).map((item) => <tr key={item.id} className="hover:bg-[var(--bg)]"><td className="px-4 py-3 font-medium">{item.customer}</td><td className="px-4 py-3">{item.plan}</td><td className="px-4 py-3 text-[var(--text-muted)]">{item.branch}</td><td className="px-4 py-3">{item.end}</td><td className="px-4 py-3 text-amber-500">{formatPHP(item.outstandingBalance ?? 0)}</td><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3 text-right"><button onClick={() => onOpenMembership?.(item.id)} className="font-semibold text-[var(--accent)]">Details</button></td></tr>)}
                {attentionMemberships.length === 0 && <tr><td colSpan={7}><EmptyState text="No upcoming expirations or overdue balances in the selected branches." /></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)]">Renewal history available from {renewalActivity.length} recorded audit event{renewalActivity.length === 1 ? "" : "s"}. Membership records do not have a dedicated renewal lineage field.</div>
        </section>
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Recent Payments" subtitle="Paid financial records · excludes promotional discounts" action="Open reports" onAction={() => onAction("Reports opened")} />
          <div className="overflow-x-auto"><table className="data-table data-table--compact min-w-[570px]"><thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Date", "Category", "Customer / reference", "Method", "Amount"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{recentPayments.map((payment) => <PaymentRow key={payment.id} payment={payment} membership={membershipById.get(payment.membershipId)} />)}{recentPayments.length === 0 && <tr><td colSpan={5}><EmptyState text="No paid payment records have been recorded." /></td></tr>}</tbody></table></div>
          <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)]">Paid: {formatPHP(periodCollected)} · Outstanding: {formatPHP(outstanding)}</div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Recent Activity" subtitle="Recorded audit events" action="View audit log" onAction={() => onAction("Activity log opened")} />
          <div className="overflow-x-auto"><table className="data-table data-table--compact min-w-[570px]"><thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Action", "Record", "Branch", "User", "Time"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{recentActivity.map((item, index) => <tr key={`${item.record}-${index}`}><td className="px-4 py-3 font-medium">{item.action}</td><td className="px-4 py-3 text-[var(--text-muted)]">{item.record}</td><td className="px-4 py-3 text-[var(--text-muted)]">{item.branch}</td><td className="px-4 py-3">{item.user}</td><td className="px-4 py-3 text-[var(--text-muted)]">{item.time}</td></tr>)}{recentActivity.length === 0 && <tr><td colSpan={5}><EmptyState text="No audit events are available for this branch." /></td></tr>}</tbody></table></div>
        </section>
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <SectionHeader title="Needs Attention" subtitle="Current workflow queues" />
          <div className="space-y-1 p-3">
            <AttentionButton title="Upcoming renewals" detail={`${dueWithin30.length} due within 30 days`} action="Expiring memberships opened" onAction={onAction} />
            <AttentionButton title="Overdue memberships" detail={`${overdueMemberships.length} records with unpaid balances`} action="Expiring memberships opened" onAction={onAction} />
            <AttentionButton title="Pending registrations" detail={`${pendingRegistrations.length} require review`} action="Pending registrations opened" onAction={onAction} />
            <AttentionButton title="Attendance sync queue" detail={`${pendingSync.length} pending or failed records`} action="Sync queue opened" onAction={onAction} />
          </div>
          <p className="border-t border-[var(--border)] px-5 py-3 text-[11px] text-[var(--text-muted)]">Expenses, partial transaction allocations, and live scanner connectivity are not available in the current frontend data model.</p>
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

function PaymentRow({ payment, membership }: { key: string; payment: PaymentRecord; membership?: Membership }) {
  return <tr><td className="px-4 py-3 text-[var(--text-muted)]">{payment.date}</td><td className="px-4 py-3">{payment.category ?? "Membership"}</td><td className="px-4 py-3"><span className="block font-medium">{membership?.customer ?? payment.serviceName ?? payment.reference}</span><span className="text-[11px] text-[var(--text-muted)]">{payment.reference || payment.id}</span></td><td className="px-4 py-3 text-[var(--text-muted)]">{payment.method}</td><td className="px-4 py-3 font-semibold">{formatPHP(payment.amount)}</td></tr>;
}

function SectionHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p></div>{action && onAction && <button onClick={onAction} className="shrink-0 text-xs font-semibold text-[var(--accent)]">{action} <ArrowUpRight size={13} className="inline" /></button>}</div>;
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="mb-4"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p></div>{children}</section>;
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
