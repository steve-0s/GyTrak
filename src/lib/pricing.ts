import type { MembershipPlan, ServicePrice } from "../types";

export const gymPricing = {
  walkIn: { regular: 100, student: 80 },
  walkInWithCoach: { regular: 200, student: 180 },
  monthly: { regular: 800, student: 600 },
  monthlyWithCoach: { regular: 1500, student: 1300 },
  coachingFeePerHour: 100,
} as const;

export const defaultMembershipPlans: MembershipPlan[] = [
  { name: "Monthly Membership", duration: "1 month", price: gymPricing.monthly.regular, studentPrice: gymPricing.monthly.student, active: true, used: 84 },
  { name: "Monthly Membership with Coaching", duration: "1 month", price: gymPricing.monthlyWithCoach.regular, studentPrice: gymPricing.monthlyWithCoach.student, active: true, used: 32 },
];

export const defaultServicePrices: ServicePrice[] = [
  { id: "SR-WALKIN", name: "Non-member walk-in", category: "Walk-in access", amount: gymPricing.walkIn.regular, studentAmount: gymPricing.walkIn.student, active: true },
  { id: "SR-WALKIN-COACH", name: "Walk-in with coach (1 hour)", category: "Coaching", amount: gymPricing.walkInWithCoach.regular, studentAmount: gymPricing.walkInWithCoach.student, active: true },
  { id: "SR-MEMBER-WALKIN", name: "Existing member walk-in", category: "Walk-in access", amount: 0, studentAmount: 0, active: true },
];

export function priceForCustomer(price: { amount: number; studentAmount?: number }, classification?: string) {
  return classification === "Student" ? price.studentAmount ?? price.amount : price.amount;
}

export function membershipPrice(plan: Pick<MembershipPlan, "price" | "studentPrice">, classification?: string) {
  return classification === "Student" ? plan.studentPrice ?? plan.price : plan.price;
}
