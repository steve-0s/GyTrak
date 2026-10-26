import type { Membership, PaymentRecord } from "../types";

export function isCollectedPayment(
  payment: Pick<PaymentRecord, "status" | "category">,
) {
  return (
    (payment.status === "Paid" || payment.status === "Partially paid") &&
    payment.category !== "Promo discount"
  );
}

export function membershipOutstandingBalance(membership: Membership) {
  if (membership.outstandingBalance !== undefined) {
    return Math.max(0, membership.outstandingBalance);
  }
  if (membership.payment === "Pending") {
    return Math.max(0, membership.initialAmountDue ?? membership.price);
  }
  return 0;
}
