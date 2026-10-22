export type { Role } from "../types"
import { membershipDueState } from "../lib/membership"

export const branches = [
  { id: "makati-central", name: "Makati Central", location: "Makati City, Metro Manila", status: "Active", customers: 684, memberships: 512, visits: 348, revenue: 84240, frontDesk: 4 },
  { id: "bgc-high-street", name: "BGC High Street", location: "Taguig City, Metro Manila", status: "Active", customers: 716, memberships: 604, visits: 302, revenue: 73180, frontDesk: 3 },
  { id: "cebu-it-park", name: "Cebu IT Park", location: "Cebu City, Cebu", status: "Active", customers: 546, memberships: 448, visits: 198, revenue: 48620, frontDesk: 2 },
  { id: "quezon-avenue", name: "Quezon Avenue", location: "Quezon City, Metro Manila", status: "Inactive", customers: 0, memberships: 0, visits: 0, revenue: 0, frontDesk: 0 },
] as const

export const customers = [
  { id: "CUS-10482", name: "Maya Santos", phone: "+63 917 555 0142", email: "maya.santos@email.com", type: "Member", status: "Active", branch: "Makati Central", registered: "Jan 12, 2026", lastVisit: "Today, 09:42 AM", plan: "Annual Membership", endDate: "Jan 12, 2027", keyfob: "RF-00841" },
  { id: "CUS-10477", name: "Ava Rivera", phone: "+63 917 555 0188", email: "ava.rivera@email.com", type: "Member", status: "Active", branch: "BGC High Street", registered: "Jan 09, 2026", lastVisit: "Today, 09:18 AM", plan: "Quarterly Membership", endDate: "Dec 18, 2026", keyfob: "RF-00796" },
  { id: "CUS-10462", name: "Luis Moreno", phone: "+63 917 555 0114", email: "luis.moreno@email.com", type: "Walk-in", status: "None", branch: "Makati Central", registered: "Oct 20, 2026", lastVisit: "Today, 09:31 AM" },
  { id: "CUS-10441", name: "Noah Patel", phone: "+63 917 555 0139", email: "noah.patel@email.com", type: "Member", status: "Expired", branch: "Cebu IT Park", registered: "Jun 02, 2025", lastVisit: "Today, 08:56 AM", plan: "Monthly Membership", endDate: "Oct 12, 2026" },
  { id: "CUS-10424", name: "Sofia Kim", phone: "+63 917 555 0193", email: "sofia.kim@email.com", type: "Member", status: "Pending", branch: "BGC High Street", registered: "Oct 19, 2026", lastVisit: "Today, 08:44 AM", plan: "Monthly Membership", endDate: "Oct 26, 2026" },
  { id: "CUS-10398", name: "Rina Velasco", phone: "+63 917 555 0160", email: "rina.velasco@email.com", type: "Walk-in", status: "None", branch: "Makati Central", registered: "Oct 18, 2026", lastVisit: "Yesterday, 06:20 PM" },
] as const

export const keyfobs = [
  { id: "KF-00841", uid: "RFID-••••-1841", customer: "Maya Santos", branch: "Makati Central", status: "Assigned", date: "Jan 12, 2026" },
  { id: "KF-00796", uid: "RFID-••••-0796", customer: "Ava Rivera", branch: "BGC High Street", status: "Assigned", date: "Sep 18, 2026" },
  { id: "KF-00902", uid: "RFID-••••-0902", customer: "—", branch: "Makati Central", status: "Unassigned", date: "—" },
  { id: "KF-00672", uid: "RFID-••••-0672", customer: "—", branch: "Cebu IT Park", status: "Deactivated", date: "Aug 05, 2026" },
] as const

export const walkIns = [
  { id: "VIS-20841", customer: "Luis Moreno", customerId: "CUS-10462", branch: "Makati Central", date: "Oct 20, 2026", timeIn: "09:31 AM", timeOut: "—", fee: 250, payment: "Paid", method: "Cash", status: "Checked in", attendanceId: "ATT-90217" },
  { id: "VIS-20840", customer: "Rina Velasco", customerId: "CUS-10398", branch: "Makati Central", date: "Oct 20, 2026", timeIn: "Not checked in", timeOut: "—", fee: 250, payment: "Pending", method: "—", status: "Registered" },
  { id: "VIS-20812", customer: "Owen Cruz", customerId: "CUS-10344", branch: "BGC High Street", date: "Oct 19, 2026", timeIn: "07:26 AM", timeOut: "08:58 AM", fee: 200, payment: "Paid", method: "GCash", status: "Completed" },
  { id: "VIS-20798", customer: "Jamie Lim", customerId: "CUS-10311", branch: "Makati Central", date: "Oct 18, 2026", timeIn: "06:20 PM", timeOut: "07:45 PM", fee: 250, payment: "Paid", method: "Cash", status: "Completed" },
] as const

