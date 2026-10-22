import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auditLogs as seedAuditLogs, branches as seedBranches, coaches as seedCoaches, customers as seedCustomers, frontDeskAccounts as seedAccounts, keyfobs as seedKeyfobs, membershipPayments as seedPayments, membershipPlans as seedPlans, memberships as seedMemberships, visitRecords as seedVisits, walkIns as seedWalkIns } from "../data/mockData";
import { nextMockId, nowLabel } from "../services/mockApi";
import { normalizePhone } from "../lib/utils";
import { addBillingMonths, durationToMonths } from "../lib/membership";
import type { AuditLog, BranchRecord, Coach, Customer, FrontDeskAccount, Keyfob, Membership, MembershipPlan, PaymentRecord, RegistrationSubmission, RegistrationStatus, ServicePrice, VisitRecord, WalkIn, ReminderRecord, ReminderSettings } from "../types";
import { defaultReminderSettings, daysUntil, reminderStage, renderTemplate } from "../lib/reminders";

const storageKey = "gytrak-mock-gym-data-v2";
const branchRecords: BranchRecord[] = seedBranches.map((branch) => ({ ...branch }));

type GymData = { customers: Customer[]; registrations: RegistrationSubmission[]; walkIns: WalkIn[]; visits: VisitRecord[]; memberships: Membership[]; membershipPlans: MembershipPlan[]; servicePrices: ServicePrice[]; payments: PaymentRecord[]; coaches: Coach[]; keyfobs: Keyfob[]; branches: BranchRecord[]; frontDeskAccounts: FrontDeskAccount[]; auditLogs: AuditLog[]; reminderRecords: ReminderRecord[]; reminderSettings: ReminderSettings };
type ProfileInput = { branchId: string; name: string; phone: string; email: string };
type GymDataContextValue = GymData & {
  branches: BranchRecord[];
  submitProfileRegistration: (input: ProfileInput) => { submission: RegistrationSubmission; duplicate: boolean };
  reviewRegistration: (id: string, action: "approve" | "reject" | "correction", reviewer: string, customerId?: string, note?: string) => string | null;
  findCustomersByPhone: (phone: string) => Customer[];
  checkInWalkIn: (branchId: string, phone: string) => { kind: "checked-in"; customer: Customer; walkIn: WalkIn; visit: VisitRecord } | { kind: "duplicate"; customer: Customer } | { kind: "ambiguous"; customers: Customer[] } | { kind: "not-found" } | { kind: "not-configured" };
  recordWalkInPayment: (walkInId: string, method: string) => void;
  upsertCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  updateVisit: (id: string, update: Partial<VisitRecord>) => void;
  recordManualAttendance: (input: { customerId: string; branch: string; type: "Member" | "Walk-in"; date: string; timeIn: string; timeOut: string; note?: string }) => { ok: true; visit: VisitRecord } | { ok: false; error: string };
  updateWalkIn: (id: string, update: Partial<WalkIn>) => void;
  addWalkIn: (walkIn: WalkIn) => void;
  removeWalkIn: (id: string) => void;
  createMembership: (membership: Membership) => void;
  updateMembership: (membership: Membership) => void;
  removeMembership: (id: string) => void;
  addMembershipPlan: (plan: MembershipPlan) => void;
  upsertServicePrice: (price: ServicePrice) => void;
  recordMembershipPayment: (membershipId: string, payment: Omit<PaymentRecord, "id" | "membershipId">) => void;
  upsertCoach: (coach: Coach) => void;
  removeCoach: (id: string) => void;
  assignKeyfob: (id: string, customer: string, branch: string) => void;
  deactivateKeyfob: (id: string) => void;
  upsertBranch: (branch: BranchRecord) => void;
  upsertFrontDeskAccount: (account: FrontDeskAccount) => void;
  toggleFrontDeskAccount: (id: string) => void;
  addAuditLog: (entry: AuditLog) => void;
  addReminder: (record: ReminderRecord) => void;
  updateReminderSettings: (settings: ReminderSettings) => void;
};

