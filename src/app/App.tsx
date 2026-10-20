import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  ClipboardList,
  Plus,
  Radio,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminDashboardPage from "../features/dashboard/AdminDashboardPage";
import FrontDeskDashboardPage from "../features/dashboard/FrontDeskDashboardPage";
import CustomersPage from "../features/customers/CustomersPage";
import WalkInsMembershipsPage from "../features/walk-ins/WalkInsMembershipsPage";
import AttendancePage from "../features/attendance/AttendancePage";
import RFIDKeyfobsPage from "../features/rfid/RFIDKeyfobsPage";
import ScannerSyncPage from "../features/scanner-sync/ScannerSyncPage";
import AdministrationPages from "../features/administration/AdministrationPages";
import ReportsPage from "../features/reports/ReportsPage";
import QRRegistrationPage from "../features/registrations/QRRegistrationPage";
import CoachesPage from "../features/coaches/CoachesPage";
import {
  activity,
  adminNavGroups,
  attendance,
  chartData,
  branches as branchRecords,
  frontDeskNavGroups,
  mockMetrics,
} from "../data/mockData";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import RoleLayout from "../layouts/RoleLayout";
import PageContainer from "../components/layout/PageContainer";

const icons = {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarCheck,
  UserRoundPlus,
  Dumbbell,
  Radio,
  ChartNoAxesCombined,
  Building2,
  UserCog,
  ClipboardList,
  Settings,
  ScanLine,
};

const pagePaths: Record<string, string> = {
  Dashboard: "/",
  Customers: "/customers",
  Coaches: "/coaches",
  "Walk-ins & Memberships": "/walk-ins-memberships",
  Attendance: "/attendance",
  "RFID Keyfobs": "/rfid-keyfobs",
  "Scanner and Sync Status": "/scanner-sync",
  Branches: "/branches",
  "Front Desk Accounts": "/front-desk-accounts",
  "Audit Logs": "/audit-logs",
  Settings: "/settings",
  Reports: "/reports",
  "Branch Reports": "/branch-reports",
};

function activePageFromPath(pathname: string) {
  return Object.entries(pagePaths).find(([, path]) => path === pathname)?.[0] ?? "Dashboard";
}