// The authoritative record of actual gym visits. Walk-in transactions remain
// separate for payment and registration purposes, but a checked-in walk-in
// points to this record through walkInId.
export const visitRecords = [
  { id: "ATT-90218", customerId: "CUS-10482", customer: "Maya Santos", branch: "Makati Central", date: "Oct 20, 2026", timeIn: "09:42 AM", timeOut: "—", type: "Member", source: "RFID · Scanner 1", status: "Checked in", sync: "Synced" },
  { id: "ATT-90217", customerId: "CUS-10462", customer: "Luis Moreno", branch: "Makati Central", date: "Oct 20, 2026", timeIn: "09:31 AM", timeOut: "—", type: "Walk-in", source: "Manual", status: "Checked in", sync: "Pending", walkInId: "VIS-20841" },
  { id: "ATT-90216", customerId: "CUS-10477", customer: "Ava Rivera", branch: "BGC High Street", date: "Oct 20, 2026", timeIn: "09:18 AM", timeOut: "10:46 AM", type: "Member", source: "RFID · Scanner 1", status: "Completed", sync: "Synced" },
  { id: "ATT-90215", customerId: "CUS-10441", customer: "Noah Patel", branch: "Cebu IT Park", date: "Oct 20, 2026", timeIn: "08:56 AM", timeOut: "10:12 AM", type: "Member", source: "RFID · Scanner 1", status: "Completed", sync: "Failed", reason: "Network timeout during upload" },
  { id: "ATT-90198", customerId: "CUS-10424", customer: "Sofia Kim", branch: "BGC High Street", date: "Oct 19, 2026", timeIn: "08:44 AM", timeOut: "10:20 AM", type: "Member", source: "Manual", status: "Completed", sync: "Synced" },
  { id: "ATT-90197", customerId: "CUS-10344", customer: "Owen Cruz", branch: "BGC High Street", date: "Oct 19, 2026", timeIn: "07:26 AM", timeOut: "08:58 AM", type: "Walk-in", source: "Manual", status: "Completed", sync: "Synced", walkInId: "VIS-20812" },
  { id: "ATT-90196", customerId: "CUS-10311", customer: "Jamie Lim", branch: "Makati Central", date: "Oct 18, 2026", timeIn: "06:20 PM", timeOut: "07:45 PM", type: "Walk-in", source: "Manual", status: "Completed", sync: "Synced", walkInId: "VIS-20798" },
] as const

export const memberships = [
  { id: "MEM-00814", customer: "Maya Santos", customerId: "CUS-10482", plan: "Annual Membership", start: "Jan 12, 2026", end: "Jan 12, 2027", status: "Active", payment: "Paid", branch: "Makati Central", price: 12000 },
  { id: "MEM-00809", customer: "Ava Rivera", customerId: "CUS-10477", plan: "Quarterly Membership", start: "Sep 18, 2026", end: "Dec 18, 2026", status: "Active", payment: "Paid", branch: "BGC High Street", price: 4200 },
  { id: "MEM-00802", customer: "Sofia Kim", customerId: "CUS-10424", plan: "Monthly Membership", start: "Sep 26, 2026", end: "Oct 26, 2026", status: "Pending", payment: "Pending", branch: "BGC High Street", price: 1800 },
  { id: "MEM-00794", customer: "Noah Patel", customerId: "CUS-10441", plan: "Monthly Membership", start: "Sep 12, 2026", end: "Oct 12, 2026", status: "Expired", payment: "Pending", branch: "Cebu IT Park", price: 1800 },
] as const

export const membershipPayments = [
  { id: "PAY-001", membershipId: "MEM-00814", date: "Jan 12, 2026", amount: 12000, method: "GCash", reference: "GC-120126" },
  { id: "PAY-002", membershipId: "MEM-00809", date: "Sep 18, 2026", amount: 4200, method: "Cash", reference: "Receipt-8841" },
  { id: "PAY-003", membershipId: "MEM-00794", date: "Sep 12, 2026", amount: 1800, method: "Card", reference: "POS-7712" },
] as const

export const membershipDueNotifications = memberships
  .map((membership) => ({
    membershipId: membership.id,
    customer: membership.customer,
    branch: membership.branch,
    dueDate: membership.end,
    ...membershipDueState(membership.end),
  }))
  .filter((notification) => notification.key !== "upcoming")

export const membershipPlans = [
  { name: "Monthly Membership", duration: "1 month", price: 1800, active: true, used: 84 },
  { name: "Quarterly Membership", duration: "3 months", price: 4200, active: true, used: 62 },
  { name: "Annual Membership", duration: "12 months", price: 12000, active: true, used: 116 },
] as const

