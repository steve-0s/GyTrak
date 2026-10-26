import { useMemo, useState, type ReactNode } from "react";
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
import { CalendarDays, Download, Search } from "lucide-react";
import { formatPHP as php } from "../../lib/utils";
import { branchAnalytics } from "../../mockdata";
import { useGymData } from "../../contexts/GymDataContext";
import { isCollectedPayment, membershipOutstandingBalance } from "../../lib/financial";

type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void };

export default function ReportsPage({ isAdmin, branch: assignedBranch = "Makati Central", onAction }: Props) {
  const { branches: branchRecords, customers, visits, walkIns, memberships, payments, coaches, frontDeskAccounts, auditLogs, reminderRecords } = useGymData();
  const branches = ["All branches", ...branchRecords.map((item) => item.name)];
  const collectedRevenue = payments.filter((payment) => (payment.status ?? "Paid") === "Paid" && payment.category !== "Promo discount").reduce((sum, payment) => sum + payment.amount, 0);
  const outstandingBalance = memberships.reduce((sum, membership) => sum + (membership.outstandingBalance ?? 0), 0);
  const [category, setCategory] = useState("Overview");
  const [range, setRange] = useState("Last 7 days");
  const [branch, setBranch] = useState(
    isAdmin ? "All branches" : assignedBranch,
  );
  const [query, setQuery] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const referenceDate = businessToday();
  const period = getReportPeriod(range, referenceDate, customStart, customEnd);
  const inPeriod = (value: string) => { const date = parseReportDate(value, referenceDate); return date >= period.start && date <= period.end; };
  const selectedBranch = branchRecords.filter((item) => item.status === "Active" && (branch === "All branches" || item.name === branch)).map((item) => {
    const branchVisits = visits.filter((visit) => visit.branch === item.name && inPeriod(visit.date));
    const branchWalkIns = walkIns.filter((visit) => visit.branch === item.name && inPeriod(visit.date));
    const branchMemberships = memberships.filter((membership) => membership.branch === item.name);
    const branchPayments = payments.filter((payment) => (payment.branch ?? branchMemberships.find((membership) => membership.id === payment.membershipId)?.branch) === item.name && isCollectedPayment(payment) && inPeriod(payment.date));
    return { branch: item.name, visits: branchVisits.length, members: branchMemberships.filter((membership) => membership.status === "Active").length, walkIns: branchWalkIns.length, revenue: branchPayments.reduce((sum, payment) => sum + payment.amount, 0) };
  });
  const scopedWalkIns = walkIns.filter(
    (visit) => (branch === "All branches" || visit.branch === branch) && inPeriod(visit.date),
  );
  const scopedAttendance = visits.filter(
    (event) => (branch === "All branches" || event.branch === branch) && inPeriod(event.date),
  );
  const scopedMemberships = memberships.filter((membership) => branch === "All branches" || membership.branch === branch);
  const scopedPayments = payments.filter((payment) => (branch === "All branches" || payment.branch === branch || scopedMemberships.some((membership) => membership.id === payment.membershipId)) && inPeriod(payment.date));
  const paidPayments = scopedPayments.filter(isCollectedPayment);
  const pendingWalkIns = scopedWalkIns.filter((visit) => visit.payment === "Pending");
  const pendingMemberships = scopedMemberships
    .filter((membership) => membershipOutstandingBalance(membership) > 0)
    .map((membership) => ({ ...membership, price: membershipOutstandingBalance(membership) }));
  const reportMetrics = {
    uniqueVisitors: new Set(scopedAttendance.map((event) => event.customerId)).size,
    manualCorrections: auditLogs.filter(
      (log) => log.action === "Attendance correction" && (branch === "All branches" || log.branch === branch),
    ).length,
  };
  const membershipStatus = ["Active", "Pending", "Expired", "Suspended"].map((name, index) => ({ name, value: scopedMemberships.filter((membership) => membership.status === name).length, color: ["#60A5FA", "#FBBF24", "#9CA3AF", "#F87171"][index] }));
  const planData = Array.from(new Set(scopedMemberships.map((membership) => membership.plan))).map((name) => ({ name, value: scopedMemberships.filter((membership) => membership.plan === name && membership.status === "Active").length }));
  const attendanceTrend = groupByDate(scopedAttendance, (event) => event.date, (items) => items.length);
  const summary = { visits: scopedAttendance.length, revenue: paidPayments.reduce((sum, payment) => sum + payment.amount, 0), members: scopedMemberships.filter((membership) => membership.status === "Active").length, walkIns: scopedWalkIns.length, outstanding: scopedMemberships.reduce((sum, membership) => sum + (membership.outstandingBalance ?? 0), 0) };
  const exportReport = () => {
    const rows =
      category === "Branch performance"
        ? [
            ["Branch", "Visits", "Active memberships", "Walk-ins", "Revenue"],
            ...selectedBranch.map((item) => [
              item.branch,
              item.visits,
              item.members,
              item.walkIns,
              item.revenue,
            ]),
          ]
        : [
            ["Metric", "Value"],
            ["Total check-ins", summary.visits],
            ["Collected payments", php(summary.revenue)],
            ["Outstanding balance", php(summary.outstanding)],
            ["Active memberships", summary.members],
            ["Walk-ins", summary.walkIns],
          ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `gytrak-${category.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onAction("CSV report exported");
  };
  return (
    <div>
      <div className="page-header page-header--actions">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">
            {isAdmin ? "Business intelligence" : assignedBranch}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            {isAdmin ? "Reports & Analytics" : "Branch Reports"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Use focused reports to answer operational and business questions.
          </p>
        </div>
        <div className="page-header-actions">
        <button
          onClick={exportReport}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]"
        >
          <Download size={16} /> Export CSV
        </button>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
          <span className="text-xs text-[var(--text-muted)]">Report</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="bg-transparent text-xs font-medium outline-none"
          >
            <option>Overview</option><option>Financial</option><option>Memberships</option><option>Membership reminders</option><option>Attendance</option><option>Customers &amp; Sales</option><option>Coaches &amp; Staff</option><option>Operations</option><option>Branch Comparison</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
          <CalendarDays size={14} className="text-[var(--text-muted)]" />
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="bg-transparent text-xs outline-none"
          >
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Custom</option>
          </select>
        </label>
        {range === "Custom" && <><label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs">From <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="bg-transparent" /></label><label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs">To <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="bg-transparent" /></label></>}
        {isAdmin ? (
          <select
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-xs outline-none"
          >
            {branches.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        ) : (
          <span className="flex items-center rounded-lg bg-[var(--accent-subtle)] px-3 py-2 text-xs font-medium text-[var(--accent)]">
            Assigned branch · {assignedBranch}
          </span>
        )}
      </div>
      {category === "Overview" ? <OverviewReport summary={summary} paidPayments={paidPayments} pendingWalkIns={pendingWalkIns} pendingMemberships={pendingMemberships} memberships={scopedMemberships} visits={scopedAttendance} newMembershipCount={scopedMemberships.filter((membership) => inPeriod(membership.start)).length} /> : category === "Financial" ? (
        <RevenueReport payments={paidPayments} pendingWalkIns={pendingWalkIns} pendingMemberships={pendingMemberships} />
      ) : category === "Branch Comparison" ? (
        <BranchReport rows={selectedBranch} query={query} setQuery={setQuery} />
      ) : category === "Memberships" ? (
        <MembershipReport membershipStatus={membershipStatus} planData={planData} />
      ) : category === "Membership reminders" ? (
        <ReminderReport memberships={scopedMemberships} customers={customers} records={reminderRecords.filter((record) => branch === "All branches" || record.branch === branch)} />
      ) : category === "Attendance" ? (
        <ActualAttendanceReport data={attendanceTrend} visits={scopedAttendance} />
      ) : category === "Customers & Sales" ? (
        <CustomerSalesReport customers={customers.filter((customer) => branch === "All branches" || customer.branch === branch)} walkIns={scopedWalkIns} payments={paidPayments} />
      ) : category === "Coaches & Staff" ? (
        <StaffReport coaches={coaches.filter((coach) => branch === "All branches" || coach.branch === branch)} accounts={frontDeskAccounts.filter((account) => branch === "All branches" || account.branch === branch)} payments={paidPayments} />
      ) : category === "Operations" ? (
        <SystemReport
          corrections={reportMetrics.manualCorrections}
          failedSyncs={scopedAttendance.filter((event) => event.sync === "Failed").length}
          pendingSyncs={scopedAttendance.filter((event) => event.sync === "Pending").length}
          auditCount={auditLogs.filter((log) => branch === "All branches" || log.branch === branch || log.branch === "All branches").length}
        />
      ) : null}
    </div>
  );
}

function businessToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
}
function parseReportDate(value: string, reference: Date) {
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  if (!/[T ]\d{1,2}:\d{2}|Z$|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
}
function getReportPeriod(range: string, reference: Date, start: string, end: string) {
  const finish = end ? new Date(`${end}T23:59:59`) : new Date(reference);
  const begin = start
    ? new Date(`${start}T00:00:00`)
    : new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  if (!start) {
    if (range === "This month") begin.setDate(1);
    else if (range === "This week") begin.setDate(begin.getDate() - ((begin.getDay() + 6) % 7));
    else if (range === "Last 30 days") begin.setDate(begin.getDate() - 29);
    else if (range === "Last 90 days") begin.setDate(begin.getDate() - 89);
    else if (range !== "Today" && range !== "Custom") begin.setDate(begin.getDate() - 6);
  }
  return { start: begin, end: range === "Custom" && end ? finish : new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59) };
}
function groupByDate<T>(items: T[], getDate: (item: T) => string, getValue: (items: T[]) => number) {
  return Array.from(new Set(items.map(getDate))).sort((a, b) => parseReportDate(a, new Date()).getTime() - parseReportDate(b, new Date()).getTime()).map((day) => ({ day, visits: getValue(items.filter((item) => getDate(item) === day)) }));
}

function OverviewReport({ summary, paidPayments, pendingWalkIns, pendingMemberships, memberships, visits, newMembershipCount }: { summary: { visits: number; revenue: number; members: number; walkIns: number }; paidPayments: Array<{ amount: number }>; pendingWalkIns: Array<{ fee: number }>; pendingMemberships: Array<{ price: number }>; memberships: Array<{ status: string; start: string; end: string }>; visits: Array<{ customerId: string }>; newMembershipCount: number }) {
  const pending = pendingWalkIns.reduce((sum, item) => sum + item.fee, 0) + pendingMemberships.reduce((sum, item) => sum + item.price, 0);
  const active = memberships.filter((item) => item.status === "Active").length;
  const newMemberships = newMembershipCount;
  const unique = new Set(visits.map((item) => item.customerId)).size;
  return <><div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Collected payments" value={php(summary.revenue)} /><Metric label="Pending amount" value={php(pending)} /><Metric label="Visits" value={String(summary.visits)} /><Metric label="Active memberships" value={String(active)} /></div><ReportTable title="Overview definitions" columns={["Metric", "Value", "Definition"]} rows={[["Walk-in visits", String(summary.walkIns), "Visits in the selected period"],["Unique visitors", String(unique), "Distinct customer IDs in attendance events"],["New memberships", String(newMemberships), "Memberships with a start date in the selected period"],["Paid transactions", String(paidPayments.length), "Payment records marked Paid; pending amounts excluded"]]} /></>;
}

function ActualAttendanceReport({ data, visits }: { data: Array<{ day: string; visits: number }>; visits: Array<{ customer: string; branch: string; date: string; timeIn: string; timeOut: string; status: string }> }) {
  const durations = visits.map((visit) => durationMinutes(visit.timeIn, visit.timeOut)).filter((value): value is number => value !== null);
  return <><div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric label="Check-ins" value={String(visits.length)} /><Metric label="Unique visit records" value={String(new Set(visits.map((item) => item.customer)).size)} /><Metric label="Average duration" value={durations.length ? `${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)} min` : "Not available"} /></div><div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Chart title="Attendance by recorded date" subtitle="Actual attendance events only"><div className="h-64"><ResponsiveContainer><BarChart data={data}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="visits" fill="var(--accent)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></Chart><ReportTable title="Attendance records" columns={["Customer", "Branch", "Date", "Time-in", "Time-out"]} rows={visits.map((item) => [item.customer, item.branch, item.date, item.timeIn, item.timeOut])} /></div></>;
}
function durationMinutes(start: string, end: string) { if (!start || !end || end === "—" || start === "—" || start === "Not checked in") return null; const parse = (value: string) => { const match = value.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!match) return null; let hour = Number(match[1]) % 12; if (match[3].toUpperCase() === "PM") hour += 12; return hour * 60 + Number(match[2]); }; const a = parse(start); const b = parse(end); return a === null || b === null || b < a ? null : b - a; }
function CustomerSalesReport({ customers, walkIns, payments }: { customers: Array<{ name: string; branch: string; type: string; classification?: string; lastVisit: string }>; walkIns: Array<{ customer: string; branch: string; payment: string; fee: number }>; payments: Array<{ amount: number; category?: string }> }) { return <><div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric label="Customers" value={String(customers.length)} /><Metric label="Walk-in visits" value={String(walkIns.length)} /><Metric label="Walk-in collections" value={php(payments.filter((item) => (item.category ?? "Membership") === "Walk-in").reduce((sum, item) => sum + item.amount, 0))} /></div><ReportTable title="Customer directory" columns={["Customer", "Branch", "Type", "Category", "Last visit"]} rows={customers.map((item) => [item.name, item.branch, item.type, item.classification ?? "Not recorded", item.lastVisit])} /></>; }
function ReminderReport({ memberships, customers, records }: { memberships: Array<{ customer: string; customerId: string; branch: string; end: string }>; customers: Array<{ id: string; email: string; phone: string }>; records: Array<{ customerId: string; source: string; channel: string; status: string; attemptedAt: string }> }) { const upcoming = memberships.filter((m) => { const d = new Date(m.end).getTime() - new Date().setHours(0, 0, 0, 0); return d >= 0 && d <= 7 * 86400000; }).length; const overdue = memberships.filter((m) => new Date(m.end).getTime() < new Date().setHours(0, 0, 0, 0)).length; const missing = memberships.filter((m) => { const c = customers.find((x) => x.id === m.customerId); return !c?.email && !c?.phone; }).length; return <><div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric label="Expiring / due soon" value={String(upcoming)} /><Metric label="Overdue follow-up" value={String(overdue)} /><Metric label="Missing contact" value={String(missing)} /></div><ReportTable title="Reminder attempts (simulated, not delivery proof)" columns={["Source", "Channel", "Status", "Attempted"]} rows={records.map((r) => [r.source, r.channel, r.status, new Date(r.attemptedAt).toLocaleDateString("en-PH")])} /></>; }
function StaffReport({ coaches, accounts, payments }: { coaches: Array<{ name: string; branch: string; specialty: string }>; accounts: Array<{ name: string; branch: string; status: string }>; payments: Array<{ category?: string }> }) { return <><div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric label="Coaches" value={String(coaches.length)} /><Metric label="Front Desk accounts" value={String(accounts.length)} /><Metric label="Attributed coaching revenue" value={php(payments.filter((item) => item.category === "Coaching").length ? 0 : 0)} /></div><ReportTable title="Coach directory" columns={["Coach", "Branch", "Specialty"]} rows={coaches.map((item) => [item.name, item.branch, item.specialty])} /><p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-muted)]">Coach-linked sessions, staff hours, payroll, commissions, and attributed revenue are not tracked by the current prototype.</p></>; }

function AttendanceReport({
  data,
  query,
  setQuery,
  uniqueVisitors,
  manualCorrections,
}: {
  data: typeof branchAnalytics["Makati Central"]["trend"];
  query: string;
  setQuery: (value: string) => void;
  uniqueVisitors: number;
  manualCorrections: number;
}) {
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Total check-ins", data.reduce((sum, item) => sum + item.visits, 0)],
          ["Unique visitors", uniqueVisitors],
          ["Manual corrections", manualCorrections],
        ].map(([label, value]) => (
          <Metric key={label} label={label} value={String(value)} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Chart title="Attendance trends" subtitle="Confirmed check-ins by day">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Line
                  dataKey="visits"
                  name="Check-ins"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Chart>
        <ReportTable
          title="Customer attendance history"
          query={query}
          setQuery={setQuery}
          columns={["Customer", "Branch", "Visits", "Last visit"]}
          rows={[
            ["Maya Santos", "Makati Central", "18", "Today, 09:42 AM"],
            ["Ava Rivera", "BGC High Street", "15", "Today, 09:18 AM"],
            ["Noah Patel", "Cebu IT Park", "12", "Today, 08:56 AM"],
          ]}
        />
      </div>
    </>
  );
}
function MembershipReport({ membershipStatus, planData }: { membershipStatus: Array<{ name: string; value: number; color: string }>; planData: Array<{ name: string; value: number }> }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <Chart title="Membership status" subtitle="Current records by status">
        <div className="flex items-center gap-5">
          <div className="h-52 w-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={membershipStatus}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={82}
                >
                  {membershipStatus.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 text-xs">
            {membershipStatus.map((item) => (
              <p key={item.name}>
                <i
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ background: item.color }}
                />
                {item.name}
                <b className="ml-5">{item.value}</b>
              </p>
            ))}
          </div>
        </div>
      </Chart>
      <Chart
        title="Membership plan distribution"
        subtitle="Active membership plans"
      >
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={planData}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar
                dataKey="value"
                name="Memberships"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Chart>
    </div>
  );
}
function WalkInReport({
  summary,
  visits,
}: {
  summary: { walkIns: number; revenue: number };
  visits: Array<{ customerId: string; payment: "Paid" | "Pending"; fee: number }>;
}) {
  const uniqueCustomers = new Set(visits.map((visit) => visit.customerId)).size;
  const paidVisits = visits.filter((visit) => visit.payment === "Paid");
  const pendingVisits = visits.filter((visit) => visit.payment === "Pending");
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Walk-in visits" value={String(summary.walkIns)} />
        <Metric label="Unique walk-in customers" value={String(uniqueCustomers)} />
        <Metric label="Fees collected" value={php(summary.revenue)} />
      </div>
      <ReportTable
        title="Walk-in payment summary"
        columns={["Payment status", "Visits", "Amount", "Definition"]}
        rows={[
          ["Paid", String(paidVisits.length), php(paidVisits.reduce((sum, visit) => sum + visit.fee, 0)), "Included in collected revenue"],
          ["Pending", String(pendingVisits.length), php(pendingVisits.reduce((sum, visit) => sum + visit.fee, 0)), "Not included in collected revenue"],
        ]}
      />
    </>
  );
}
function RevenueReport({ payments, pendingWalkIns, pendingMemberships }: { payments: Array<{ date: string; amount: number; category?: string; serviceName?: string }>; pendingWalkIns: Array<{ customer: string; branch: string; fee: number; date: string }>; pendingMemberships: Array<{ customer: string; branch: string; price: number; start: string }> }) {
  const byCategory = ["Initiation fee", "Monthly dues", "Renewal fee", "Membership", "Walk-in", "Coaching", "Other service"].map((category) => ({ category, amount: payments.filter((payment) => (payment.category ?? "Membership") === category).reduce((sum, payment) => sum + payment.amount, 0) }));
  const trend = Array.from(new Set(payments.map((payment) => payment.date))).map((date) => ({ date, revenue: payments.filter((payment) => payment.date === date).reduce((sum, payment) => sum + payment.amount, 0) }));
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"> <Metric label="Total revenue" value={php(total)} /><Metric label="Paid transactions" value={String(payments.length)} /><Metric label="Average transaction" value={php(payments.length ? total / payments.length : 0)} /><Metric label="Membership revenue" value={php(byCategory[0].amount)} /></div>
      <ReportTable title="Revenue by category" columns={["Category", "Paid transactions", "Collected"]} rows={byCategory.map((item) => [item.category, String(payments.filter((payment) => (payment.category ?? "Membership") === item.category).length), php(item.amount)])} />
      <div className="mt-5"><ReportTable title="Outstanding payment follow-up" columns={["Customer", "Branch", "Type", "Amount", "Date"]} rows={[...pendingWalkIns.map((item) => [item.customer, item.branch, "Walk-in", php(item.fee), item.date]), ...pendingMemberships.map((item) => [item.customer, item.branch, "Membership", php(item.price), item.start])]} /></div>
      <div className="mt-5" />
    <Chart title="Revenue trends" subtitle="Recorded paid transactions only · PHP">
      <div className="h-72">
        <ResponsiveContainer>
          <LineChart data={trend}>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => `₱${Number(value) / 1000}k`}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip formatter={(value: unknown) => php(Number(value))} />
            <Line
              dataKey="revenue"
              name="Collected revenue"
              stroke="var(--accent)"
              strokeWidth={2.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Chart>
    </>
  );
}
function BranchReport({
  rows,
  query,
  setQuery,
}: {
  rows: Array<{ branch: string; visits: number; members: number; walkIns: number; revenue: number }>;
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <ReportTable
      title="Branch performance"
      query={query}
      setQuery={setQuery}
      columns={[
        "Branch",
        "Visits",
        "Active memberships",
        "Walk-ins",
        "Recorded revenue",
      ]}
      rows={rows.map((row) => [
        row.branch,
        String(row.visits),
        String(row.members),
        String(row.walkIns),
        php(row.revenue),
      ])}
    />
  );
}
function SystemReport({
  corrections,
  failedSyncs,
  pendingSyncs,
  auditCount,
}: {
  corrections: number;
  failedSyncs: number;
  pendingSyncs: number;
  auditCount: number;
}) {
  return (
    <ReportTable
      title="System operations"
      columns={["Area", "Status", "Count", "Latest activity"]}
      rows={[
        ["Manual attendance corrections", corrections ? "Review" : "Clear", String(corrections), "From audit history"],
        ["Failed synchronization events", failedSyncs ? "Failed" : "Clear", String(failedSyncs), "From attendance events"],
        ["Pending synchronization events", pendingSyncs ? "Pending" : "Clear", String(pendingSyncs), "From attendance events"],
        ["Audit events", "Recorded", String(auditCount), "From audit history"],
      ]}
    />
  );
}
function Chart({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function ReportTable({
  title,
  query,
  setQuery,
  columns,
  rows,
}: {
  title: string;
  query?: string;
  setQuery?: (value: string) => void;
  columns: string[];
  rows: string[][];
}) {
  const visible = rows.filter(
    (row) =>
      !query || row.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
        <h3 className="font-semibold">{title}</h3>
        {setQuery && (
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search report"
              className="w-32 bg-transparent text-xs outline-none"
            />
          </label>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="data-table data-table--compact min-w-[560px]">
          <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {visible.map((row) => (
              <tr key={row.join("-")}>
                {row.map((cell, index) => (
                  <td
                    key={`${cell}-${index}`}
                    className="px-5 py-3.5 text-[var(--text-muted)]"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-8 text-center text-sm text-[var(--text-muted)]">
            No report rows match the current filters.
          </p>
        )}
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
}: {
  label: string | number;
  value: string;
  key?: string | number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
