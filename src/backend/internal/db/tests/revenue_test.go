package tests

import (
	"context"
	"encoding/hex"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	db "gytrak/backend/internal/db"
)

func TestRevenueByBranchUsesRefundOccurrenceAndDoesNotDoubleCount(t *testing.T) {
	testDB := NewTestDatabase(t)
	seedRevenueFixture(t, testDB)

	rows, err := testDB.Queries.RevenueByBranch(context.Background(), dbRevenueParams(
		time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC),
	))
	if err != nil {
		t.Fatalf("RevenueByBranch: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("RevenueByBranch returned %d rows, want 1", len(rows))
	}
	gross, _ := rows[0].GrossCollected.Float64Value()
	refunds, _ := rows[0].Refunds.Float64Value()
	if gross.Float64 != 2000 || refunds.Float64 != 0 || rows[0].TransactionCount != 1 {
		t.Fatalf("October revenue = gross %v, refunds %v, transactions %d; want 2000, 0, 1", gross.Float64, refunds.Float64, rows[0].TransactionCount)
	}

	rows, err = testDB.Queries.RevenueByBranch(context.Background(), dbRevenueParams(
		time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC),
	))
	if err != nil {
		t.Fatalf("RevenueByBranch refund period: %v", err)
	}
	refunds, _ = rows[0].Refunds.Float64Value()
	net, _ := rows[0].NetRevenue.Float64Value()
	if refunds.Float64 != 500 || net.Float64 != -500 || rows[0].TransactionCount != 1 {
		t.Fatalf("November revenue = refunds %v, net %v, transactions %d; want 500, -500, 1", refunds.Float64, net.Float64, rows[0].TransactionCount)
	}
}

func seedRevenueFixture(t *testing.T, testDB *TestDatabase) {
	t.Helper()
	_, err := testDB.Pool.Exec(context.Background(), `
INSERT INTO users (id, full_name, email, password_hash)
VALUES ('00000000-0000-0000-0000-000000000001', 'DB Test User', 'db-test@example.com', 'test-only');
INSERT INTO branches (id, name) VALUES ('00000000-0000-0000-0000-000000000101', 'DB Test Branch');
INSERT INTO customers (id, customer_code, branch_id, first_name, last_name)
VALUES ('00000000-0000-0000-0000-000000000201', 'DB-TEST-001', '00000000-0000-0000-0000-000000000101', 'DB', 'Customer');
INSERT INTO membership_plans (id, name, duration_value, duration_unit)
VALUES ('00000000-0000-0000-0000-000000000301', 'DB Test Plan', 1, 'months');
INSERT INTO memberships (id, customer_id, branch_id, plan_id, customer_type, duration_value, duration_unit,
    monthly_dues, initiation_fee, initiation_fee_waived_amount, free_intro_months,
    initial_amount_due, outstanding_balance, initiation_fee_outstanding, monthly_dues_outstanding,
    payment_status, renewal_eligible, status, start_date, end_date, next_payment_due_date)
VALUES ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301',
    'regular', 1, 'months', 2000, 0, 0, 0, 2000, 0, 0, 0, 'paid', true, 'active',
    '2026-10-01', '2026-10-31', '2026-10-01');
INSERT INTO transactions (id, branch_id, customer_id, membership_id, transaction_type, status, subtotal, total_amount, created_by)
VALUES ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000401',
    'membership', 'paid', 2000, 2000, '00000000-0000-0000-0000-000000000001');
INSERT INTO payments (id, transaction_id, amount, payment_method, status, paid_at, received_by)
VALUES ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000501',
    2000, 'cash', 'completed', '2026-10-10 12:00:00+00', '00000000-0000-0000-0000-000000000001');
INSERT INTO payment_allocations (id, payment_id, transaction_id, amount)
VALUES ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000501', 2000);
INSERT INTO transaction_adjustments (id, transaction_id, payment_id, adjustment_type, direction, amount, reason, created_by, created_at, occurred_at)
VALUES ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000501',
    '00000000-0000-0000-0000-000000000601', 'refund', 'decrease', 500, 'DB test refund',
    '00000000-0000-0000-0000-000000000001', '2026-10-20 12:00:00+00', '2026-11-05 12:00:00+00');
`)
	if err != nil {
		t.Fatalf("seed revenue fixture: %v", err)
	}
}

func dbRevenueParams(start, end time.Time) db.RevenueByBranchParams {
	return db.RevenueByBranchParams{
		PaidAt:   pgtype.Timestamptz{Time: start, Valid: true},
		PaidAt_2: pgtype.Timestamptz{Time: end, Valid: true},
		Column3:  testUUID("00000000-0000-0000-0000-000000000101"),
	}
}

func testUUID(value string) pgtype.UUID {
	decoded, err := hex.DecodeString(strings.ReplaceAll(value, "-", ""))
	if err != nil || len(decoded) != 16 {
		panic("invalid test UUID: " + value)
	}
	var bytes [16]byte
	copy(bytes[:], decoded)
	return pgtype.UUID{Bytes: bytes, Valid: true}
}