export const coaches = [
  { id: "COA-021", name: "Ethan Flores", specialty: "Strength & conditioning", branch: "Makati Central", status: "Active", phone: "+63 917 555 0121" },
  { id: "COA-018", name: "Bea Navarro", specialty: "Functional training", branch: "BGC High Street", status: "Active", phone: "+63 917 555 0168" },
  { id: "COA-014", name: "Miguel Santos", specialty: "Mobility & recovery", branch: "Cebu IT Park", status: "Active", phone: "+63 917 555 0190" },
] as const

export const frontDeskAccounts = [
  { name: "Jordan Davis", email: "jordan.davis@gytrak.test", branch: "Makati Central", status: "Active", created: "Jan 05, 2026", activity: "Today, 09:44 AM" },
  { name: "Camille Tan", email: "camille.tan@gytrak.test", branch: "BGC High Street", status: "Active", created: "Feb 12, 2026", activity: "Today, 08:57 AM" },
  { name: "Marco Reyes", email: "marco.reyes@gytrak.test", branch: "Cebu IT Park", status: "Active", created: "Mar 18, 2026", activity: "Yesterday, 06:12 PM" },
  { name: "Leah Cruz", email: "leah.cruz@gytrak.test", branch: "Quezon Avenue", status: "Inactive", created: "Apr 21, 2026", activity: "Oct 10, 2026" },
] as const

export const auditLogs = [
  { time: "Oct 20, 09:42 AM", user: "Jordan Davis", role: "Front Desk", branch: "Makati Central", action: "Attendance correction", record: "ATT-90217", summary: "Adjusted time-in after scanner retry." },
  { time: "Oct 20, 09:18 AM", user: "Camille Tan", role: "Front Desk", branch: "BGC High Street", action: "Membership renewal", record: "MEM-00809", summary: "Renewed quarterly membership." },
  { time: "Oct 19, 04:31 PM", user: "Admin User", role: "Admin", branch: "All branches", action: "Branch update", record: "BR-004", summary: "Deactivated Quezon Avenue branch." },
  { time: "Oct 19, 02:04 PM", user: "Jordan Davis", role: "Front Desk", branch: "Makati Central", action: "Keyfob assignment", record: "KF-00841", summary: "Assigned keyfob to CUS-10482." },
] as const

export const hourlyAttendance = [
  { hour: "6 AM", visits: 4 }, { hour: "7 AM", visits: 8 }, { hour: "8 AM", visits: 15 }, { hour: "9 AM", visits: 22 },
  { hour: "10 AM", visits: 17 }, { hour: "11 AM", visits: 12 }, { hour: "12 PM", visits: 9 }, { hour: "1 PM", visits: 11 },
  { hour: "2 PM", visits: 14 }, { hour: "3 PM", visits: 18 }, { hour: "4 PM", visits: 20 }, { hour: "5 PM", visits: 24 },
]

export const attendanceTrend = [
  { day: "Oct 14", attendance: 214, visits: 214, revenue: 18200 }, { day: "Oct 15", attendance: 268, visits: 268, revenue: 24500 },
  { day: "Oct 16", attendance: 241, visits: 241, revenue: 21900 }, { day: "Oct 17", attendance: 302, visits: 302, revenue: 28700 },
  { day: "Oct 18", attendance: 286, visits: 286, revenue: 26400 }, { day: "Oct 19", attendance: 348, visits: 348, revenue: 32400 },
  { day: "Oct 20", attendance: 326, visits: 326, revenue: 30840 },
]

export const attendanceByMonth = [
  { label: "Jun", visits: 684 },
  { label: "Jul", visits: 742 },
  { label: "Aug", visits: 816 },
  { label: "Sep", visits: 904 },
  { label: "Oct", visits: 1124 },
]

function createBranchAnalytics(attendanceFactor: number, revenueFactor: number) {
  return {
    hourly: hourlyAttendance.map((item) => ({ ...item, visits: Math.round(item.visits * attendanceFactor) })),
    trend: attendanceTrend.map((item) => ({
      ...item,
      attendance: Math.round(item.attendance * attendanceFactor),
      visits: Math.round(item.visits * attendanceFactor),
      revenue: Math.round(item.revenue * revenueFactor),
    })),
    monthly: attendanceByMonth.map((item) => ({ ...item, visits: Math.round(item.visits * attendanceFactor) })),
  };
}

export const branchAnalytics = {
  "Makati Central": createBranchAnalytics(1, 1),
  "BGC High Street": createBranchAnalytics(0.86, 0.87),
  "Cebu IT Park": createBranchAnalytics(0.62, 0.61),
  "Quezon Avenue": createBranchAnalytics(0, 0),
} as const

