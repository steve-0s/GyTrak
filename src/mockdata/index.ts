import type { AuditLog, Coach, Customer, Keyfob, Membership, PaymentRecord, ReminderRecord, VisitRecord, WalkIn } from "../types";
import { membershipPrice } from "../lib/pricing";
import { activity, allBranchAnalytics, attendance, attendanceByMonth, attendanceTrend, auditLogs as seedAuditLogs, branchAnalytics, branchPerformance, branches, chartData, coaches as seedCoaches, customers as seedCustomers, dashboardAttendance, dashboardWalkIns, hourlyAttendance, keyfobs as seedKeyfobs, membershipAttention, membershipPayments as seedPayments, membershipPlans, membershipStatus, memberships as seedMemberships, mockMetrics, planDistribution, visitRecords as seedVisits, walkIns as seedWalkIns, frontDeskAccounts } from "../data/mockData";
import { mockNotifications } from "../data/notifications";

// Single public seed-data entry point. Business logic stays in contexts and features.
export { activity, allBranchAnalytics, attendance, attendanceByMonth, attendanceTrend, branchAnalytics, branchPerformance, branches, chartData, dashboardAttendance, dashboardWalkIns, hourlyAttendance, membershipAttention, membershipPlans, membershipStatus, mockMetrics, planDistribution, frontDeskAccounts, mockNotifications };

const branchNames = ["Makati Central", "BGC High Street", "Cebu IT Park"];
const firstNames = ["Liam", "Emma", "Ethan", "Mia", "Lucas", "Isla", "Noah", "Ava", "Mateo", "Ella", "Leo", "Chloe"];
const lastNames = ["Santos", "Reyes", "Cruz", "Garcia", "Tan", "Navarro", "Lim", "Flores", "Mendoza", "Ramos", "Castillo", "Dela Cruz"];

const generatedCustomers: Customer[] = Array.from({ length: 48 }, (_, index) => {
  const name = firstNames[index % firstNames.length] + " " + lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const member = index % 5 !== 0;
  const plan = index % 4 === 0 ? "Monthly Membership with Coaching" : "Monthly Membership";
  return { id: "CUS-DEMO-" + String(index + 1).padStart(3, "0"), name, phone: "+63 917 555 " + String(2000 + index).slice(-4), email: index % 11 === 0 ? "" : name.toLowerCase().replace(/ /g, ".") + "@example.com", type: member ? "Member" : "Walk-in", status: member ? (["Active", "Pending", "Expired"] as const)[index % 3] : "None", branch: branchNames[index % 3], registered: "Sep " + String((index % 25) + 1).padStart(2, "0") + ", 2026", lastVisit: index % 4 === 0 ? "Today, 08:30 AM" : "Oct " + String((index % 20) + 1).padStart(2, "0") + ", 2026", plan: member ? plan : undefined, endDate: member ? "Nov " + String((index % 25) + 1).padStart(2, "0") + ", 2026" : undefined, classification: index % 3 === 0 ? "Student" : "Regular" };
});

