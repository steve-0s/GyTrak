import { useEffect, useRef, useState } from "react";
import {
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
  MoreHorizontal,
  ClipboardList,
  Plus,
  Radio,
  ScanLine,
  Settings,
  ShieldCheck,
  UserCog,
  UserRoundPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminDashboardPage from "../roles/admin/screens/DashboardScreen";
import FrontDeskDashboardPage from "../roles/front-desk/screens/DashboardScreen";
import CustomersPage from "../roles/front-desk/screens/CustomersScreen";
import WalkInsMembershipsPage from "../roles/front-desk/screens/WalkInsScreen";
import RFIDKeyfobsPage from "../roles/front-desk/screens/RFIDScreen";
import ScannerSyncPage from "../roles/front-desk/screens/ScannerSyncScreen";
import BranchesScreen from "../roles/admin/screens/BranchesScreen";
import StaffScreen from "../roles/admin/screens/StaffScreen";
import AuditLogsScreen from "../roles/admin/screens/AuditLogsScreen";
import ReportsPage from "../shared/screens/ReportsScreen";
import QRRegistrationPage from "../shared/screens/QRRegistrationScreen";
import QRSettingsPage from "../roles/admin/screens/QRSettingsScreen";
import SettingsPage from "../roles/admin/screens/SettingsScreen";
import CoachesPage from "../roles/front-desk/screens/CoachesScreen";
import MembershipRemindersPage from "../features/reminders/MembershipRemindersPage";
import { ForgotPasswordPage, InitialSetupPage, LoginPage } from "../shared/screens/AuthScreens";
import {
  activity,
  attendance,
  chartData,
  branches as branchRecords,
  mockMetrics,
} from "../mockdata";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import RoleLayout from "../shared/layouts/RoleLayout";
import PageContainer from "../shared/layouts/PageContainer";
import Sidebar from "../shared/components/Sidebar";
import Header from "../shared/components/Header";
import { activePageFromPath, canAccessPage, getNavigationGroups, pagePaths, publicRoutes } from "./routes";

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
  Bell,
};

