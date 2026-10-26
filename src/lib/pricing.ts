import type { MembershipPlan, PaymentMethod, ServicePrice } from "../types";

export const gymPricing = {
  walkIn: { regular: 100, student: 80 },
  walkInWithCoach: { regular: 200, student: 180 },
  monthly: { regular: 800, student: 600 },
  monthlyWithCoach: { regular: 1500, student: 1300 },
  coachingFeePerHour: 100,
} as const;

export function parseDurationMonths(duration: string) {
  const normalized = duration.toLowerCase();
  if (normalized.includes("year")) return 12;
  const match = normalized.match(/(\d+)\s*month/);
  if (match) return Number(match[1]);
  return 1;
}

export const defaultMembershipPlans: MembershipPlan[] = [
  { name: "Monthly Membership", duration: "1 month", durationMonths: 1, price: gymPricing.monthly.regular, monthlyDues: gymPricing.monthly.regular, initiationFee: 0, studentPrice: gymPricing.monthly.student, studentMonthlyDues: gymPricing.monthly.student, studentInitiationFee: 0, active: true, used: 84, freeIntroMonths: 0 },
  { name: "Monthly Membership with Coaching", duration: "1 month", durationMonths: 1, price: gymPricing.monthlyWithCoach.regular, monthlyDues: gymPricing.monthlyWithCoach.regular, initiationFee: 150, studentPrice: gymPricing.monthlyWithCoach.student, studentMonthlyDues: gymPricing.monthlyWithCoach.student, studentInitiationFee: 100, active: true, used: 32, promoName: "New member launch", promoDiscountPercent: 12, freeIntroMonths: 1 },
];

export const defaultServicePrices: ServicePrice[] = [
  { id: "SR-WALKIN", name: "Non-member walk-in", category: "Walk-in access", amount: gymPricing.walkIn.regular, studentAmount: gymPricing.walkIn.student, active: true },
  { id: "SR-WALKIN-COACH", name: "Walk-in with coach (1 hour)", category: "Coaching", amount: gymPricing.walkInWithCoach.regular, studentAmount: gymPricing.walkInWithCoach.student, active: true },
  { id: "SR-MEMBER-WALKIN", name: "Existing member walk-in", category: "Walk-in access", amount: 0, studentAmount: 0, active: true },
];

export const defaultPaymentMethods: PaymentMethod[] = [
  { id: "PM-CASH", code: "cash", name: "Cash", active: true },
  { id: "PM-GCASH", code: "gcash", name: "GCash", active: true },
  { id: "PM-MAYA", code: "maya", name: "Maya", active: true },
  { id: "PM-BANK", code: "bank-transfer", name: "Bank Transfer", active: true },
  { id: "PM-CARD", code: "card", name: "Credit/Debit Card", active: true },
  { id: "PM-OTHER", code: "other", name: "Other", active: true },
];

export function priceForCustomer(price: { amount: number; studentAmount?: number }, classification?: string) {
  return classification === "Student" ? price.studentAmount ?? price.amount : price.amount;
}

export function membershipPrice(plan: Pick<MembershipPlan, "price" | "studentPrice" | "monthlyDues" | "studentMonthlyDues" | "promoDiscountPercent" | "promoName" | "freeIntroMonths" | "initiationFee" | "studentInitiationFee">, classification?: string) {
  if (classification === "Student") return plan.studentPrice ?? plan.price;
  return plan.price;
}

export function planPricingSummary(plan: Partial<MembershipPlan>, classification?: string) {
  const regularMonthly = classification === "Student" ? (plan.studentMonthlyDues ?? plan.monthlyDues ?? plan.price ?? 0) : (plan.monthlyDues ?? plan.price ?? 0);
  const regularInitiation = classification === "Student" ? (plan.studentInitiationFee ?? plan.initiationFee ?? 0) : (plan.initiationFee ?? 0);
  const promoPercent = plan.promoDiscountPercent ?? 0;
  const promoAmount = regularMonthly * (promoPercent / 100);
  const netMonthly = Math.max(regularMonthly - promoAmount, 0);
  return {
    monthly: regularMonthly,
    initiationFee: regularInitiation,
    promoPercent,
    promoAmount,
    discountedMonthly: netMonthly,
    freeIntroMonths: plan.freeIntroMonths ?? 0,
    promoLabel: plan.promoName ? `${plan.promoName} (${promoPercent}% off)` : promoPercent > 0 ? `${promoPercent}% off` : "No promotion",
  };
}