export const allBranchAnalytics = {
  hourly: hourlyAttendance.map((item, index) => ({
    ...item,
    visits: Object.values(branchAnalytics).reduce((sum, branch) => sum + branch.hourly[index].visits, 0),
  })),
  trend: attendanceTrend.map((item, index) => ({
    ...item,
    attendance: Object.values(branchAnalytics).reduce((sum, branch) => sum + branch.trend[index].attendance, 0),
    visits: Object.values(branchAnalytics).reduce((sum, branch) => sum + branch.trend[index].visits, 0),
    revenue: Object.values(branchAnalytics).reduce((sum, branch) => sum + branch.trend[index].revenue, 0),
  })),
  monthly: attendanceByMonth.map((item, index) => ({
    ...item,
    visits: Object.values(branchAnalytics).reduce((sum, branch) => sum + branch.monthly[index].visits, 0),
  })),
} as const

export const membershipStatus = [
  { name: "Active", value: 2104, color: "#60A5FA" }, { name: "Pending", value: 84, color: "#FBBF24" },
  { name: "Expired", value: 418, color: "#9CA3AF" }, { name: "Suspended", value: 41, color: "#F87171" },
]

export const planDistribution = [
  { name: "Monthly", value: 842 },
  { name: "Quarterly", value: 604 },
  { name: "Annual", value: 658 },
]

export const branchPerformance = branches.map(({ name, visits, memberships, revenue }) => ({
  branch: name, visits, members: memberships, walkIns: name === "Makati Central" ? 42 : name === "BGC High Street" ? 29 : name === "Cebu IT Park" ? 17 : 0, revenue,
}))

export const dashboardAttendance = visitRecords.map((event) => ({
  customer: event.customer,
  branch: event.branch,
  in: event.timeIn,
  out: event.timeOut,
  type: event.type,
  source: event.source.startsWith("RFID") ? "RFID" : "Manual",
  status: event.status,
}))

export const dashboardWalkIns = walkIns.map((visit) => ({
  customer: visit.customer,
  branch: visit.branch,
  date: visit.date,
  time: visit.timeIn,
  fee: visit.fee,
  payment: visit.payment,
}))

export const membershipAttention = [
  { customer: "Nina Garcia", plan: "Monthly", issue: "Expires Oct 24", action: "Renew" },
  { customer: "Paul Reyes", plan: "Quarterly", issue: "Expired Oct 18", action: "Review" },
  { customer: "Rina Velasco", plan: "Monthly", issue: "Pending activation", action: "Activate" },
]

export const mockMetrics = {
  totalCustomers: customers.length,
  activeMemberships: memberships.filter((membership) => membership.status === "Active").length,
  confirmedAttendance: visitRecords.length,
  uniqueVisitors: new Set(visitRecords.map((event) => event.customer)).size,
  walkIns: walkIns.length,
  collectedWalkInFees: walkIns.filter((visit) => visit.payment === "Paid").reduce((sum, visit) => sum + visit.fee, 0),
  pendingActions: visitRecords.filter((event) => event.sync === "Pending" || event.sync === "Failed").length,
}

export const activity = [
  {
    name: "Maya Santos",
    action: "Checked in",
    time: "09:42 AM",
    type: "member",
  },
  {
    name: "Luis Moreno",
    action: "Walk-in registered",
    time: "09:31 AM",
    type: "walk-in",
  },
  {
    name: "Ava Rivera",
    action: "Membership renewed",
    time: "09:18 AM",
    type: "renewal",
  },
  {
    name: "Noah Patel",
    action: "Checked out",
    time: "08:56 AM",
    type: "member",
  },
];
export const attendance = [
  {
    name: "Maya Santos",
    branch: "Makati Central",
    type: "Member",
    time: "09:42 AM",
    status: "Checked in",
  },
  {
    name: "Luis Moreno",
    branch: "Makati Central",
    type: "Walk-in",
    time: "09:31 AM",
    status: "Checked in",
  },
  {
    name: "Ava Rivera",
    branch: "BGC High Street",
    type: "Member",
    time: "09:18 AM",
    status: "Checked out",
  },
  {
    name: "Noah Patel",
    branch: "Cebu IT Park",
    type: "Member",
    time: "08:56 AM",
    status: "Checked out",
  },
  {
    name: "Sofia Kim",
    branch: "BGC High Street",
    type: "Member",
    time: "08:44 AM",
    status: "Checked in",
  },
];

export const chartData = [
  { day: "Mon", visits: 214 },
  { day: "Tue", visits: 268 },
  { day: "Wed", visits: 241 },
  { day: "Thu", visits: 302 },
  { day: "Fri", visits: 286 },
  { day: "Sat", visits: 348 },
  { day: "Sun", visits: 198 },
];
