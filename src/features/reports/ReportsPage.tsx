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
import { branchAnalytics } from "../../data/mockData";
import { useGymData } from "../../contexts/GymDataContext";

type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void };

export default function ReportsPage({ isAdmin, branch: assignedBranch = "Makati Central", onAction }: Props) {
  const { branches: branchRecords, visits, walkIns, memberships, payments, auditLogs } = useGymData();
  const branches = ["All branches", ...branchRecords.map((item) => item.name)];
  const [category, setCategory] = useState("Attendance");
  const [range, setRange] = useState("Last 7 days");
  const [branch, setBranch] = useState(
    isAdmin ? "All branches" : assignedBranch,
  );
  const [query, setQuery] = useState("");
  const factor =
    range === "Last 7 days" ? 1 : range === "Last 30 days" ? 3.8 : 11.2;
  const selectedBranch = branchRecords.filter((item) => item.status === "Active" && (branch === "All branches" || item.name === branch)).map((item) => {
    const branchVisits = visits.filter((visit) => visit.branch === item.name);
    const branchWalkIns = walkIns.filter((visit) => visit.branch === item.name);
    const branchMemberships = memberships.filter((membership) => membership.branch === item.name);
    return { branch: item.name, visits: branchVisits.length, members: branchMemberships.filter((membership) => membership.status === "Active").length, walkIns: branchWalkIns.length, revenue: payments.filter((payment) => branchMemberships.some((membership) => membership.id === payment.membershipId)).reduce((sum, payment) => sum + payment.amount, 0) };
  });
  const scopedWalkIns = walkIns.filter(
    (visit) => branch === "All branches" || visit.branch === branch,
  );
  const scopedAttendance = visits.filter(
    (event) => branch === "All branches" || event.branch === branch,
  );
  const reportMetrics = {
    uniqueVisitors: new Set(scopedAttendance.map((event) => event.customerId)).size,
    manualCorrections: auditLogs.filter(
      (log) => log.action === "Attendance correction" && (branch === "All branches" || log.branch === branch),
    ).length,
  };
  const membershipStatus = ["Active", "Pending", "Expired", "Suspended"].map((name, index) => ({ name, value: memberships.filter((membership) => membership.status === name).length, color: ["#60A5FA", "#FBBF24", "#9CA3AF", "#F87171"][index] }));
  const planData = Array.from(new Set(memberships.map((membership) => membership.plan))).map((name) => ({ name, value: memberships.filter((membership) => membership.plan === name && membership.status === "Active").length }));
  const scopedTrend = branch === "All branches"
    ? Object.values(branchAnalytics).reduce(
        (combined, analytics) => combined.map((point, index) => ({
          ...point,
          visits: point.visits + analytics.trend[index].visits,
          revenue: point.revenue + analytics.trend[index].revenue,
        })),
        branchAnalytics["Quezon Avenue"].trend.map((point) => ({ ...point, visits: 0, revenue: 0 })),
      )
    : branchAnalytics[branch as keyof typeof branchAnalytics].trend;
  const summary = useMemo(
    () => ({
      visits: Math.round(
        selectedBranch.reduce((sum, item) => sum + item.visits, 0) * factor,
      ),
      revenue: Math.round(
        selectedBranch.reduce((sum, item) => sum + item.revenue, 0) * factor,
      ),
      members: selectedBranch.reduce((sum, item) => sum + item.members, 0),
      walkIns: Math.round(
        selectedBranch.reduce((sum, item) => sum + item.walkIns, 0) * factor,
      ),
    }),
    [selectedBranch, factor],
  );
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
            ["Recorded revenue", summary.revenue],
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
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
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
        <button
          onClick={exportReport}
          className="flex items-center gap-2 self-start rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] xl:self-auto"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
          <span className="text-xs text-[var(--text-muted)]">Report</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="bg-transparent text-xs font-medium outline-none"
          >
            <option>Attendance</option>
            <option>Memberships</option>
            <option>Walk-ins</option>
            <option>Revenue and payments</option>
            <option>Branch performance</option>
            <option>System operations</option>
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
          </select>
        </label>
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
      {category === "Branch performance" ? (
        <BranchReport rows={selectedBranch} query={query} setQuery={setQuery} />
      ) : category === "Memberships" ? (
        <MembershipReport membershipStatus={membershipStatus} planData={planData} />
      ) : category === "Walk-ins" ? (
        <WalkInReport summary={summary} visits={scopedWalkIns} />
      ) : category === "Revenue and payments" ? (
        <RevenueReport data={scopedTrend} />
      ) : category === "System operations" ? (
        <SystemReport
          corrections={reportMetrics.manualCorrections}
          failedSyncs={scopedAttendance.filter((event) => event.sync === "Failed").length}
          pendingSyncs={scopedAttendance.filter((event) => event.sync === "Pending").length}
          auditCount={auditLogs.filter((log) => branch === "All branches" || log.branch === branch || log.branch === "All branches").length}
        />
      ) : (
        <AttendanceReport
          data={scopedTrend}
          query={query}
          setQuery={setQuery}
          uniqueVisitors={reportMetrics.uniqueVisitors}
          manualCorrections={reportMetrics.manualCorrections}
        />
      )}
    </div>
  );
}

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
function RevenueReport({ data }: { data: typeof branchAnalytics["Makati Central"]["trend"] }) {
  return (
    <Chart title="Revenue trends" subtitle="Collected payments only · PHP">
      <div className="h-72">
        <ResponsiveContainer>
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
        <table className="w-full min-w-[560px] text-left text-xs">
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