export const customers: Customer[] = [...seedCustomers, ...generatedCustomers];
const generatedMemberships: Membership[] = generatedCustomers.filter((customer) => customer.type === "Member").map((customer, index) => {
  const isStudent = customer.classification === "Student";
  const isCoaching = customer.plan?.includes("Coaching") ?? false;
  const planInfo = {
    name: customer.plan ?? "Monthly Membership",
    duration: "1 month",
    durationMonths: 1,
    price: isCoaching ? 1500 : 800,
    monthlyDues: isCoaching ? 1500 : 800,
    initiationFee: isCoaching ? 150 : 0,
    studentPrice: isCoaching ? 1300 : 600,
    studentMonthlyDues: isCoaching ? 1300 : 600,
    studentInitiationFee: isCoaching ? 100 : 0,
    active: true,
    used: 0,
    promoName: isCoaching ? "New member launch" : undefined,
    promoDiscountPercent: isCoaching ? 12 : 0,
    freeIntroMonths: isCoaching ? 1 : 0,
  };
  const price = membershipPrice(planInfo, customer.classification);
  return {
    id: "MEM-DEMO-" + String(index + 1).padStart(3, "0"),
    customer: customer.name,
    customerId: customer.id,
    plan: customer.plan ?? "Monthly Membership",
    start: "Sep " + String((index % 20) + 1).padStart(2, "0") + ", 2026",
    end: customer.endDate ?? "Nov 20, 2026",
    status: customer.status === "Pending" ? "Pending" : customer.status === "Expired" ? "Expired" : "Active",
    payment: customer.status === "Pending" || index % 7 === 0 ? "Pending" : "Paid",
    paymentMethod: index % 2 ? "GCash" : "Cash",
    branch: customer.branch,
    price,
    monthlyDues: isStudent ? (isCoaching ? 1300 : 600) : (isCoaching ? 1500 : 800),
    initiationFee: isCoaching ? (isStudent ? 100 : 150) : 0,
    freeIntroMonths: isCoaching ? 1 : 0,
    promoDiscount: isCoaching ? 12 : 0,
    promoName: isCoaching ? "New member launch" : undefined,
    outstandingBalance: customer.status === "Pending" ? price : 0,
    nextDueDate: "Nov 20, 2026",
    renewalEligible: true,
  };
});
const additionalMemberships: Membership[] = generatedCustomers.filter((customer) => customer.type === "Member").slice(0, 12).map((customer, index) => {
  const plan = index % 2 ? "Monthly Membership" : "Monthly Membership with Coaching";
  const isStudent = customer.classification === "Student";
  const isCoaching = plan.includes("Coaching");
  const planInfo = {
    name: plan,
    duration: "1 month",
    durationMonths: 1,
    price: isCoaching ? 1500 : 800,
    monthlyDues: isCoaching ? 1500 : 800,
    initiationFee: isCoaching ? 150 : 0,
    studentPrice: isCoaching ? 1300 : 600,
    studentMonthlyDues: isCoaching ? 1300 : 600,
    studentInitiationFee: isCoaching ? 100 : 0,
    active: true,
    used: 0,
    promoName: isCoaching ? "New member launch" : undefined,
    promoDiscountPercent: isCoaching ? 12 : 0,
    freeIntroMonths: isCoaching ? 1 : 0,
  };
  const price = membershipPrice(planInfo, customer.classification);
  return {
    id: "MEM-DEMO-" + String(generatedMemberships.length + index + 1).padStart(3, "0"),
    customer: customer.name,
    customerId: customer.id,
    plan,
    start: "Jun " + String((index % 20) + 1).padStart(2, "0") + ", 2026",
    end: index % 3 === 0 ? "Oct 24, 2026" : "Dec 20, 2026",
    status: index % 4 === 0 ? "Expired" : "Active",
    payment: index % 5 === 0 ? "Pending" : "Paid",
    paymentMethod: index % 2 ? "Card" : "Cash",
    branch: branchNames[(index + 1) % branchNames.length],
    price,
    monthlyDues: isStudent ? (isCoaching ? 1300 : 600) : (isCoaching ? 1500 : 800),
    initiationFee: isCoaching ? (isStudent ? 100 : 150) : 0,
    freeIntroMonths: isCoaching ? 1 : 0,
    promoDiscount: isCoaching ? 12 : 0,
    promoName: isCoaching ? "New member launch" : undefined,
    outstandingBalance: index % 5 === 0 ? price : 0,
    nextDueDate: index % 3 === 0 ? "Oct 24, 2026" : "Dec 20, 2026",
    renewalEligible: true,
  };
});
export const memberships: Membership[] = [...seedMemberships, ...generatedMemberships, ...additionalMemberships];
export const membershipPayments: PaymentRecord[] = [...seedPayments, ...memberships.flatMap<PaymentRecord>((membership, index) => membership.payment === "Pending" ? [{ id: "PAY-DEMO-" + String(index * 3 + 1).padStart(3, "0"), membershipId: membership.id, date: membership.start, amount: membership.price, method: membership.paymentMethod ?? "Cash", reference: "PENDING-" + String(index * 3 + 1).padStart(4, "0"), category: "Membership" as const, branch: membership.branch, status: "Pending" as const, serviceName: membership.plan }] : [0, 1, 2].map((renewal) => ({ id: "PAY-DEMO-" + String(index * 3 + renewal + 1).padStart(3, "0"), membershipId: membership.id, date: renewal === 0 ? membership.start : "Oct " + String(renewal + 1).padStart(2, "0") + ", 2026", amount: membership.price, method: renewal === 1 ? "GCash" : membership.paymentMethod ?? "Cash", reference: "DEMO-" + String(index * 3 + renewal + 1).padStart(4, "0"), category: "Membership" as const, branch: membership.branch, status: "Paid" as const, serviceName: membership.plan })) )];
export const walkIns: WalkIn[] = [...seedWalkIns, ...generatedCustomers.filter((customer) => customer.type === "Walk-in").map((customer, index) => { const coached = index % 4 === 1; const service = coached ? { amount: 200, studentAmount: 180 } : { amount: 100, studentAmount: 80 }; return { id: "VIS-DEMO-" + String(index + 1).padStart(3, "0"), customer: customer.name, customerId: customer.id, branch: customer.branch, date: "Oct " + String((index % 20) + 1).padStart(2, "0") + ", 2026", timeIn: index % 3 === 0 ? "—" : "08:15 AM", timeOut: index % 3 === 0 ? "—" : "10:00 AM", fee: customer.classification === "Student" ? service.studentAmount : service.amount, payment: index % 3 === 0 ? "Pending" : "Paid", method: index % 3 === 0 ? "—" : "Cash", status: index % 3 === 0 ? "Registered" : "Completed", serviceName: coached ? "Walk-in with coach (1 hour)" : "Non-member walk-in" }; })] as unknown as WalkIn[];
export const visitRecords: VisitRecord[] = [...seedVisits, ...Array.from({ length: 200 }, (_, index) => { const customer = generatedCustomers[index % generatedCustomers.length]; const open = index % 31 === 0; return { id: "ATT-DEMO-" + String(index + 1).padStart(3, "0"), customerId: customer.id, customer: customer.name, branch: customer.branch, date: "Oct " + String((index % 20) + 1).padStart(2, "0") + ", 2026", timeIn: String((index % 10) + 7).padStart(2, "0") + ":15 AM", timeOut: open ? "—" : "09:45 AM", type: customer.type === "Member" ? "Member" : "Walk-in", source: index % 4 === 0 ? "Manual" : "RFID · Scanner 1", status: open ? "Checked in" : "Completed", sync: index % 17 === 0 ? "Failed" : index % 9 === 0 ? "Pending" : "Synced", reason: index % 19 === 0 ? "Front desk correction" : undefined }; })] as unknown as VisitRecord[];
export const coaches: Coach[] = [...seedCoaches, ...Array.from({ length: 9 }, (_, index) => ({ id: "COA-DEMO-" + String(index + 1).padStart(3, "0"), name: firstNames[(index + 3) % firstNames.length] + " " + lastNames[(index + 4) % lastNames.length], specialty: ["Strength & conditioning", "Functional training", "Mobility & recovery"][index % 3], branch: branchNames[index % 3], status: index % 8 === 0 ? "Inactive" : "Active", phone: "+63 917 555 " + String(3100 + index).slice(-4) }))] as unknown as Coach[];
export const keyfobs: Keyfob[] = [...seedKeyfobs, ...Array.from({ length: 28 }, (_, index) => ({ id: "KF-DEMO-" + String(index + 1).padStart(3, "0"), uid: "RFID-DEMO-" + String(6000 + index), customer: index % 6 === 0 ? "—" : generatedCustomers[index % generatedCustomers.length].name, branch: branchNames[index % 3], status: index % 9 === 0 ? "Deactivated" : index % 6 === 0 ? "Unassigned" : "Assigned", date: "Sep " + String((index % 25) + 1).padStart(2, "0") + ", 2026" }))] as unknown as Keyfob[];
const auditEntities = [...memberships, ...visitRecords, ...keyfobs, ...membershipPayments];
export const auditLogs: AuditLog[] = Array.from({ length: 52 }, (_, index) => { const entity = auditEntities[index % auditEntities.length]; return { time: "Oct " + String((index % 20) + 1).padStart(2, "0") + ", 2026 · 08:15 AM", user: index % 3 === 0 ? "Admin User" : ["Jordan Davis", "Camille Tan", "Marco Reyes"][index % 3], role: index % 3 === 0 ? "Admin" : "Front Desk", branch: index % 3 === 0 ? "All branches" : entity.branch ?? branchNames[index % 3], action: ["Attendance correction", "Membership renewal", "Keyfob assignment", "Payment recorded"][index % 4], record: entity.id, summary: "Recorded in deterministic demo data for workflow coverage." }; });

export const reminderRecords: ReminderRecord[] = memberships.slice(0, 36).map((membership, index) => {
  const customer = customers.find((item) => item.id === membership.customerId);
  const channel = customer?.email ? "email" : "SMS";
  const stage = index % 4 === 0 ? "Due today" : index % 4 === 1 ? "1 day overdue" : index % 4 === 2 ? "7 days before" : "3 days overdue";
  return { id: "REM-DEMO-" + String(index + 1).padStart(3, "0"), customerId: membership.customerId, membershipId: membership.id, branch: membership.branch, stage, source: index % 3 === 0 ? "manual" : "simulated automatic", channel, initiatedBy: index % 3 === 0 ? "Jordan Davis" : undefined, eligibleDate: membership.end, attemptedAt: "2026-10-" + String(20 - (index % 10)).padStart(2, "0") + "T09:15:00+08:00", status: index % 7 === 0 ? "Skipped" : index % 11 === 0 ? "Failed" : "Simulated", message: `Reminder preview for ${customer?.name ?? membership.customer}.` };
});
