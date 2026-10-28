import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auditLogs as seedAuditLogs, branches as seedBranches, coaches as seedCoaches, customers as seedCustomers, frontDeskAccounts as seedAccounts, keyfobs as seedKeyfobs, membershipPayments as seedPayments, membershipPlans as seedPlans, memberships as seedMemberships, reminderRecords as seedReminderRecords, visitRecords as seedVisits, walkIns as seedWalkIns } from "../mockdata";
import { nextMockId, nowLabel } from "../services/mockApi";
import { normalizePhone } from "../lib/utils";
import { addBillingMonths, durationToMonths, parseMembershipDate } from "../lib/membership";
import type { ArchivedRecord, AuditLog, BranchRecord, Coach, Customer, FrontDeskAccount, Keyfob, Membership, MembershipBillingPause, MembershipPlan, MembershipPolicySettings, PaymentMethod, PaymentRecord, RegistrationSubmission, RegistrationStatus, ServicePrice, VisitRecord, WalkIn, ReminderRecord, ReminderSettings } from "../types";
import { defaultReminderSettings, daysUntil, reminderStage, renderTemplate } from "../lib/reminders";
import { defaultPaymentMethods, defaultServicePrices as pricingServicePrices } from "../lib/pricing";

const storageKey = "gytrak-mock-gym-data-v2";
const branchRecords: BranchRecord[] = seedBranches.map((branch) => ({ ...branch }));
const defaultMembershipPolicySettings: MembershipPolicySettings = {
  defaultDurationMonths: 1,
  renewalWindowDays: 7,
  overdueAccessPolicy: "Allow with manager review",
  initiationFeePolicy: "Charge standard fee",
  maxPromotionDiscountPercent: 15,
  freeIntroMonthsCap: 2,
  frontDeskCanPauseBilling: false,
  customBillingStartAllowed: false,
};

type GymData = { customers: Customer[]; registrations: RegistrationSubmission[]; walkIns: WalkIn[]; visits: VisitRecord[]; memberships: Membership[]; membershipPlans: MembershipPlan[]; membershipPolicySettings: MembershipPolicySettings; paymentMethods: PaymentMethod[]; servicePrices: ServicePrice[]; payments: PaymentRecord[]; coaches: Coach[]; keyfobs: Keyfob[]; branches: BranchRecord[]; frontDeskAccounts: FrontDeskAccount[]; auditLogs: AuditLog[]; reminderRecords: ReminderRecord[]; reminderSettings: ReminderSettings };
type ProfileInput = { branchId: string; name: string; phone: string; email: string };
type GymDataContextValue = GymData & {
  archivedRecords: ArchivedRecord[];
  branches: BranchRecord[];
  submitProfileRegistration: (input: ProfileInput) => { submission: RegistrationSubmission; duplicate: boolean };
  reviewRegistration: (id: string, action: "approve" | "reject" | "correction", reviewer: string, customerId?: string, note?: string) => string | null;
  findCustomersByPhone: (phone: string) => Customer[];
  checkInWalkIn: (branchId: string, phone: string) => { kind: "checked-in"; customer: Customer; walkIn: WalkIn; visit: VisitRecord } | { kind: "duplicate"; customer: Customer } | { kind: "ambiguous"; customers: Customer[] } | { kind: "not-found" } | { kind: "not-configured" };
  recordWalkInPayment: (walkInId: string, method: string) => void;
  upsertCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  archiveCustomer: (id: string) => string | null;
  restoreCustomer: (id: string) => string | null;
  updateVisit: (id: string, update: Partial<VisitRecord>) => void;
  recordManualAttendance: (input: { customerId: string; branch: string; type: "Member" | "Walk-in"; date: string; timeIn: string; timeOut: string; note?: string }) => { ok: true; visit: VisitRecord } | { ok: false; error: string };
  updateWalkIn: (id: string, update: Partial<WalkIn>) => void;
  cancelWalkIn: (id: string) => string | null;
  addWalkIn: (walkIn: WalkIn) => void;
  removeWalkIn: (id: string) => void;
  createMembership: (membership: Membership) => string | null;
  updateMembership: (membership: Membership) => void;
  pauseMembershipBilling: (id: string, pause: MembershipBillingPause) => string | null;
  resumeMembershipBilling: (id: string, resumedAt: string, resumedBy: string) => string | null;
  removeMembership: (id: string) => void;
  addMembershipPlan: (plan: MembershipPlan) => void;
  archiveMembershipPlan: (name: string) => string | null;
  restoreMembershipPlan: (name: string) => string | null;
  updateMembershipPolicySettings: (settings: MembershipPolicySettings) => void;
  upsertPaymentMethod: (method: PaymentMethod) => string | null;
  upsertServicePrice: (price: ServicePrice) => void;
  recordMembershipPayment: (membershipId: string, payment: Omit<PaymentRecord, "id" | "membershipId">) => string | null;
  upsertCoach: (coach: Coach) => void;
  removeCoach: (id: string) => void;
  archiveCoach: (id: string) => string | null;
  restoreCoach: (id: string) => string | null;
  assignKeyfob: (id: string, customer: string, branch: string) => void;
  deactivateKeyfob: (id: string) => void;
  upsertBranch: (branch: BranchRecord) => void;
  getBranchDeleteBlockers: (id: string) => string[];
  deleteBranch: (id: string) => string | null;
  upsertFrontDeskAccount: (account: FrontDeskAccount) => void;
  toggleFrontDeskAccount: (id: string) => void;
  addAuditLog: (entry: AuditLog) => void;
  addReminder: (record: ReminderRecord) => void;
  updateReminderSettings: (settings: ReminderSettings) => void;
  resetDemoData: () => void;
};

