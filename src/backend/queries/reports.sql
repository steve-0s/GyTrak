-- name: RevenueByBranch :many
WITH gross_payments AS (
    SELECT t.branch_id, t.id AS transaction_id, p.id AS payment_id, p.amount
    FROM payments p
    JOIN transactions t ON t.id = p.transaction_id
    WHERE p.status IN ('completed', 'refunded')
      AND p.paid_at >= $1
      AND p.paid_at < $2
), refunds AS (
    SELECT t.branch_id, t.id AS transaction_id, ta.id AS adjustment_id, ta.amount
    FROM transaction_adjustments ta
    JOIN transactions t ON t.id = ta.transaction_id
    WHERE ta.adjustment_type = 'refund'
      AND ta.direction = 'decrease'
      AND ta.occurred_at >= $1
      AND ta.occurred_at < $2
), event_transactions AS (
    SELECT branch_id, transaction_id FROM gross_payments
    UNION
    SELECT branch_id, transaction_id FROM refunds
), branch_totals AS (
    SELECT b.id AS branch_id,
           COALESCE((SELECT SUM(g.amount) FROM gross_payments g WHERE g.branch_id = b.id), 0)::numeric AS gross_collected,
           COALESCE((SELECT SUM(r.amount) FROM refunds r WHERE r.branch_id = b.id), 0)::numeric AS refunds,
           (SELECT COUNT(*) FROM event_transactions e WHERE e.branch_id = b.id) AS transaction_count
    FROM branches b
    WHERE ($3::uuid IS NULL OR b.id = $3)
)
SELECT b.branch_id, br.name AS branch_name,
       b.gross_collected,
       b.refunds,
       (b.gross_collected - b.refunds)::numeric AS net_revenue,
       (b.gross_collected - b.refunds)::numeric AS revenue,
       b.transaction_count::bigint AS transaction_count
FROM branch_totals b
JOIN branches br ON br.id = b.branch_id
ORDER BY net_revenue DESC, branch_name;

-- Refunds use transaction_adjustments.occurred_at; original payments use
-- payments.paid_at. Do not join allocations or line items when summing.
-- name: AttendanceSummaryByBranch :many
SELECT b.id AS branch_id, b.name AS branch_name,
       COUNT(a.id) FILTER (WHERE a.status <> 'voided')::bigint AS attendance_count,
       COUNT(DISTINCT a.customer_id) FILTER (WHERE a.status <> 'voided')::bigint AS unique_customers
FROM branches b
LEFT JOIN attendance_records a ON a.branch_id = b.id
  AND a.business_date >= $1 AND a.business_date < $2
WHERE ($3::uuid IS NULL OR b.id = $3)
GROUP BY b.id, b.name
ORDER BY attendance_count DESC, b.name;

-- name: MembershipStatusSummaryByBranch :many
SELECT b.id AS branch_id, b.name AS branch_name, m.status, COUNT(*)::bigint AS membership_count
FROM memberships m
JOIN branches b ON b.id = m.branch_id
WHERE m.created_at >= $1 AND m.created_at < $2
  AND ($3::uuid IS NULL OR b.id = $3)
GROUP BY b.id, b.name, m.status
ORDER BY b.name, m.status;

-- name: AuditLogReport :many
SELECT * FROM audit_logs
WHERE ($1::uuid IS NULL OR branch_id = $1)
  AND occurred_at >= $2 AND occurred_at < $3
ORDER BY occurred_at DESC
LIMIT $4 OFFSET $5;

-- Revenue is based on original eligible payment events minus refund adjustments
-- in the period represented by each event's applicable timestamp.
