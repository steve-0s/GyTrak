import type { Role } from "../types";

export type RouteRole = Role | "Public";
export type BranchScope = "all" | "assigned" | "public";
export type RouteMeta = { label: string; path: string; roles: RouteRole[]; branchScope: BranchScope; group: string; icon?: string };

export const appRoutes: RouteMeta[] = [
  { label: "Dashboard", path: "/", roles: ["Admin", "Front Desk"], branchScope: "assigned", group: "Overview", icon: "LayoutDashboard" },
  { label: "Customers", path: "/customers", roles: ["Admin", "Front Desk"], branchScope: "assigned", group: "Operations", icon: "Users" },
  { label: "QR Registrations", path: "/qr-registrations", roles: ["Admin", "Front Desk"], branchScope: "assigned", group: "Operations", icon: "ClipboardList" },
  { label: "Walk-ins & Memberships", path: "/walk-ins-memberships", roles: ["Admin", "Front Desk"], branchScope: "assigned", group: "Operations", icon: "CreditCard" },
  { label: "Coaches", path: "/coaches", roles: ["Admin", "Front Desk"], branchScope: "assigned", group: "Operations", icon: "Dumbbell" },
  { label: "Attendance", path: "/attendance", roles: ["Admin", "Front Desk"], branchScope: "assigned", group: "Operations", icon: "CalendarCheck" },
  { label: "RFID Keyfobs", path: "/rfid-keyfobs", roles: ["Admin", "Front Desk"], branchScope: "assigned", group: "Operations", icon: "Radio" },
  { label: "Scanner and Sync Status", path: "/scanner-sync", roles: ["Front Desk"], branchScope: "assigned", group: "Monitoring", icon: "ScanLine" },
  { label: "Branches", path: "/branches", roles: ["Admin"], branchScope: "all", group: "Administration", icon: "Building2" },
  { label: "Reports", path: "/reports", roles: ["Admin"], branchScope: "all", group: "Business", icon: "ChartNoAxesCombined" },
  { label: "Branch Reports", path: "/branch-reports", roles: ["Front Desk"], branchScope: "assigned", group: "Reports", icon: "ChartNoAxesCombined" },
  { label: "Front Desk Accounts", path: "/front-desk-accounts", roles: ["Admin"], branchScope: "all", group: "Administration", icon: "UserCog" },
  { label: "QR Codes", path: "/qr-codes", roles: ["Admin"], branchScope: "all", group: "Administration", icon: "ScanLine" },
  { label: "Audit Logs", path: "/audit-logs", roles: ["Admin"], branchScope: "all", group: "Administration", icon: "ClipboardList" },
  { label: "Settings", path: "/settings", roles: ["Admin", "Front Desk"], branchScope: "assigned", group: "Administration", icon: "Settings" },
];

export const pagePaths = Object.fromEntries(appRoutes.map((route) => [route.label, route.path])) as Record<string, string>;

export function activePageFromPath(pathname: string) {
  return Object.entries(pagePaths).find(([, path]) => path === pathname)?.[0] ?? "Dashboard";
}

export function routeForPage(page: string) { return appRoutes.find((route) => route.label === page); }
export function canAccessPage(page: string, role: Role, assignedBranch?: string) {
  const route = routeForPage(page);
  if (!route || !route.roles.includes(role)) return page === "Dashboard";
  return role !== "Front Desk" || route.branchScope !== "assigned" || Boolean(assignedBranch);
}
export function getNavigationGroups(role: Role, assignedBranch?: string) {
  const grouped = new Map<string, RouteMeta[]>();
  appRoutes.filter((route) => route.roles.includes(role) && (role !== "Front Desk" || route.branchScope !== "assigned" || Boolean(assignedBranch))).forEach((route) => grouped.set(route.group, [...(grouped.get(route.group) ?? []), route]));
  return [...grouped.entries()].map(([label, items]) => ({ label, items }));
}

export const publicRoutes = {
  profileRegistration: "/register/profile",
  walkInCheckIn: "/register/walk-in",
};