function seedData(): GymData {
  return {
    customers: seedCustomers.map((item) => ({ ...item })),
    registrations: [],
    walkIns: seedWalkIns.map((item) => ({ ...item })),
    visits: seedVisits.map((item) => ({ ...item })),
    memberships: seedMemberships.map((item) => ({ ...item })),
    membershipPlans: seedPlans.map((item) => ({ ...item, durationMonths: item.durationMonths ?? 1, monthlyDues: item.monthlyDues ?? item.price, initiationFee: item.initiationFee ?? 0, freeIntroMonths: item.freeIntroMonths ?? 0 } as MembershipPlan)),
    membershipPolicySettings: { ...defaultMembershipPolicySettings },
    paymentMethods: defaultPaymentMethods.map((item) => ({ ...item })),
    servicePrices: defaultServicePrices(),
    payments: seedPayments.map((item) => ({ ...item })),
    coaches: seedCoaches.map((item) => ({ ...item })),
    keyfobs: seedKeyfobs.map((item) => ({ ...item })),
    branches: branchRecords.map((item) => ({ ...item })),
    frontDeskAccounts: seedAccounts.map((item, index) => ({ ...item, id: `FDA-${index + 1}` })),
    auditLogs: seedAuditLogs.map((item) => ({ ...item })),
    reminderRecords: seedReminderRecords.map((item) => ({ ...item })),
    reminderSettings: { ...defaultReminderSettings, channels: { ...defaultReminderSettings.channels } },
  };
}

function mergeSeedRecords<T>(seed: T[], stored: T[], key: (record: T) => string) {
  const existing = new Set(stored.map(key));
  return [...stored, ...seed.filter((record) => !existing.has(key(record)))];
}