function App() {
  const { role, isAdmin, switchRole, isAuthenticated, account, signOut, changeEmail, changePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const [active, setActive] = useState(() => activePageFromPath(window.location.pathname));
  const [menuOpen, setMenuOpen] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [headerVisible, setHeaderVisible] = useState(true);
  const [customerCreateSignal, setCustomerCreateSignal] = useState(0);
  const [walkInCreateSignal, setWalkInCreateSignal] = useState(0);
  const [membershipCreateSignal, setMembershipCreateSignal] = useState(0);
  const [attendanceSignal, setAttendanceSignal] = useState(0);
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [openMembershipId, setOpenMembershipId] = useState<string | null>(null);
  const drawerWasOpen = useRef(false);
  const navGroups = getNavigationGroups(role, account?.branch);
  const currentPage = canAccessPage(active, role, account?.branch) ? active : "Dashboard";
  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const updateSidebarForViewport = () => {
      setIsDesktop(desktop.matches);
      setMenuOpen(desktop.matches);
    };
    updateSidebarForViewport();
    desktop.addEventListener("change", updateSidebarForViewport);
    return () => desktop.removeEventListener("change", updateSidebarForViewport);
  }, []);
  useEffect(() => {
    if (isDesktop) {
      drawerWasOpen.current = false;
      return;
    }
    if (menuOpen) {
      drawerWasOpen.current = true;
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("#app-sidebar nav button")?.focus());
    } else if (drawerWasOpen.current) {
      drawerWasOpen.current = false;
      document.querySelector<HTMLButtonElement>('[aria-controls="app-sidebar"]')?.focus();
    }
  }, [isDesktop, menuOpen]);
  useEffect(() => {
    if (isDesktop || !menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const bodyPaddingRight = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isDesktop, menuOpen]);
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
  const handleRoleSwitch = () => {
    switchRole();
    setActive("Dashboard");
    window.history.pushState({}, "", "/");
    setMenuOpen(isDesktop);
  };
  const selectPage = (page: string) => {
    if (!canAccessPage(page, role, account?.branch)) return;
    setActive(page);
    window.history.pushState({}, "", pagePaths[page] ?? "/");
    setMenuOpen(isDesktop);
  };
  const handleAction = (message: string) => {
    const destinations: Array<[string, string]> = [
      ["New customer form opened", "Customers"],
      ["Customers opened", "Customers"],
      ["Attendance records opened", "Walk-ins & Memberships"],
      ["Attendance correction opened", "Walk-ins & Memberships"],
      ["Manual attendance form opened", "Walk-ins & Memberships"],
      ["Complete attendance page opened", "Walk-ins & Memberships"],
      ["Scanner status opened", "Scanner and Sync Status"],
      ["Detailed sync status opened", "Scanner and Sync Status"],
      ["Walk-in registration opened", "Walk-ins & Memberships"],
      ["Membership creation opened", "Walk-ins & Memberships"],
      ["Memberships opened", "Walk-ins & Memberships"],
      ["Expiring memberships opened", "Walk-ins & Memberships"],
      ["Membership reminders opened", "Membership Reminders"],
      ["Keyfob assignment opened", "RFID Keyfobs"],
      ["Front Desk account list opened", "Front Desk Accounts"],
      ["Branch details opened", "Branches"],
      ["Activity log opened", "Audit Logs"],
      ["Reports opened", isAdmin ? "Reports" : "Branch Reports"],
    ];
    if (message === "New customer form opened") setCustomerCreateSignal((value) => value + 1);
    if (message === "Walk-in registration opened") setWalkInCreateSignal((value) => value + 1);
    if (message === "Membership creation opened") setMembershipCreateSignal((value) => value + 1);
    if (["Attendance records opened", "Attendance correction opened", "Manual attendance form opened", "Complete attendance page opened"].includes(message)) setAttendanceSignal((value) => value + 1);
    if (message.endsWith(" attendance details opened")) { setAttendanceSignal((value) => value + 1); selectPage("Walk-ins & Memberships"); }
    if (message.endsWith(" payment follow-up opened")) selectPage("Walk-ins & Memberships");
    if (message.endsWith(" details opened")) selectPage("Branches");
    if (message === "Memberships expiring soon opened") selectPage("Walk-ins & Memberships");
    if (message === "Membership reminders opened") selectPage("Membership Reminders");
    if (message === "Pending registrations opened") selectPage("Customers");
    if (message === "Sync queue opened") selectPage("Scanner and Sync Status");
    const destination = destinations.find(([trigger]) => message === trigger)?.[1];
    if (destination) selectPage(destination);
    showNotice(message);
  };
  useEffect(() => {
    const onPopState = () => setActive(activePageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (!canAccessPage(active, role, account?.branch)) {
      setActive("Dashboard");
      window.history.replaceState({}, "", "/");
    }
  }, [active, role, account?.branch]);
  const changeTheme = setTheme;

  if (window.location.pathname === publicRoutes.profileRegistration) return <QRRegistrationPage mode="profile" />;
  if (window.location.pathname === publicRoutes.walkInCheckIn) return <QRRegistrationPage mode="walk-in" />;
  if (!isAuthenticated) {
    if (window.location.pathname === "/setup") return <InitialSetupPage />;
    if (window.location.pathname === "/forgot-password") return <ForgotPasswordPage />;
    return <LoginPage />;
  }

  return (
    <RoleLayout role={role} theme={theme}>
      <div className="grid min-h-screen grid-cols-1 grid-rows-[5rem_auto] lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Header role={role} accountName={account?.name} branch={account?.branch} now={now} visible={headerVisible} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((open) => !open)} onRoleSwitch={handleRoleSwitch} onSignOut={signOut} onNavigate={selectPage} />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden={!menuOpen || isDesktop}
          aria-label="Dismiss navigation backdrop"
          onClick={() => setMenuOpen(false)}
          className={`fixed inset-x-0 bottom-0 top-20 z-40 bg-black/40 transition-opacity duration-250 ease-in-out motion-reduce:transition-none lg:hidden ${menuOpen && !isDesktop ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
        <Sidebar navGroups={navGroups} currentPage={currentPage} onNavigate={selectPage} icons={icons} open={menuOpen} />
        <main className="min-w-0 lg:col-start-2 lg:row-start-2">
        <PageContainer>
          {currentPage === "Customers" ? (
            <CustomersPage isAdmin={isAdmin} branch={account?.branch} onAction={handleAction} openCreateSignal={customerCreateSignal} openCustomerId={openCustomerId} />
          ) : currentPage === "Coaches" ? (
            <CoachesPage isAdmin={isAdmin} branch={account?.branch} onAction={handleAction} />
          ) : currentPage === "Walk-ins & Memberships" ? (
            <WalkInsMembershipsPage
              isAdmin={isAdmin}
              branch={account?.branch}
              onAction={handleAction}
              onOpenCustomer={(customerId) => { setOpenCustomerId(customerId); selectPage("Customers"); }}
              openMembershipId={openMembershipId}
              onMembershipOpened={() => setOpenMembershipId(null)}
              initialView="overview"
              openWalkInSignal={walkInCreateSignal}
              openMembershipSignal={membershipCreateSignal}
              openAttendanceSignal={attendanceSignal}
              onAttendanceSignalConsumed={() => setAttendanceSignal(0)}
            />
          ) : currentPage === "Membership Reminders" ? (
            <MembershipRemindersPage isAdmin={isAdmin} branch={account?.branch} onAction={handleAction} />
          ) : currentPage === "RFID Keyfobs" ? (
            <RFIDKeyfobsPage isAdmin={isAdmin} branch={account?.branch} onAction={handleAction} />
          ) : currentPage === "Scanner and Sync Status" ? (
            <ScannerSyncPage isAdmin={isAdmin} branch={account?.branch} onAction={handleAction} />
          ) : currentPage === "Branches" ? (
            <BranchesScreen onAction={handleAction} />
          ) : currentPage === "Front Desk Accounts" ? (
            <StaffScreen onAction={handleAction} />
          ) : currentPage === "QR Codes" ? (
            <QRSettingsPage />
          ) : currentPage === "Audit Logs" ? (
            <AuditLogsScreen onAction={handleAction} />
          ) : currentPage === "Settings" ? (
            <SettingsPage onAction={handleAction} theme={theme} onThemeChange={changeTheme} account={account} onChangeEmail={changeEmail} onChangePassword={changePassword} />
          ) : currentPage === "Reports" || currentPage === "Branch Reports" ? (
            <ReportsPage isAdmin={isAdmin} branch={account?.branch} onAction={handleAction} />
          ) : currentPage !== "Dashboard" ? (
            <PlaceholderPage
              title={currentPage}
              onAction={() => handleAction(`${currentPage} workflow opened`)}
            />
          ) : isAdmin ? (
            <AdminDashboardPage onAction={handleAction} onOpenMembership={(membershipId) => { setOpenMembershipId(membershipId); selectPage("Walk-ins & Memberships"); }} />
          ) : (
            <FrontDeskDashboardPage branch={account?.branch} onAction={handleAction} onOpenMembership={(membershipId) => { setOpenMembershipId(membershipId); selectPage("Walk-ins & Memberships"); }} />
          )}
        </PageContainer>
        </main>
      </div>
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
            onClick={() => downloadCsv("gytrak-dashboard-report.csv", [["Metric", "Value"], ...stats.map((item) => [item.label, item.value])])}
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
            <button onClick={() => onAction("Attendance records opened")} className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]">
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
            <button onClick={() => onAction("Activity log opened")} className="text-xs font-semibold text-[var(--accent)]">
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

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default App;