function readData(): GymData {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null") as GymData | null;
    if (stored?.customers && stored.registrations && stored.walkIns && stored.visits) return {
      ...stored,
      memberships: stored.memberships ?? seedMemberships.map((item) => ({ ...item })),
      membershipPlans: stored.membershipPlans ?? seedPlans.map((item) => ({ ...item })),
      servicePrices: stored.servicePrices ?? defaultServicePrices(),
      payments: stored.payments ?? seedPayments.map((item) => ({ ...item })),
      coaches: stored.coaches ?? seedCoaches.map((item) => ({ ...item })),
      keyfobs: stored.keyfobs ?? seedKeyfobs.map((item) => ({ ...item })),
      branches: stored.branches ?? branchRecords.map((item) => ({ ...item })),
      frontDeskAccounts: stored.frontDeskAccounts ?? seedAccounts.map((item, index) => ({ ...item, id: `FDA-${index + 1}` })),
      auditLogs: stored.auditLogs ?? seedAuditLogs.map((item) => ({ ...item })),
      reminderRecords: stored.reminderRecords ?? [], reminderSettings: { ...defaultReminderSettings, ...(stored.reminderSettings ?? {}), channels: { ...defaultReminderSettings.channels, ...(stored.reminderSettings?.channels ?? {}) } },
    };
  } catch { /* use seed data */ }
  return {
    customers: seedCustomers.map((item) => ({ ...item })),
    registrations: [],
    walkIns: seedWalkIns.map((item) => ({ ...item })),
    visits: seedVisits.map((item) => ({ ...item })),
    memberships: seedMemberships.map((item) => ({ ...item })),
    membershipPlans: seedPlans.map((item) => ({ ...item })),
    servicePrices: defaultServicePrices(),
    payments: seedPayments.map((item) => ({ ...item })),
    coaches: seedCoaches.map((item) => ({ ...item })),
    keyfobs: seedKeyfobs.map((item) => ({ ...item })),
    branches: branchRecords.map((item) => ({ ...item })),
    frontDeskAccounts: seedAccounts.map((item, index) => ({ ...item, id: `FDA-${index + 1}` })),
    auditLogs: seedAuditLogs.map((item) => ({ ...item })),
    reminderRecords: [], reminderSettings: { ...defaultReminderSettings, channels: { ...defaultReminderSettings.channels } },
  };
}

function branchFor(branchId: string, records: BranchRecord[] = branchRecords) {
  return records.find((branch) => branch.id === branchId && branch.status === "Active");
}

function defaultServicePrices(): ServicePrice[] {
  return [
    { id: "SR-WALKIN", name: "Non-member walk-in", category: "Walk-in access", amount: 250, active: true },
    { id: "SR-MEMBER-WALKIN", name: "Existing member walk-in", category: "Walk-in access", amount: 0, active: true },
    { id: "SR-COACHING", name: "Personal coaching session", category: "Coaching", amount: 800, active: true },
  ];
}