function readData(): GymData {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null") as GymData | null;
    if (stored?.customers && stored.registrations && stored.walkIns && stored.visits) return {
      ...seedData(),
      ...stored,
      customers: mergeSeedRecords(seedCustomers as Customer[], stored.customers, (item) => item.id),
      walkIns: mergeSeedRecords(seedWalkIns as WalkIn[], stored.walkIns, (item) => item.id),
      visits: mergeSeedRecords(seedVisits as VisitRecord[], stored.visits, (item) => item.id),
      memberships: mergeSeedRecords(seedMemberships, stored.memberships ?? [], (item) => item.id),
      membershipPlans: mergeSeedRecords(seedPlans as MembershipPlan[], stored.membershipPlans ?? [], (item) => item.name),
      membershipPolicySettings: { ...defaultMembershipPolicySettings, ...(stored.membershipPolicySettings ?? {}) },
      paymentMethods: mergeSeedRecords(defaultPaymentMethods, stored.paymentMethods ?? [], (item) => item.id),
      servicePrices: stored.servicePrices ?? defaultServicePrices(),
      payments: mergeSeedRecords(seedPayments, stored.payments ?? [], (item) => item.id),
      coaches: mergeSeedRecords(seedCoaches, stored.coaches ?? [], (item) => item.id),
      keyfobs: mergeSeedRecords(seedKeyfobs, stored.keyfobs ?? [], (item) => item.id),
      branches: mergeSeedRecords(branchRecords, stored.branches ?? [], (item) => item.id),
      frontDeskAccounts: mergeSeedRecords(seedData().frontDeskAccounts, stored.frontDeskAccounts ?? [], (item) => item.id),
      auditLogs: mergeSeedRecords(seedAuditLogs, stored.auditLogs ?? [], (item) => `${item.time}-${item.record}`),
      reminderRecords: mergeSeedRecords(seedReminderRecords, stored.reminderRecords ?? [], (item) => item.id),
      reminderSettings: { ...defaultReminderSettings, ...(stored.reminderSettings ?? {}), channels: { ...defaultReminderSettings.channels, ...(stored.reminderSettings?.channels ?? {}) } },
    };
  } catch { /* use seed data */ }
  return seedData();
}

function branchFor(branchId: string, records: BranchRecord[] = branchRecords) {
  return records.find((branch) => branch.id === branchId && branch.status === "Active");
}