function App() {
  const { role, isAdmin, switchRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const [active, setActive] = useState(() => activePageFromPath(window.location.pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [headerVisible, setHeaderVisible] = useState(true);
  const navGroups = isAdmin ? adminNavGroups : frontDeskNavGroups;
  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let previousScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 8 || currentScrollY < previousScrollY) {
        setHeaderVisible(true);
      } else if (currentScrollY > previousScrollY) {
        setHeaderVisible(false);
      }
      previousScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  if (window.location.pathname.startsWith("/register"))
    return <QRRegistrationPage />;
  const handleRoleSwitch = () => {
    switchRole();
    setActive("Dashboard");
    window.history.pushState({}, "", "/");
    setMenuOpen(false);
  };
  const selectPage = (page: string) => {
    setActive(page);
    window.history.pushState({}, "", pagePaths[page] ?? "/");
    setMenuOpen(false);
  };
  useEffect(() => {
    const onPopState = () => setActive(activePageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    const adminOnly = ["Branches", "Front Desk Accounts", "Audit Logs", "Settings"];
    if (!isAdmin && adminOnly.includes(active)) {
      setActive("Dashboard");
      window.history.replaceState({}, "", "/");
    }
  }, [active, isAdmin]);
  const changeTheme = setTheme;

  return (
    <RoleLayout role={role} theme={theme}>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-[var(--border)] px-7">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)]">
            <Activity size={19} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">GyTrak</p>
            <p className="text-[11px] uppercase tracking-[.18em] text-[var(--text-muted)]">
              Operations
            </p>
          </div>
        </div>
        <div className="px-4 pt-7">
          <nav className="mt-1 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-muted)]">
                  {group.label}
                </p>
                <div className="mt-2 space-y-1">
                  {group.items.map((item) => {
                    const Icon = icons[item.icon as keyof typeof icons];
                    const selected = active === item.label;
                    return (
                      <button
                        key={item.label}
                        onClick={() => selectPage(item.label)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${selected ? "bg-[var(--accent-subtle)] font-semibold text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
                      >
                        <Icon size={18} strokeWidth={selected ? 2.4 : 1.8} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">System status</span>
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--accent)]">
                <i className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Online
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
              All scanners are connected and synced.
            </p>
          </div>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header
          className={`sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 transition-transform duration-300 ease-out sm:px-8 ${headerVisible ? "translate-y-0" : "-translate-y-full"}`}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
            <time
              dateTime={now.toISOString()}
              className="max-w-[13rem] truncate text-xs font-medium tracking-wide text-[var(--text-muted)] sm:max-w-none sm:text-sm"
            >
              {new Intl.DateTimeFormat("en-PH", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: "Asia/Manila",
              }).format(now)}{" "}
              <span className="text-[11px] font-normal opacity-70">· Manila time</span>
            </time>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => showNotice("No new notifications")}
              aria-label="Notifications"
              className="relative rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg)]"
            >
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
            </button>
            <div className="hidden h-7 w-px bg-[var(--border)] sm:block" />
            <button
                  onClick={handleRoleSwitch}
              className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 text-left hover:bg-[var(--bg)]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-subtle)] text-xs font-bold text-[var(--accent)]">
                JD
              </span>
              <span className="hidden sm:block">
                <span className="block text-xs font-semibold">
                  Jordan Davis
                </span>
                <span className="block text-[11px] text-[var(--text-muted)]">
                  {role} · Switch role
                </span>
              </span>
              <ChevronDown size={14} className="text-[var(--text-muted)]" />
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="border-b border-[var(--border)] bg-[var(--surface)] p-4 lg:hidden">
            <div className="grid grid-cols-2 gap-1">
              {navGroups
                .flatMap((group) => group.items)
                .map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      selectPage(item.label);
                    }}
                    className="rounded-lg px-3 py-2 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--bg)]"
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        )}
        <PageContainer>
          {active === "Customers" ? (
            <CustomersPage isAdmin={isAdmin} onAction={showNotice} />
          ) : active === "Coaches" ? (
            <CoachesPage isAdmin={isAdmin} onAction={showNotice} />
          ) : active === "Walk-ins & Memberships" ? (
            <WalkInsMembershipsPage
              isAdmin={isAdmin}
              onAction={showNotice}
              initialView="walkins"
            />
          ) : active === "Attendance" ? (
            <AttendancePage isAdmin={isAdmin} onAction={showNotice} />
          ) : active === "RFID Keyfobs" ? (
            <RFIDKeyfobsPage isAdmin={isAdmin} onAction={showNotice} />
          ) : active === "Scanner and Sync Status" ? (
            <ScannerSyncPage isAdmin={isAdmin} onAction={showNotice} />
          ) : active === "Branches" ? (
            <AdministrationPages onAction={showNotice} initialView="branches" theme={theme} onThemeChange={changeTheme} />
          ) : active === "Front Desk Accounts" ? (
            <AdministrationPages onAction={showNotice} initialView="accounts" theme={theme} onThemeChange={changeTheme} />
          ) : active === "Audit Logs" ? (
            <AdministrationPages onAction={showNotice} initialView="audit" theme={theme} onThemeChange={changeTheme} />
          ) : active === "Settings" ? (
            <AdministrationPages onAction={showNotice} initialView="settings" theme={theme} onThemeChange={changeTheme} />
          ) : active === "Reports" || active === "Branch Reports" ? (
            <ReportsPage isAdmin={isAdmin} onAction={showNotice} />
          ) : active !== "Dashboard" ? (
            <PlaceholderPage
              title={active}
              onAction={() => showNotice(`${active} workflow opened`)}
            />
          ) : isAdmin ? (
            <AdminDashboardPage onAction={showNotice} />
          ) : (
            <FrontDeskDashboardPage onAction={showNotice} />
          )}
        </PageContainer>
      </main>
      {notice && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-lg bg-[var(--text)] px-4 py-3 text-sm text-[var(--surface)] shadow-xl">
          <Check size={16} className="text-emerald-400" />
          {notice}
        </div>
      )}
    </RoleLayout>
  );
}