export function GymDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<GymData>(readData);
  const persist = (next: GymData) => {
    setData(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const findCustomersByPhone = (phone: string) => {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 10) return [];
    return data.customers.filter((customer) => normalizePhone(customer.phone) === normalized);
  };
  const submitProfileRegistration = (input: ProfileInput) => {
    const branch = branchFor(input.branchId, data.branches);
    if (!branch) throw new Error("This registration link is not associated with an active branch.");
    const phone = normalizePhone(input.phone);
    const possibleCustomerIds = findCustomersByPhone(phone).map((customer) => customer.id);
    const duplicate = possibleCustomerIds.length > 0 || data.registrations.some((item) =>
      ["Pending", "Needs correction"].includes(item.status) && normalizePhone(item.phone) === phone,
    );
    const submission: RegistrationSubmission = {
      id: nextMockId("REG", 1000),
      reference: `GY-${Date.now().toString(36).toUpperCase()}`,
      branchId: branch.id,
      branch: branch.name,
      name: input.name.trim(),
      phone,
      email: input.email.trim().toLowerCase(),
      submittedAt: new Date().toISOString(),
      status: "Pending",
      possibleCustomerIds,
    };
    persist({ ...data, registrations: [submission, ...data.registrations] });
    return { submission, duplicate };
  };
  const reviewRegistration = (id: string, action: "approve" | "reject" | "correction", reviewer: string, customerId?: string, note?: string) => {
    const submission = data.registrations.find((item) => item.id === id);
    if (!submission || !["Pending", "Needs correction"].includes(submission.status)) return "This registration has already been reviewed or does not exist.";
    if (action === "approve") {
      const existing = customerId ? data.customers.find((customer) => customer.id === customerId) : undefined;
      const phoneMatches = findCustomersByPhone(submission.phone);
      const customer = existing ?? (phoneMatches.length === 1 ? phoneMatches[0] : undefined);
      if (phoneMatches.length > 1 && !existing) return "Multiple customer matches require staff resolution before approval.";
      let customers = data.customers;
      let resultingCustomerId = customer?.id;
      if (!customer) {
        const created: Customer = { id: nextMockId("CUS", 10500), name: submission.name, phone: submission.phone, email: submission.email, type: "Walk-in", status: "None", branch: submission.branch, registered: nowLabel(), lastVisit: "—", classification: "Regular" };
        customers = [created, ...customers];
        resultingCustomerId = created.id;
      }
      const registrations = data.registrations.map((item) => item.id === id ? { ...item, status: "Approved" as RegistrationStatus, customerId: resultingCustomerId, reviewedBy: reviewer, reviewedAt: new Date().toISOString() } : item);
      persist({ ...data, customers, registrations });
      return null;
    }
    const status: RegistrationStatus = action === "reject" ? "Rejected" : "Needs correction";
    persist({ ...data, registrations: data.registrations.map((item) => item.id === id ? { ...item, status, correctionNote: note, reviewedBy: reviewer, reviewedAt: new Date().toISOString() } : item) });
    return null;
  };
  const checkInWalkIn = (branchId: string, phone: string) => {
    const branch = branchFor(branchId, data.branches);
    if (!branch) return { kind: "not-found" as const };
    const matches = findCustomersByPhone(phone);
    if (matches.length === 0) return { kind: "not-found" as const };
    if (matches.length > 1) return { kind: "ambiguous" as const, customers: matches };
    const customer = matches[0];
    const open = data.visits.find((visit) => visit.customerId === customer.id && visit.branch === branch.name && visit.status === "Checked in");
    if (open) return { kind: "duplicate" as const, customer };
    const visit: VisitRecord = { id: nextMockId("ATT", 90300), customerId: customer.id, customer: customer.name, branch: branch.name, date: nowLabel(), timeIn: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }), timeOut: "—", type: "Walk-in", source: "Manual", status: "Checked in", sync: "Pending" };
    const price = data.servicePrices.find((item) => item.name === "Non-member walk-in" && item.active)?.amount;
    if (price === undefined) return { kind: "not-configured" as const };
    const walkIn: WalkIn = { id: nextMockId("VIS", 20900), customer: customer.name, customerId: customer.id, branch: branch.name, date: nowLabel(), timeIn: visit.timeIn, timeOut: "—", fee: price, payment: "Pending", method: "—", status: "Checked in", attendanceId: visit.id };
    persist({ ...data, walkIns: [walkIn, ...data.walkIns], visits: [visit, ...data.visits] });
    return { kind: "checked-in" as const, customer, walkIn, visit };
  };
  const recordWalkInPayment = (walkInId: string, method: string) => {
    const walkIn = data.walkIns.find((item) => item.id === walkInId);
    if (!walkIn || walkIn.payment === "Paid") return;
    const payment: PaymentRecord = { id: nextMockId("PAY", 500), membershipId: "", date: walkIn.date, amount: walkIn.fee, method, reference: walkIn.id, category: "Walk-in", branch: walkIn.branch, status: "Paid", serviceName: "Walk-in access" };
    persist({ ...data, walkIns: data.walkIns.map((item) => item.id === walkInId ? { ...item, payment: "Paid", method } : item), payments: [payment, ...data.payments] });
  };
  const upsertCustomer = (customer: Customer) => persist({ ...data, customers: data.customers.some((item) => item.id === customer.id) ? data.customers.map((item) => item.id === customer.id ? customer : item) : [customer, ...data.customers] });
  const updateCustomer = (customer: Customer) => persist({ ...data, customers: data.customers.map((item) => item.id === customer.id ? customer : item) });
  const updateVisit = (id: string, update: Partial<VisitRecord>) => persist({ ...data, visits: data.visits.map((item) => item.id === id ? { ...item, ...update } : item) });
  const recordManualAttendance = (input: { customerId: string; branch: string; type: "Member" | "Walk-in"; date: string; timeIn: string; timeOut: string; note?: string }) => {
    const customer = data.customers.find((item) => item.id === input.customerId);
    if (!customer) return { ok: false as const, error: "Select an existing customer." };
    if (input.timeOut !== "—" && input.timeOut <= input.timeIn) return { ok: false as const, error: "Time-out must be later than time-in." };
    const open = data.visits.find((item) => item.customerId === input.customerId && item.branch === input.branch && item.status === "Checked in" && item.timeOut === "—");
    if (open) return { ok: false as const, error: `${customer.name} already has an open attendance session at this branch.` };
    const visit: VisitRecord = { id: nextMockId("ATT", 90300), customerId: customer.id, customer: customer.name, branch: input.branch, date: input.date, timeIn: input.timeIn, timeOut: input.timeOut, type: input.type, source: "Manual", status: input.timeOut === "—" ? "Checked in" : "Completed", sync: "Pending", reason: input.note };
    persist({ ...data, visits: [visit, ...data.visits] });
    return { ok: true as const, visit };
  };
  const updateWalkIn = (id: string, update: Partial<WalkIn>) => persist({ ...data, walkIns: data.walkIns.map((item) => item.id === id ? { ...item, ...update } : item) });
  const addWalkIn = (walkIn: WalkIn) => {
    const payment = walkIn.payment === "Paid" ? { id: nextMockId("PAY", 500), membershipId: "", date: walkIn.date, amount: walkIn.fee, method: walkIn.method, reference: walkIn.id, category: "Walk-in" as const, branch: walkIn.branch, status: "Paid" as const, serviceName: "Walk-in access" } : undefined;
    persist({ ...data, walkIns: [walkIn, ...data.walkIns], payments: payment ? [payment, ...data.payments] : data.payments });
  };
  const removeWalkIn = (id: string) => persist({ ...data, walkIns: data.walkIns.filter((item) => item.id !== id) });
  const createMembership = (membership: Membership) => {
    const payment = membership.payment === "Paid" ? { id: nextMockId("PAY", 400), membershipId: membership.id, date: membership.start, amount: membership.price, method: membership.paymentMethod ?? "Cash", reference: membership.id, category: "Membership" as const, branch: membership.branch, status: "Paid" as const, serviceName: membership.plan } : undefined;
    persist({ ...data, memberships: [membership, ...data.memberships], payments: payment ? [payment, ...data.payments] : data.payments });
  };
  const updateMembership = (membership: Membership) => persist({ ...data, memberships: data.memberships.map((item) => item.id === membership.id ? membership : item) });
  const removeMembership = (id: string) => persist({ ...data, memberships: data.memberships.filter((item) => item.id !== id), payments: data.payments.filter((item) => item.membershipId !== id) });
  const addMembershipPlan = (plan: MembershipPlan) => persist({ ...data, membershipPlans: data.membershipPlans.some((item) => item.name === plan.name) ? data.membershipPlans.map((item) => item.name === plan.name ? plan : item) : [...data.membershipPlans, plan] });
  const upsertServicePrice = (price: ServicePrice) => persist({ ...data, servicePrices: data.servicePrices.some((item) => item.id === price.id) ? data.servicePrices.map((item) => item.id === price.id ? price : item) : [...data.servicePrices, price] });
  const recordMembershipPayment = (membershipId: string, payment: Omit<PaymentRecord, "id" | "membershipId">) => {
    const membership = data.memberships.find((item) => item.id === membershipId);
    if (!membership) return;
    if (data.payments.some((item) => item.membershipId === membershipId && item.reference === payment.reference && payment.reference)) return;
    const record = { ...payment, id: nextMockId("PAY", 400), membershipId, category: "Membership" as const, branch: membership.branch, status: "Paid" as const, serviceName: membership.plan };
    persist({ ...data, payments: [record, ...data.payments], memberships: data.memberships.map((item) => item.id === membershipId ? { ...item, payment: "Paid", status: item.status === "Expired" ? "Active" : item.status, end: addBillingMonths(item.end, durationToMonths(item.plan)) } : item) });
  };
  const upsertCoach = (coach: Coach) => persist({ ...data, coaches: data.coaches.some((item) => item.id === coach.id) ? data.coaches.map((item) => item.id === coach.id ? coach : item) : [coach, ...data.coaches] });
  const removeCoach = (id: string) => persist({ ...data, coaches: data.coaches.filter((item) => item.id !== id) });
  const assignKeyfob = (id: string, customer: string, branch: string) => persist({ ...data, keyfobs: data.keyfobs.map((item) => item.id === id ? { ...item, customer, branch, status: "Assigned", date: nowLabel() } : item) });
  const deactivateKeyfob = (id: string) => persist({ ...data, keyfobs: data.keyfobs.map((item) => item.id === id ? { ...item, status: "Deactivated" } : item) });
  const upsertBranch = (branch: BranchRecord) => persist({ ...data, branches: data.branches.some((item) => item.id === branch.id) ? data.branches.map((item) => item.id === branch.id ? branch : item) : [branch, ...data.branches] });
  const upsertFrontDeskAccount = (account: FrontDeskAccount) => persist({ ...data, frontDeskAccounts: data.frontDeskAccounts.some((item) => item.id === account.id) ? data.frontDeskAccounts.map((item) => item.id === account.id ? account : item) : [account, ...data.frontDeskAccounts] });
  const toggleFrontDeskAccount = (id: string) => persist({ ...data, frontDeskAccounts: data.frontDeskAccounts.map((item) => item.id === id ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item) });
  const addAuditLog = (entry: AuditLog) => persist({ ...data, auditLogs: [entry, ...data.auditLogs] });
  const addReminder = (record: ReminderRecord) => { if (data.reminderRecords.some((item) => item.membershipId === record.membershipId && item.stage === record.stage && item.channel === record.channel && item.status !== "Failed")) return; persist({ ...data, reminderRecords: [record, ...data.reminderRecords] }); };
  const updateReminderSettings = (settings: ReminderSettings) => persist({ ...data, reminderSettings: settings });
  useEffect(() => {
    if (!data.reminderSettings.enabled) return;
    const additions: ReminderRecord[] = [];
    data.memberships.forEach((membership) => {
      const days = daysUntil(membership.end); const stage = days === null ? null : reminderStage(days);
      if (!stage || days === null || !data.reminderSettings.intervals.includes(days)) return;
      const customer = data.customers.find((item) => item.id === membership.customerId);
      if (!customer) return;
      const channel = data.reminderSettings.channels.email && customer.email ? "email" : data.reminderSettings.channels.sms && customer.phone ? "SMS" : null;
      if (data.reminderRecords.some((item) => item.membershipId === membership.id && item.stage === stage && item.source === "simulated automatic")) return;
      const common = { id: nextMockId("REM", 700), customerId: customer.id, membershipId: membership.id, branch: membership.branch, stage, source: "simulated automatic" as const, eligibleDate: membership.end, attemptedAt: new Date().toISOString() };
      additions.push(channel ? { ...common, channel, status: "Simulated" as const, message: renderTemplate(channel === "email" ? data.reminderSettings.emailTemplate : data.reminderSettings.smsTemplate, membership, customer, data.reminderSettings) } : { ...common, channel: "email" as const, status: "Skipped" as const, message: "", reason: "No email or phone contact information is available." });
    });
    if (additions.length) { const next = { ...data, reminderRecords: [...additions, ...data.reminderRecords] }; setData(next); localStorage.setItem(storageKey, JSON.stringify(next)); }
  }, [data.memberships, data.customers, data.reminderSettings, data.reminderRecords]);
  const value = useMemo(() => ({ ...data, submitProfileRegistration, reviewRegistration, findCustomersByPhone, checkInWalkIn, recordWalkInPayment, upsertCustomer, updateCustomer, updateVisit, recordManualAttendance, updateWalkIn, addWalkIn, removeWalkIn, createMembership, updateMembership, removeMembership, addMembershipPlan, upsertServicePrice, recordMembershipPayment, upsertCoach, removeCoach, assignKeyfob, deactivateKeyfob, upsertBranch, upsertFrontDeskAccount, toggleFrontDeskAccount, addAuditLog, addReminder, updateReminderSettings }), [data]);
  return <GymDataContext.Provider value={value}>{children}</GymDataContext.Provider>;
}

const GymDataContext = createContext<GymDataContextValue | null>(null);
export function useGymData() {
  const context = useContext(GymDataContext);
  if (!context) throw new Error("useGymData must be used inside GymDataProvider");
  return context;
}
