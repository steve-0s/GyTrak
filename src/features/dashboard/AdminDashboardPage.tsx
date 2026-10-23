import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
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
import { branchAnalytics } from "../../mockdata";
import PeakActivityCard from "../../components/shared/PeakActivityCard";
import { useGymData } from "../../contexts/GymDataContext";
import { membershipDueState } from "../../lib/membership";

type Props = { onAction: (message: string) => void };

const rangeOptions = [
  { value: "7d", label: "Last 7 days", factor: 1 },
  { value: "30d", label: "Last 30 days", factor: 3.8 },
  { value: "90d", label: "Last 90 days", factor: 11.2 },
];
const formatPHP = (value: number) => `₱${value.toLocaleString("en-PH")}`;
const formatNumber = (value: number) => value.toLocaleString("en-PH");

export default function AdminDashboardPage({ onAction }: Props) {
  const { branches: branchRecords, customers, memberships, visits, walkIns, payments, registrations } = useGymData();
  const branches = ["All Branches", ...branchRecords.map((item) => item.name)];
  const branchRows = useMemo(() => branchRecords.filter((item) => item.status === "Active").map((item) => {
    const branchVisits = visits.filter((visit) => visit.branch === item.name);
    const branchWalkIns = walkIns.filter((visit) => visit.branch === item.name);
    const branchMemberships = memberships.filter((membership) => membership.branch === item.name);
    return { branch: item.name, customers: customers.filter((customer) => customer.branch === item.name).length, visits: branchVisits.length, unique: new Set(branchVisits.map((visit) => visit.customerId)).size, memberships: branchMemberships.filter((membership) => membership.status === "Active").length, walkIns: branchWalkIns.length, revenue: payments.filter((payment) => branchMemberships.some((membership) => membership.id === payment.membershipId)).reduce((sum, payment) => sum + payment.amount, 0), expiring: branchMemberships.filter((membership) => { const key = membershipDueState(membership.end).key; return key === "soon" || key === "today"; }).length };
  }), [branchRecords, customers, memberships, visits, walkIns, payments]);
  const membershipStatus = ["Active", "Pending", "Expired", "Suspended"].map((name, index) => ({ name, value: memberships.filter((membership) => membership.status === name).length, color: ["#60A5FA", "#FBBF24", "#9CA3AF", "#F87171"][index] }));
  const [branch, setBranch] = useState("All Branches");
  const [range, setRange] = useState("7d");
  const selectedRange =
    rangeOptions.find((option) => option.value === range) ?? rangeOptions[0];
  const visibleBranches =
    branch === "All Branches"
      ? branchRows
      : branchRows.filter((row) => row.branch === branch);
  const scale = selectedRange.factor;
  const totals = useMemo(
    () =>
      visibleBranches.reduce(
        (total, row) => ({
          visits: total.visits + row.visits,
          unique: total.unique + row.unique,
          memberships: total.memberships + row.memberships,
          walkIns: total.walkIns + row.walkIns,
          revenue: total.revenue + row.revenue,
          expiring: total.expiring + row.expiring,
        }),
        {
          visits: 0,
          unique: 0,
          memberships: 0,
          walkIns: 0,
          revenue: 0,
          expiring: 0,
        },
      ),
    [visibleBranches],
  );
  const expiringSoon = visibleBranches.reduce((sum, row) => sum + row.expiring, 0);
  const pendingRegistrations = registrations.filter((registration) => ["Pending", "Needs correction"].includes(registration.status)).length;
  const pendingSyncEvents = visits.filter((visit) => visit.sync === "Pending" || visit.sync === "Failed").length;
  const reminderFollowUps = memberships.filter((membership) => {
    const days = Math.round((new Date(membership.end).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
    return membership.status !== "Suspended" && days <= 7;
  }).length;
  const cards = [
    [
      "Total customers",
      formatNumber(visibleBranches.reduce((sum, row) => sum + row.customers, 0)),
      "Selected branch records",
      false,
    ],
    [
      "Active memberships",
      formatNumber(Math.round(totals.memberships)),
      "74.1% of customers",
      false,
    ],
    [
      range === "7d" ? "Today's visits" : "Visits in period",
      formatNumber(Math.round((totals.visits * scale) / 1)),
      "Confirmed attendance",
      true,
    ],
    [
      "Walk-ins",
      formatNumber(Math.round(totals.walkIns * scale)),
      "Confirmed visits only",
      false,
    ],
    [
      "Recorded revenue",
      formatPHP(Math.round(totals.revenue * scale)),
      "Collected payments",
      false,
    ],
    [
      "Expiring soon",
      formatNumber(expiringSoon),
      "Within the next 30 days",
      false,
    ],
  ];
  const filteredTrend = branch === "All Branches"
    ? Object.values(branchAnalytics).reduce(
        (combined, analytics) => combined.map((point, index) => ({
          ...point,
          attendance: point.attendance + analytics.trend[index].attendance,
          revenue: point.revenue + analytics.trend[index].revenue,
        })),
        branchAnalytics["Quezon Avenue"].trend.map((point) => ({ ...point, attendance: 0, revenue: 0 })),
      )
    : branchAnalytics[branch as keyof typeof branchAnalytics].trend;

  return (
    <div>
      <div className="page-header page-header--actions">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Overview of gym operations and business performance.
          </p>
        </div>
        <div className="page-header-actions">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <CalendarDays size={15} className="text-[var(--text-muted)]" />
            <select
              aria-label="Date range"
              value={range}
              onChange={(event: { target: { value: string } }) =>
                setRange(event.target.value)
              }
              className="bg-transparent text-sm outline-none"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <select
              aria-label="Branch"
              value={branch}
              onChange={(event: { target: { value: string } }) =>
                setBranch(event.target.value)
              }
              className="bg-transparent text-sm outline-none"
            >
              {branches.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => onAction("Dashboard data refreshed")}
            aria-label="Refresh dashboard"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text-muted)] hover:bg-[var(--bg)]"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map(([label, value, context, positive]) => (
          <div
            key={label}
            className="summary-card"
          >
            <p className="summary-card-label">{label}</p>
            <p className="summary-card-value">{value}</p>
            <p className={`summary-card-context ${positive ? "summary-card-context--positive" : ""}`}>
              {context}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PeakActivityCard branch={branch as "All Branches" | keyof typeof branchAnalytics} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <ChartCard
          title="Attendance Trends"
          subtitle={`${selectedRange.label} · confirmed attendance events`}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredTrend}
                margin={{ top: 12, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  name="Visits"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--accent)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard
          title="Recorded Revenue Over Time"
          subtitle="Collected payments · PHP"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredTrend}
                margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  tickFormatter={(value) => `₱${Number(value) / 1000}k`}
                />
                <Tooltip
                  formatter={(value: unknown) => formatPHP(Number(value ?? 0))}
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="revenue"
                  name="Collected"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h3 className="font-semibold">Branch Performance</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Ranked operational performance for the selected period
              </p>
            </div>
            <button
              onClick={() => onAction("Branch details opened")}
              className="text-xs font-semibold text-[var(--accent)]"
            >
              View branches
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table data-table--compact min-w-[760px]">
              <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  {[
                    "Branch",
                    "Total visits",
                    "Unique visitors",
                    "Active members",
                    "Walk-ins",
                    "Revenue",
                    "Expiring",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {visibleBranches.map((row, index) => (
                  <tr key={row.branch} className="hover:bg-[var(--bg)]">
                    <td className="px-4 py-3.5 font-semibold">
                      <button
                        onClick={() => onAction(`${row.branch} details opened`)}
                        className="text-left hover:text-[var(--accent)]"
                      >
                        {index + 1}. {row.branch}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      {formatNumber(Math.round(row.visits * scale))}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--text-muted)]">
                      {formatNumber(Math.round(row.unique * scale))}
                    </td>
                    <td className="px-4 py-3.5">
                      {formatNumber(row.memberships)}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--text-muted)]">
                      {formatNumber(Math.round(row.walkIns * scale))}
                    </td>
                    <td className="px-4 py-3.5 font-medium">
                      {formatPHP(Math.round(row.revenue * scale))}
                    </td>
                    <td className="px-4 py-3.5 text-amber-400">
                      {row.expiring}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <ChartCard
          title="Membership Status"
          subtitle="Current membership records"
        >
          <div className="flex items-center gap-5">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={membershipStatus}
                    innerRadius={52}
                    outerRadius={75}
                    dataKey="value"
                    stroke="var(--surface)"
                    strokeWidth={3}
                  >
                    {membershipStatus.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {membershipStatus.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 text-xs"
                >
                  <i
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[var(--text-muted)]">{item.name}</span>
                  <strong className="ml-auto">
                    {formatNumber(item.value)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            <p className="text-xs font-semibold">Needs attention</p>
            <button
              onClick={() => onAction("Expiring memberships opened")}
              className="mt-2 flex w-full items-center justify-between text-left text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              {expiringSoon} memberships need payment follow-up <ArrowUpRight size={14} />
            </button>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h3 className="font-semibold">Recent Activity</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Latest changes across the selected workspace
              </p>
            </div>
            <button
              onClick={() => onAction("Activity log opened")}
              className="text-xs font-semibold text-[var(--accent)]"
            >
              View all
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table data-table--compact min-w-[600px]">
              <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Activity</th>
                  <th className="px-5 py-3 font-semibold">Record</th>
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-5 py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {[
                  [
                    "New membership",
                    "Ava Rivera",
                    "BGC High Street",
                    "9 min ago",
                  ],
                  [
                    "Walk-in visit",
                    "Luis Moreno",
                    "Makati Central",
                    "18 min ago",
                  ],
                  [
                    "Keyfob assigned",
                    "Maya Santos",
                    "Makati Central",
                    "31 min ago",
                  ],
                  [
                    "Attendance correction",
                    "Noah Patel",
                    "Cebu IT Park",
                    "1 hr ago",
                  ],
                ].map((row) => (
                  <tr key={row.join("-")}>
                    <td className="px-5 py-3.5 font-medium">{row[0]}</td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                      {row[1]}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                      {row[2]}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                      {row[3]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="font-semibold">Needs Attention</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Items that may need a staff action
            </p>
          </div>
          <div className="space-y-1 p-3">
            {[
              ["Memberships expiring soon", `${reminderFollowUps} across all branches`, "Review"],
              ["Pending registrations", `${pendingRegistrations} require review`, "Review"],
              ["Sync queue", `${pendingSyncEvents} records pending retry`, "Open"],
            ].map((item) => (
              <button
                key={item[0]}
                onClick={() => onAction(`${item[0]} opened`)}
                className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-[var(--bg)]"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                <span className="flex-1">
                  <span className="block text-xs font-semibold">{item[0]}</span>
                  <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                    {item[1]}
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-[var(--accent)]">
                  {item[2]}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <p className="mt-5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <CheckCircle2 size={14} className="text-[var(--accent)]" />
        Sample data for prototype use · Figures are derived from the current
        mock workspace.
      </p>
    </div>
  );
}

function ChartCard({
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
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