function Dashboard({
  isAdmin,
  onAction,
}: {
  isAdmin: boolean;
  onAction: (message: string) => void;
}) {
  const stats = isAdmin
    ? [
        {
          label: "Total members",
          value: mockMetrics.totalCustomers.toLocaleString("en-PH"),
          change: "+8.2%",
          icon: Users,
        },
        {
          label: "Today's attendance",
          value: String(mockMetrics.confirmedAttendance),
          change: "+12.5%",
          icon: CalendarCheck,
        },
        {
          label: "Active memberships",
          value: String(mockMetrics.activeMemberships),
          change: "+4.6%",
          icon: CreditCard,
        },
        {
          label: "Monthly revenue",
          value: `₱${mockMetrics.collectedWalkInFees.toLocaleString("en-PH")}`,
          change: "+9.8%",
          icon: ChartNoAxesCombined,
        },
      ]
    : [
        { label: "Branch members", value: String(branchRecords.find((branch) => branch.name === "Makati Central")?.customers ?? 0), change: "Assigned branch", icon: Users },
        {
          label: "Today's attendance",
          value: String(mockMetrics.confirmedAttendance),
          change: "+11.2%",
          icon: CalendarCheck,
        },
        {
          label: "Active memberships",
          value: String(mockMetrics.activeMemberships),
          change: "+3.1%",
          icon: CreditCard,
        },
        {
          label: "Walk-in revenue",
          value: `₱${mockMetrics.collectedWalkInFees.toLocaleString("en-PH")}`,
          change: "+7.4%",
          icon: ChartNoAxesCombined,
        },
      ];
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">
            {isAdmin ? "All branches" : "Makati Central"}
          </p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Here’s your gym at a glance.
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            A clear view of what needs your attention today.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAction("Report exported as CSV")}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--bg)]"
          >
            Export report
          </button>
          <button
            onClick={() => onAction("New customer form opened")}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] shadow-sm hover:bg-[var(--accent-hover)]"
          >
            <Plus size={16} /> Add customer
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, change, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-[var(--text-muted)]">{label}</p>
              <span className="rounded-lg bg-[var(--accent-subtle)] p-2 text-[var(--accent)]">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
              <ArrowUpRight size={13} />
              {change}
              <span className="font-normal text-[var(--text-muted)]">
                vs last month
              </span>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="font-semibold">Attendance overview</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Total visits across all locations
              </p>
            </div>
            <button className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]">
              Last 7 days <ChevronDown size={13} />
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 4, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="visits" x1="0" x2="0" y1="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent)"
                      stopOpacity={0.22}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
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
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fill="url(#visits)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="font-semibold">Recent activity</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Latest updates from your team
              </p>
            </div>
            <button className="text-xs font-semibold text-[var(--accent)]">
              View all
            </button>
          </div>
          <div className="space-y-5">
            {activity.map((item, index) => (
              <div key={item.name} className="flex gap-3">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${index % 2 ? "bg-amber-50 text-amber-700" : "bg-[var(--accent-subtle)] text-[var(--accent)]"}`}
                >
                  {item.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {item.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <h3 className="font-semibold">Live attendance</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Today’s latest check-ins and check-outs
            </p>
          </div>
          <button
            onClick={() => onAction("Attendance records opened")}
            className="hidden items-center gap-1 text-xs font-semibold text-[var(--accent)] sm:flex"
          >
            View attendance <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-[var(--bg)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-5 py-3 font-semibold sm:px-6">Customer</th>
                <th className="px-5 py-3 font-semibold">Branch</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Time</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {attendance.map((person) => (
                <tr key={person.name} className="hover:bg-[var(--bg)]">
                  <td className="px-5 py-3.5 font-medium sm:px-6">
                    {person.name}
                  </td>
                  <td className="px-5 py-3.5 text-[var(--text-muted)]">
                    {person.branch}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                      {person.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--text-muted)]">
                    {person.time}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${person.status === "Checked in" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
                    >
                      <i
                        className={`h-1.5 w-1.5 rounded-full ${person.status === "Checked in" ? "bg-[var(--accent)]" : "bg-stone-400"}`}
                      />
                      {person.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onAction(`${person.name}'s record opened`)}
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--border)]"
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <ShieldCheck size={20} className="text-[var(--accent)]" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Offline sync is healthy</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Last synced today at 09:45 AM · 0 pending records
          </p>
        </div>
        <button
          onClick={() => onAction("Sync check complete")}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--bg)]"
        >
          Check sync
        </button>
      </div>
    </>
  );
}

function PlaceholderPage({
  title,
  onAction,
}: {
  title: string;
  onAction: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
          <Radio size={25} />
        </div>
        <h2 className="mt-5 text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          This workspace is ready for your {title.toLowerCase()} workflows. Add
          records, review activity, and keep your branch operations moving.
        </p>
        <button
          onClick={onAction}
          className="mt-6 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"
        >
          Open workspace
        </button>
      </div>
    </div>
  );
}

export default App;
