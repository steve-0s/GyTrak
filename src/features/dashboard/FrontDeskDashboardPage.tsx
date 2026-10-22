import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { branchAnalytics } from "../../data/mockData";
import PeakActivityCard from "../../components/shared/PeakActivityCard";
import { useGymData } from "../../contexts/GymDataContext";
import { membershipDueState } from "../../lib/membership";

type Props = { branch?: string; onAction: (message: string) => void };

const php = (amount: number) => `₱${amount.toLocaleString("en-PH")}`;

export default function FrontDeskDashboardPage({ branch: assignedBranch = "Makati Central", onAction }: Props) {
  const { registrations, visits, walkIns, memberships } = useGymData();
  const branch = assignedBranch;
  const attendanceRecords = visits.filter((record) => record.branch === branch).map((record) => ({ customer: record.customer, branch: record.branch, in: record.timeIn, out: record.timeOut, type: record.type, source: record.source.startsWith("RFID") ? "RFID" : "Manual", status: record.status }));
  const branchWalkIns = walkIns.filter((visit) => visit.branch === branch);
  const analytics = branchAnalytics[branch as keyof typeof branchAnalytics] ?? branchAnalytics["Makati Central"];
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [date, setDate] = useState("Today");
  const filteredAttendance = useMemo(
    () =>
      attendanceRecords.filter(
        (record) =>
          record.customer.toLowerCase().includes(search.toLowerCase()) &&
          (status === "All statuses" || record.status === status),
      ),
    [search, status],
  );
  const paidRevenue = branchWalkIns
    .filter((visit) => visit.payment === "Paid")
    .reduce((total, visit) => total + visit.fee, 0);
  const todayWalkIns = branchWalkIns.filter((visit) => visit.date === "Oct 20, 2026");
  const uniqueVisitors = new Set(attendanceRecords.map((record) => record.customer)).size;
  const dueMemberships = memberships.filter((item) => item.branch === branch && membershipDueState(item.end).key !== "upcoming");
  const stats = [
    ["Check-ins today", String(attendanceRecords.length), "Confirmed events"],
    ["Unique visitors", String(uniqueVisitors), "Distinct customers"],
    ["Active members", String(memberships.filter((membership) => membership.status === "Active" && membership.branch === branch).length), "Assigned branch records"],
    ["Walk-ins today", String(todayWalkIns.length), `${php(paidRevenue)} collected`],
    ["Payment follow-up", String(dueMemberships.length), "Manual reminders only"],
    ["Pending actions", String(attendanceRecords.filter((record) => record.status === "Checked in").length), "Open operational records"],
  ];

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">
            {branch}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Today’s branch activity and tasks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onAction("Walk-in registration opened")}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"
          >
            <Plus size={16} /> Register Walk-in
          </button>
          <button
            onClick={() => onAction("New customer form opened")}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--bg)]"
          >
            Add customer
          </button>
          <button
            onClick={() => onAction("Attendance correction opened")}
            className="hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--bg)] sm:block"
          >
            Attendance correction
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map(([label, value, context]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4"
          >
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              {context}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PeakActivityCard branch={branch as keyof typeof branchAnalytics} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="font-semibold">Today’s Attendance</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Confirmed check-ins by hour · {branch}
              </p>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Local time</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.hourly}
                margin={{ top: 8, right: 4, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
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
                <Bar
                  dataKey="visits"
                  name="Check-ins"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h3 className="font-semibold">Scanner & Sync</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Branch operational health
              </p>
            </div>
            <button
              onClick={() => onAction("Scanner status refreshed")}
              className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg)]"
              aria-label="Refresh scanner status"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="space-y-1 p-3">
            {[
              ["Scanner 1 · Time-in", "Online", "text-[var(--accent)]"],
              ["Scanner 2 · Time-out", "Online", "text-[var(--accent)]"],
              ["Sync queue", "2 Pending", "text-amber-500"],
              ["Failed events", "0 Failed", "text-[var(--accent)]"],
            ].map((item) => (
              <div
                key={item[0]}
                className="flex items-center justify-between rounded-lg px-3 py-3 text-xs"
              >
                <span className="text-[var(--text-muted)]">{item[0]}</span>
                <span className={`font-semibold ${item[2]}`}>
                  <i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  {item[1]}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] px-5 py-3 text-[11px] text-[var(--text-muted)]">
            Last successful sync today at 09:45 AM
            <button
              onClick={() => onAction("Detailed sync status opened")}
              className="ml-2 font-semibold text-[var(--accent)]"
            >
              Details
            </button>
          </div>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold">Recent Attendance</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Attendance events for your assigned branch
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5">
              <Search size={14} className="text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(event: { target: { value: string } }) =>
                  setSearch(event.target.value)
                }
                placeholder="Search customer"
                className="w-32 bg-transparent text-xs outline-none placeholder:text-[var(--text-muted)]"
              />
            </label>
            <label className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5">
              <CalendarDays size={14} className="text-[var(--text-muted)]" />
              <select
                value={date}
                onChange={(event: { target: { value: string } }) =>
                  setDate(event.target.value)
                }
                className="bg-transparent text-xs outline-none"
              >
                <option>Today</option>
                <option>Yesterday</option>
                <option>This week</option>
              </select>
            </label>
            <select
              value={status}
              onChange={(event: { target: { value: string } }) =>
                setStatus(event.target.value)
              }
              className="rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-xs outline-none"
            >
              <option>All statuses</option>
              <option>Checked in</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                {[
                  "Customer",
                  "Time-in",
                  "Time-out",
                  "Visit type",
                  "Source",
                  "Status",
                  "",
                ].map((label) => (
                  <th key={label} className="px-5 py-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredAttendance.map((record) => (
                <tr key={record.customer} className="hover:bg-[var(--bg)]">
                  <td className="px-5 py-3.5 font-semibold">
                    {record.customer}
                  </td>
                  <td className="px-5 py-3.5 text-[var(--text-muted)]">
                    {record.in}
                  </td>
                  <td className="px-5 py-3.5 text-[var(--text-muted)]">
                    {record.out}
                  </td>
                  <td className="px-5 py-3.5">{record.type}</td>
                  <td className="px-5 py-3.5 text-[var(--text-muted)]">
                    {record.source}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`font-medium ${record.status === "Checked in" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() =>
                        onAction(`${record.customer} attendance details opened`)
                      }
                      className="font-semibold text-[var(--accent)]"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAttendance.length === 0 && (
            <EmptyState text="No attendance records match your filters." />
          )}
        </div>
        <div className="flex justify-end border-t border-[var(--border)] px-5 py-3">
          <button
            onClick={() => onAction("Complete attendance page opened")}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
          >
            View all attendance <ArrowUpRight size={14} />
          </button>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h3 className="font-semibold">Walk-in Activity</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {branchWalkIns.length} visits today · {php(paidRevenue)} collected
              </p>
            </div>
            <button
              onClick={() => onAction("Walk-in registration opened")}
              className="text-xs font-semibold text-[var(--accent)]"
            >
              Register
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-xs">
              <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 font-semibold">Fee</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {branchWalkIns.map((visit) => (
                  <tr key={visit.customer}>
                    <td className="px-5 py-3.5 font-medium">
                      {visit.customer}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                      {visit.timeIn}
                    </td>
                    <td className="px-5 py-3.5">{php(visit.fee)}</td>
                    <td
                      className={`px-5 py-3.5 font-medium ${visit.payment === "Paid" ? "text-[var(--accent)]" : "text-amber-500"}`}
                    >
                      {visit.payment}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="font-semibold">Membership Attention</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Records requiring a follow-up
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {dueMemberships.map((item) => (
              <div
                key={item.customer}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <div>
                  <p className="text-xs font-semibold">{item.customer}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Due {item.end} · {membershipDueState(item.end).label}
                  </p>
                </div>
                <button
                  onClick={() => onAction(`${item.customer} payment follow-up opened`)}
                  className="shrink-0 text-xs font-semibold text-[var(--accent)]"
                >
                  Follow up
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="font-semibold">Registration Review</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              QR submissions waiting for staff review
            </p>
          </div>
          <span className="rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
            {registrations.filter((item) => item.branch === branch && ["Pending", "Needs correction"].includes(item.status)).length} pending
          </span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {registrations.filter((item) => item.branch === branch && ["Pending", "Needs correction"].includes(item.status)).slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{item.name}</p><span className="text-[11px] text-amber-500">{item.possibleCustomerIds.length ? "Possible duplicate" : item.status}</span></div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{item.reference} · {new Date(item.submittedAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</p>
              <button onClick={() => onAction("Customers opened")} className="mt-3 text-xs font-semibold text-[var(--accent)]">Review in Customers</button>
            </div>
          ))}
          {registrations.filter((item) => item.branch === branch && ["Pending", "Needs correction"].includes(item.status)).length === 0 && <p className="p-3 text-xs text-[var(--text-muted)]">No profile registrations are waiting for review.</p>}
        </div>
      </section>
      <p className="mt-5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <CheckCircle2 size={14} className="text-[var(--accent)]" />
        Sample branch data for prototype use · Registration does not create
        attendance automatically.
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-xs text-[var(--text-muted)]">
      {text}
    </div>
  );
}