function defaultServicePrices(): ServicePrice[] {
  return pricingServicePrices.map((price) => ({ ...price }));
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
    const priceConfig = data.servicePrices.find((item) => item.name === "Non-member walk-in" && item.active);
    const price = priceConfig ? customer.classification === "Student" ? priceConfig.studentAmount ?? priceConfig.amount : priceConfig.amount : undefined;
    if (price === undefined) return { kind: "not-configured" as const };
    const walkIn: WalkIn = { id: nextMockId("VIS", 20900), customer: customer.name, customerId: customer.id, branch: branch.name, date: nowLabel(), timeIn: visit.timeIn, timeOut: "—", fee: price, payment: "Pending", method: "—", status: "Checked in", serviceName: "Non-member walk-in", attendanceId: visit.id };
    persist({ ...data, walkIns: [walkIn, ...data.walkIns], visits: [visit, ...data.visits] });
    return { kind: "checked-in" as const, customer, walkIn, visit };
  };
  const recordWalkInPayment = (walkInId: string, method: string) => {
    const walkIn = data.walkIns.find((item) => item.id === walkInId);
    if (!walkIn || walkIn.payment === "Paid") return;
    const payment: PaymentRecord = { id: nextMockId("PAY", 500), membershipId: "", date: walkIn.date, amount: walkIn.fee, method, reference: walkIn.id, category: "Walk-in", branch: walkIn.branch, status: "Paid", serviceName: walkIn.serviceName ?? "Non-member walk-in" };
    persist({ ...data, walkIns: data.walkIns.map((item) => item.id === walkInId ? { ...item, payment: "Paid", method } : item), payments: [payment, ...data.payments] });
  };
  const upsertCustomer = (customer: Customer) => persist({ ...data, customers: data.customers.some((item) => item.id === customer.id) ? data.customers.map((item) => item.id === customer.id ? customer : item) : [customer, ...data.customers] });
  const updateCustomer = (customer: Customer) => persist({ ...data, customers: data.customers.map((item) => item.id === customer.id ? customer : item) });
  const archiveCustomer = (id: string) => {
    const customer = data.customers.find((item) => item.id === id);
    if (!customer) return "Customer was not found.";
    if (data.memberships.some((item) => item.customerId === id && ["Active", "Pending", "Suspended"].includes(item.status))) return "This customer has an active membership. Cancel or suspend it before archiving.";
    const archivedFromStatus = customer.status === "Archived" ? undefined : customer.status;
    persist({ ...data, customers: data.customers.map((item) => item.id === id ? { ...item, archivedFromStatus, status: "Archived" as const, archivedAt: nowLabel() } : item) });
    return null;
  };
  const restoreCustomer = (id: string) => {
    const customer = data.customers.find((item) => item.id === id);
    if (!customer || customer.status !== "Archived") return "Archived customer was not found.";
    const branch = data.branches.find((item) => item.name === customer.branch);
    if (!branch || branch.status !== "Active") return "The customer's branch is not active.";
    const restoredStatus = customer.archivedFromStatus ?? "None";
    persist({ ...data, customers: data.customers.map((item) => item.id === id ? { ...item, status: restoredStatus, archivedAt: undefined, archivedFromStatus: undefined } : item) });
    return null;
  };
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
    const payment = walkIn.payment === "Paid" ? { id: nextMockId("PAY", 500), membershipId: "", date: walkIn.date, amount: walkIn.fee, method: walkIn.method, reference: walkIn.id, category: "Walk-in" as const, branch: walkIn.branch, status: "Paid" as const, serviceName: walkIn.serviceName ?? "Non-member walk-in" } : undefined;
    persist({ ...data, walkIns: [walkIn, ...data.walkIns], payments: payment ? [payment, ...data.payments] : data.payments });
  };
  const removeWalkIn = (id: string) => persist({ ...data, walkIns: data.walkIns.filter((item) => item.id !== id) });
  const cancelWalkIn = (id: string) => {
    const walkIn = data.walkIns.find((item) => item.id === id);
    if (!walkIn) return "Walk-in record was not found.";
    if (walkIn.status === "Cancelled") return "This walk-in is already cancelled.";
    persist({
      ...data,
      walkIns: data.walkIns.map((item) => item.id === id ? { ...item, status: "Cancelled" as const, reason: item.reason ?? "Cancelled by staff" } : item),
      visits: data.visits.map((item) => item.walkInId === id ? { ...item, status: "Voided" as const, reason: item.reason ?? "Walk-in cancelled" } : item),
    });
    return null;
  };
  const createMembership = (membership: Membership) => {
    const initialAmount = membership.initialAmountDue ?? membership.price;
    const initialPayments: PaymentRecord[] = [];
    if (membership.payment === "Paid" && initialAmount > 0) {
      const method = data.paymentMethods.find((item) => item.id === membership.paymentMethodId && item.active && (!item.branch || item.branch === membership.branch));
      if (!method) return "Select an active payment method available for this branch.";
      if (membership.initiationFee > 0) {
        initialPayments.push({ id: nextMockId("PAY", 400), membershipId: membership.id, date: membership.start, amount: membership.initiationFee, amountDue: membership.initiationFee, method: method.name, paymentMethodId: method.id, reference: `${membership.id}-FEE`, category: "Initiation fee", branch: membership.branch, status: "Paid", serviceName: membership.plan });
      }
      const duesDue = Math.max(initialAmount - membership.initiationFee, 0);
      if (duesDue > 0) {
        initialPayments.push({ id: nextMockId("PAY", 400), membershipId: membership.id, date: membership.start, amount: duesDue, amountDue: duesDue, method: method.name, paymentMethodId: method.id, reference: `${membership.id}-DUES`, category: "Monthly dues", branch: membership.branch, status: "Paid", serviceName: membership.plan, billingPeriod: membership.firstBillingDate });
      }
    }
    persist({ ...data, memberships: [membership, ...data.memberships], payments: [...initialPayments, ...data.payments] });
    return null;
  };
  const updateMembership = (membership: Membership) => persist({ ...data, memberships: data.memberships.map((item) => item.id === membership.id ? membership : item) });
  const pauseMembershipBilling = (id: string, pause: MembershipBillingPause) => {
    const membership = data.memberships.find((item) => item.id === id);
    if (!membership) return "Membership was not found.";
    if (membership.billingPaused) return "Billing is already paused for this membership.";
    if (membership.status === "Expired") return "Billing cannot be paused for an expired membership.";
    if (!pause.reason.trim()) return "Enter a reason for pausing billing.";
    if (!parseMembershipDate(pause.startDate)) return "Choose a valid billing pause start date.";
    if (pause.expectedResumeDate && pause.expectedResumeDate < pause.startDate) return "Expected resume date cannot be before the pause start date.";
    persist({
      ...data,
      memberships: data.memberships.map((item) => item.id === id
        ? { ...item, billingPaused: true, billingPauses: [...(item.billingPauses ?? []), pause] }
        : item),
    });
    return null;
  };
  const resumeMembershipBilling = (id: string, resumedAt: string, resumedBy: string) => {
    const membership = data.memberships.find((item) => item.id === id);
    if (!membership) return "Membership was not found.";
    if (!membership.billingPaused) return "Billing is not currently paused for this membership.";
    if (!parseMembershipDate(resumedAt)) return "Choose a valid billing resume date.";
    const pauses = membership.billingPauses ?? [];
    let activePauseIndex = -1;
    for (let index = pauses.length - 1; index >= 0; index -= 1) {
      if (!pauses[index].resumedAt) {
        activePauseIndex = index;
        break;
      }
    }
    if (activePauseIndex < 0) return "No active billing pause was found.";
    const activePause = pauses[activePauseIndex];
    if (resumedAt < activePause.startDate) return "Resume date cannot be before the pause start date.";
    const updatedPauses = pauses.map((pause, index) => index === activePauseIndex
      ? { ...pause, resumedAt, resumedBy }
      : pause);
    persist({
      ...data,
      memberships: data.memberships.map((item) => item.id === id
        ? { ...item, billingPaused: false, billingPauses: updatedPauses }
        : item),
    });
    return null;
  };
  const removeMembership = (id: string) => persist({
    ...data,
    memberships: data.memberships.map((item) => item.id === id
      ? { ...item, status: "Cancelled", cancelledAt: nowLabel(), billingPaused: false }
      : item),
  });
  const addMembershipPlan = (plan: MembershipPlan) => persist({ ...data, membershipPlans: data.membershipPlans.some((item) => item.name === plan.name) ? data.membershipPlans.map((item) => item.name === plan.name ? plan : item) : [...data.membershipPlans, plan] });
  const archiveMembershipPlan = (name: string) => {
    const plan = data.membershipPlans.find((item) => item.name === name);
    if (!plan) return "Membership plan was not found.";
    persist({ ...data, membershipPlans: data.membershipPlans.map((item) => item.name === name ? { ...item, active: false, archived: true, archivedAt: nowLabel() } : item) });
    return null;
  };
  const restoreMembershipPlan = (name: string) => {
    const plan = data.membershipPlans.find((item) => item.name === name);
    if (!plan || !plan.archived) return "Archived membership plan was not found.";
    persist({ ...data, membershipPlans: data.membershipPlans.map((item) => item.name === name ? { ...item, active: true, archived: false, archivedAt: undefined } : item) });
    return null;
  };
  const updateMembershipPolicySettings = (settings: MembershipPolicySettings) => persist({ ...data, membershipPolicySettings: settings });
  const upsertPaymentMethod = (method: PaymentMethod) => {
    if (!method.name.trim()) return "Enter a payment method name.";
    if (!method.code.trim()) return "Payment method code cannot be empty.";
    if (data.paymentMethods.some((item) => item.id !== method.id && item.code.toLowerCase() === method.code.toLowerCase())) return "Payment method code must be unique.";
    const duplicate = data.paymentMethods.find((item) =>
      item.id !== method.id &&
      item.active &&
      method.active &&
      item.name.trim().toLowerCase() === method.name.trim().toLowerCase() &&
      (item.branch ?? "") === (method.branch ?? ""),
    );
    if (duplicate) return `An active payment method named "${duplicate.name}" already exists for this scope.`;
    const existing = data.paymentMethods.find((item) => item.id === method.id);
    const updatedMethod = existing ? { ...method, code: existing.code } : method;
    persist({
      ...data,
      paymentMethods: existing
        ? data.paymentMethods.map((item) => item.id === method.id ? updatedMethod : item)
        : [...data.paymentMethods, updatedMethod],
    });
    return null;
  };
  const upsertServicePrice = (price: ServicePrice) => persist({ ...data, servicePrices: data.servicePrices.some((item) => item.id === price.id) ? data.servicePrices.map((item) => item.id === price.id ? price : item) : [...data.servicePrices, price] });
  const recordMembershipPayment = (membershipId: string, payment: Omit<PaymentRecord, "id" | "membershipId">) => {
    const membership = data.memberships.find((item) => item.id === membershipId);
    if (!membership) return "Membership was not found.";
    const method = data.paymentMethods.find((item) => item.id === payment.paymentMethodId && item.active && (!item.branch || item.branch === membership.branch));
    if (!method) return "Select an active payment method available for this branch.";
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) return "Payment amount must be greater than zero.";
    if (data.payments.some((item) => item.membershipId === membershipId && item.reference === payment.reference && payment.reference && payment.reference !== "—")) return "This payment reference has already been recorded.";
    const outstanding = membership.outstandingBalance ?? (membership.payment === "Paid" ? 0 : membership.initialAmountDue ?? membership.price);
    if (membership.billingPaused && payment.category === "Monthly dues") return "Monthly dues cannot be collected while billing is paused.";
    const cycleDue = Math.max(0, membership.monthlyDues - membership.promoDiscount);
    let feeDue = membership.initiationFeeOutstanding ?? Math.min(outstanding, membership.initiationFee);
    let duesDue = membership.monthlyDuesOutstanding ?? Math.max(0, outstanding - feeDue);
    if (outstanding === 0) duesDue = cycleDue;
    const amountDue = outstanding > 0 ? feeDue + duesDue : cycleDue;
    if (payment.amount > amountDue) return `Payment cannot exceed the amount due of ${amountDue}.`;
    const feePaid = Math.min(payment.amount, feeDue);
    const duesPaid = Math.max(0, payment.amount - feePaid);
    feeDue = Math.max(0, feeDue - feePaid);
    duesDue = Math.max(0, duesDue - duesPaid);
    const remaining = feeDue + duesDue;
    const nextDueDate = duesPaid > 0 && duesDue === 0
      ? addBillingMonths(membership.nextDueDate ?? membership.firstBillingDate ?? membership.end, 1)
      : membership.nextDueDate;
    const record: PaymentRecord = {
      ...payment,
      method: method.name,
      paymentMethodId: method.id,
      id: nextMockId("PAY", 400),
      membershipId,
      category: payment.category ?? "Membership",
      branch: membership.branch,
      status: "Paid",
      serviceName: membership.plan,
    };
    persist({
      ...data,
      payments: [record, ...data.payments],
      memberships: data.memberships.map((item) => item.id === membershipId
        ? { ...item, outstandingBalance: remaining, initiationFeeOutstanding: feeDue, monthlyDuesOutstanding: duesDue, payment: remaining === 0 ? "Paid" : "Partially paid", nextDueDate }
        : item),
    });
    return null;
  };
  const upsertCoach = (coach: Coach) => persist({ ...data, coaches: data.coaches.some((item) => item.id === coach.id) ? data.coaches.map((item) => item.id === coach.id ? coach : item) : [coach, ...data.coaches] });
  const removeCoach = (id: string) => persist({ ...data, coaches: data.coaches.filter((item) => item.id !== id) });
  const archiveCoach = (id: string) => {
    const coach = data.coaches.find((item) => item.id === id);
    if (!coach) return "Coach was not found.";
    const archivedFromStatus = coach.status === "Archived" ? undefined : coach.status;
    persist({ ...data, coaches: data.coaches.map((item) => item.id === id ? { ...item, archivedFromStatus, status: "Archived" as const, archivedAt: nowLabel() } : item) });
    return null;
  };
  const restoreCoach = (id: string) => {
    const coach = data.coaches.find((item) => item.id === id);
    if (!coach || coach.status !== "Archived") return "Archived coach was not found.";
    const branch = data.branches.find((item) => item.name === coach.branch);
    if (!branch || branch.status !== "Active") return "The coach's branch is not active.";
    const restoredStatus = coach.archivedFromStatus ?? "Inactive";
    persist({ ...data, coaches: data.coaches.map((item) => item.id === id ? { ...item, status: restoredStatus, archivedAt: undefined, archivedFromStatus: undefined } : item) });
    return null;
  };
  const assignKeyfob = (id: string, customer: string, branch: string) => persist({ ...data, keyfobs: data.keyfobs.map((item) => item.id === id ? { ...item, customer, branch, status: "Assigned", date: nowLabel() } : item) });
  const deactivateKeyfob = (id: string) => persist({ ...data, keyfobs: data.keyfobs.map((item) => item.id === id ? { ...item, status: "Deactivated" } : item) });
  const upsertBranch = (branch: BranchRecord) => {
    const existing = data.branches.find((item) => item.id === branch.id);
    const normalizedBranch = branch.status === "Archived"
      ? { ...branch, archivedAt: branch.archivedAt ?? nowLabel() }
      : { ...branch, archivedAt: undefined };
    const next = {
      ...data,
      branches: existing
        ? data.branches.map((item) => item.id === branch.id ? normalizedBranch : item)
        : [normalizedBranch, ...data.branches],
    };
    // Branch names are display snapshots in the legacy mock records. A rename
    // must not rewrite payment, attendance, membership, or audit history.
    persist(next);
  };
  const getBranchDeleteBlockers = (id: string) => {
    const branch = data.branches.find((item) => item.id === id);
    if (!branch) return ["Branch was not found."];
    const name = branch.name;
    const blockers: Array<[string, boolean]> = [
      ["customers", data.customers.some((item) => item.branch === name)],
      ["memberships", data.memberships.some((item) => item.branch === name)],
      ["attendance records", data.visits.some((item) => item.branch === name)],
      ["walk-in records", data.walkIns.some((item) => item.branch === name)],
      ["transactions or payments", data.payments.some((item) => item.branch === name) || data.memberships.some((membership) => membership.branch === name && data.payments.some((payment) => payment.membershipId === membership.id))],
      ["Front Desk accounts", data.frontDeskAccounts.some((item) => item.branch === name)],
      ["coaches", data.coaches.some((item) => item.branch === name)],
      ["keyfob records", data.keyfobs.some((item) => item.branch === name)],
      ["registration records", data.registrations.some((item) => item.branchId === id || item.branch === name)],
      ["reminder history", data.reminderRecords.some((item) => item.branch === name)],
      ["audit history", data.auditLogs.some((item) => item.branch === name)],
    ];
    return blockers.filter(([, exists]) => exists).map(([label]) => label);
  };
  const deleteBranch = (id: string) => {
    const branch = data.branches.find((item) => item.id === id);
    if (!branch) return "Branch was not found.";
    const blockers = getBranchDeleteBlockers(id);
    if (blockers.length) return `Cannot delete ${branch.name}; it has associated ${blockers.join(", ")}. Archive it to preserve its records.`;
    persist({ ...data, branches: data.branches.filter((item) => item.id !== id) });
    return null;
  };
  const upsertFrontDeskAccount = (account: FrontDeskAccount) => persist({ ...data, frontDeskAccounts: data.frontDeskAccounts.some((item) => item.id === account.id) ? data.frontDeskAccounts.map((item) => item.id === account.id ? account : item) : [account, ...data.frontDeskAccounts] });
  const toggleFrontDeskAccount = (id: string) => persist({ ...data, frontDeskAccounts: data.frontDeskAccounts.map((item) => item.id === id ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item) });
  const addAuditLog = (entry: AuditLog) => persist({ ...data, auditLogs: [entry, ...data.auditLogs] });
  const addReminder = (record: ReminderRecord) => { if (data.reminderRecords.some((item) => item.membershipId === record.membershipId && item.stage === record.stage && item.channel === record.channel && item.status !== "Failed")) return; persist({ ...data, reminderRecords: [record, ...data.reminderRecords] }); };
  const updateReminderSettings = (settings: ReminderSettings) => persist({ ...data, reminderSettings: settings });
  const resetDemoData = () => persist(seedData());
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
  const archivedRecords: ArchivedRecord[] = [
    ...data.customers.filter((item) => item.status === "Archived").map((item) => ({ id: item.id, entity: "Customer" as const, name: item.name, branch: item.branch, archivedAt: item.archivedAt ?? "Unknown", status: item.status })),
    ...data.branches.filter((item) => item.status === "Archived").map((item) => ({ id: item.id, entity: "Branch" as const, name: item.name, branch: item.name, archivedAt: item.archivedAt ?? "Unknown", status: item.status })),
    ...data.membershipPlans.filter((item) => item.archived).map((item) => ({ id: item.id ?? item.name, entity: "Membership plan" as const, name: item.name, archivedAt: item.archivedAt ?? "Unknown", status: "Archived" })),
    ...data.coaches.filter((item) => item.status === "Archived").map((item) => ({ id: item.id, entity: "Coach" as const, name: item.name, branch: item.branch, archivedAt: item.archivedAt ?? "Unknown", status: item.status })),
  ];
  const value = useMemo(() => ({ ...data, archivedRecords, submitProfileRegistration, reviewRegistration, findCustomersByPhone, checkInWalkIn, recordWalkInPayment, upsertCustomer, updateCustomer, archiveCustomer, restoreCustomer, updateVisit, recordManualAttendance, updateWalkIn, addWalkIn, removeWalkIn, cancelWalkIn, createMembership, updateMembership, pauseMembershipBilling, resumeMembershipBilling, removeMembership, addMembershipPlan, archiveMembershipPlan, restoreMembershipPlan, updateMembershipPolicySettings, upsertPaymentMethod, upsertServicePrice, recordMembershipPayment, upsertCoach, removeCoach, archiveCoach, restoreCoach, assignKeyfob, deactivateKeyfob, upsertBranch, getBranchDeleteBlockers, deleteBranch, upsertFrontDeskAccount, toggleFrontDeskAccount, addAuditLog, addReminder, updateReminderSettings, resetDemoData }), [data, archivedRecords]);
  return <GymDataContext.Provider value={value}>{children}</GymDataContext.Provider>;
}

const GymDataContext = createContext<GymDataContextValue | null>(null);
export function useGymData() {
  const context = useContext(GymDataContext);
  if (!context) throw new Error("useGymData must be used inside GymDataProvider");
  return context;
}
