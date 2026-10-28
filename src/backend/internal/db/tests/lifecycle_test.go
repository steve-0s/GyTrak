package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	db "gytrak/backend/internal/db"
)

func TestCustomerBranchHistoryArchiveRestoreAndDeleteGuard(t *testing.T) {
	testDB := NewTestDatabase(t)
	seedCoreRecords(t, testDB)
	ctx := context.Background()
	customerID := testUUID("00000000-0000-0000-0000-000000000201")
	branchOne := testUUID("00000000-0000-0000-0000-000000000101")
	branchTwo := testUUID("00000000-0000-0000-0000-000000000102")
	userID := testUUID("00000000-0000-0000-0000-000000000001")

	initial, err := testDB.Queries.CreateCustomerBranchHistory(ctx, db.CreateCustomerBranchHistoryParams{
		CustomerID: customerID, BranchID: branchOne, AssignedBy: userID, Reason: stringPtr("initial"),
	})
	if err != nil {
		t.Fatalf("create initial branch history: %v", err)
	}
	endedAt := pgtype.Timestamptz{Time: time.Now().UTC().Add(time.Second), Valid: true}
	if _, err := testDB.Queries.EndCustomerBranchHistory(ctx, db.EndCustomerBranchHistoryParams{ID: initial.ID, EndedAt: endedAt}); err != nil {
		t.Fatalf("end branch history: %v", err)
	}
	if _, err := testDB.Queries.ReassignCustomerBranch(ctx, db.ReassignCustomerBranchParams{ID: customerID, BranchID: branchTwo}); err != nil {
		t.Fatalf("reassign customer: %v", err)
	}
	if _, err := testDB.Queries.CreateCustomerBranchHistory(ctx, db.CreateCustomerBranchHistoryParams{
		CustomerID: customerID, BranchID: branchTwo, AssignedBy: userID, Reason: stringPtr("reassignment"),
	}); err != nil {
		t.Fatalf("create reassignment history: %v", err)
	}
	history, err := testDB.Queries.ListCustomerBranchHistory(ctx, customerID)
	if err != nil || len(history) != 2 {
		t.Fatalf("branch history = %d rows, err=%v; want 2 rows", len(history), err)
	}

	if _, err := testDB.Queries.ArchiveCustomer(ctx, db.ArchiveCustomerParams{ID: customerID, ArchivedBy: userID, ArchiveReason: stringPtr("test")}); err != nil {
		t.Fatalf("archive customer: %v", err)
	}
	archived, err := testDB.Queries.ListArchivedCustomers(ctx, db.ListArchivedCustomersParams{Column1: branchTwo, Limit: 10, Offset: 0})
	if err != nil || len(archived) != 1 {
		t.Fatalf("archived customer rows = %d, err=%v; want 1", len(archived), err)
	}
	if _, err := testDB.Queries.RestoreCustomer(ctx, db.RestoreCustomerParams{ID: customerID, Status: "active"}); err != nil {
		t.Fatalf("restore customer: %v", err)
	}
	if _, err := testDB.Queries.DeleteCustomer(ctx, customerID); err == nil {
		t.Fatal("DeleteCustomer succeeded despite preserved branch history")
	} else if !isForeignKeyError(err) {
		t.Fatalf("DeleteCustomer error = %v, want foreign-key violation", err)
	}
}

func TestMembershipDueQueriesSeparateUpcomingAndOverdue(t *testing.T) {
	testDB := NewTestDatabase(t)
	seedCoreRecords(t, testDB)
	_, err := testDB.Pool.Exec(context.Background(), `
INSERT INTO memberships (id, customer_id, branch_id, plan_id, customer_type, duration_value, duration_unit,
 monthly_dues, initiation_fee, initiation_fee_waived_amount, free_intro_months, initial_amount_due,
 outstanding_balance, initiation_fee_outstanding, monthly_dues_outstanding, payment_status,
 renewal_eligible, status, start_date, end_date, next_payment_due_date)
VALUES
 ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000301','regular',1,'months',100,0,0,0,100,100,0,100,'pending',true,'active',CURRENT_DATE-60,CURRENT_DATE-30,CURRENT_DATE-1),
 ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000301','regular',1,'months',100,0,0,0,100,100,0,100,'pending',true,'active',CURRENT_DATE-1,CURRENT_DATE+30,CURRENT_DATE+3)
`)
	if err != nil {
		t.Fatalf("seed memberships: %v", err)
	}
	branchID := testUUID("00000000-0000-0000-0000-000000000101")
	upcoming, err := testDB.Queries.ListUpcomingMemberships(context.Background(), db.ListUpcomingMembershipsParams{Column1: branchID, Column2: 7})
	if err != nil || len(upcoming) != 1 {
		t.Fatalf("upcoming memberships = %d, err=%v; want 1", len(upcoming), err)
	}
	overdue, err := testDB.Queries.ListOverdueMemberships(context.Background(), branchID)
	if err != nil || len(overdue) != 1 {
		t.Fatalf("overdue memberships = %d, err=%v; want 1", len(overdue), err)
	}
	due, err := testDB.Queries.ListDueMemberships(context.Background(), db.ListDueMembershipsParams{Column1: branchID, Column2: 7})
	if err != nil || len(due) != 2 {
		t.Fatalf("due memberships = %d, err=%v; want both upcoming and overdue", len(due), err)
	}
}

func TestCoachAssignmentUniquenessAndArchivedListing(t *testing.T) {
	testDB := NewTestDatabase(t)
	seedCoreRecords(t, testDB)
	ctx := context.Background()
	coach, err := testDB.Queries.CreateCoach(ctx, db.CreateCoachParams{CoachCode: "COACH-TEST", FirstName: "Test", LastName: "Coach"})
	if err != nil {
		t.Fatalf("create coach: %v", err)
	}
	branchID := testUUID("00000000-0000-0000-0000-000000000101")
	if _, err := testDB.Queries.AssignCoachBranch(ctx, db.AssignCoachBranchParams{CoachID: coach.ID, BranchID: branchID, StartDate: pgtype.Date{Time: time.Now(), Valid: true}}); err != nil {
		t.Fatalf("assign coach: %v", err)
	}
	if _, err := testDB.Queries.AssignCoachBranch(ctx, db.AssignCoachBranchParams{CoachID: coach.ID, BranchID: branchID, StartDate: pgtype.Date{Time: time.Now(), Valid: true}}); err == nil {
		t.Fatal("duplicate active coach assignment succeeded")
	} else if !isForeignKeyOrUniqueError(err) {
		t.Fatalf("duplicate coach assignment error = %v", err)
	}
	userID := testUUID("00000000-0000-0000-0000-000000000001")
	if _, err := testDB.Queries.ArchiveCoach(ctx, db.ArchiveCoachParams{ID: coach.ID, ArchivedBy: userID, ArchiveReason: stringPtr("test")}); err != nil {
		t.Fatalf("archive coach: %v", err)
	}
	archived, err := testDB.Queries.ListArchivedCoaches(ctx, db.ListArchivedCoachesParams{Column1: branchID, Limit: 10, Offset: 0})
	if err != nil || len(archived) != 1 {
		t.Fatalf("archived coaches = %d, err=%v; want 1", len(archived), err)
	}
}

func TestWalkInCancellationVoidsRelatedAttendance(t *testing.T) {
	testDB := NewTestDatabase(t)
	seedCoreRecords(t, testDB)
	ctx := context.Background()
	_, err := testDB.Pool.Exec(ctx, `
INSERT INTO walk_ins (id, customer_id, branch_id, service_name, fee, payment_status, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','Day pass',100,'pending','checked_in','00000000-0000-0000-0000-000000000001');
INSERT INTO attendance_records (id, customer_id, branch_id, walk_in_id, business_date, time_in, source, status, sync_status, created_by)
VALUES ('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000501',CURRENT_DATE,CURRENT_TIMESTAMP,'manual','checked_in','synced','00000000-0000-0000-0000-000000000001')`)
	if err != nil {
		t.Fatalf("seed walk-in: %v", err)
	}
	walkInID := testUUID("00000000-0000-0000-0000-000000000501")
	userID := testUUID("00000000-0000-0000-0000-000000000001")
	voidReason := stringPtr("test cancellation")
	voided, err := testDB.Queries.VoidWalkInAttendance(ctx, db.VoidWalkInAttendanceParams{WalkInID: walkInID, VoidedBy: userID, VoidReason: voidReason})
	if err != nil || len(voided) != 1 || voided[0].Status != "voided" {
		t.Fatalf("voided attendance = %d rows, err=%v; want one voided row", len(voided), err)
	}
	if _, err := testDB.Queries.CancelWalkIn(ctx, walkInID); err != nil {
		t.Fatalf("cancel walk-in: %v", err)
	}
	var status string
	if err := testDB.Pool.QueryRow(ctx, "SELECT status FROM attendance_records WHERE id=$1", testUUID("00000000-0000-0000-0000-000000000502")).Scan(&status); err != nil || status != "voided" {
		t.Fatalf("attendance status = %q, err=%v; want voided", status, err)
	}
}

func TestRFIDActiveAssignmentAndDeviceStatusQueries(t *testing.T) {
	testDB := NewTestDatabase(t)
	seedCoreRecords(t, testDB)
	ctx := context.Background()
	branchID := testUUID("00000000-0000-0000-0000-000000000101")
	device, err := testDB.Queries.CreateRFIDDevice(ctx, db.CreateRFIDDeviceParams{BranchID: branchID, DeviceName: "Test Scanner", DeviceType: "attendance_scanner", DeviceIdentifier: "TEST-SCANNER"})
	if err != nil {
		t.Fatalf("create RFID device: %v", err)
	}
	if _, err := testDB.Queries.SetRFIDDeviceStatus(ctx, db.SetRFIDDeviceStatusParams{ID: device.ID, Status: "inactive"}); err != nil {
		t.Fatalf("retire RFID device: %v", err)
	}
	devices, err := testDB.Queries.ListRFIDDevicesByBranch(ctx, db.ListRFIDDevicesByBranchParams{BranchID: branchID, Column2: "inactive", Limit: 10, Offset: 0})
	if err != nil || len(devices) != 1 {
		t.Fatalf("inactive devices = %d, err=%v; want 1", len(devices), err)
	}
	if _, err := testDB.Queries.SetRFIDDeviceStatus(ctx, db.SetRFIDDeviceStatusParams{ID: device.ID, Status: "active"}); err != nil {
		t.Fatalf("reactivate RFID device: %v", err)
	}
	_, err = testDB.Pool.Exec(ctx, "INSERT INTO rfid_keyfobs (id, uid, status) VALUES ($1, $2, 'active')", testUUID("00000000-0000-0000-0000-000000000601"), "TEST-KEYFOB")
	if err != nil {
		t.Fatalf("create keyfob: %v", err)
	}
	assignment, err := testDB.Queries.AssignKeyfob(ctx, db.AssignKeyfobParams{KeyfobID: testUUID("00000000-0000-0000-0000-000000000601"), CustomerID: testUUID("00000000-0000-0000-0000-000000000201"), BranchID: branchID, AssignedBy: testUUID("00000000-0000-0000-0000-000000000001")})
	if err != nil {
		t.Fatalf("assign keyfob: %v", err)
	}
	active, err := testDB.Queries.ListActiveKeyfobsByBranch(ctx, db.ListActiveKeyfobsByBranchParams{BranchID: branchID, Limit: 10, Offset: 0})
	if err != nil || len(active) != 1 {
		t.Fatalf("active keyfobs = %d, err=%v; want 1", len(active), err)
	}
	if _, err := testDB.Queries.DeactivateKeyfobAssignment(ctx, db.DeactivateKeyfobAssignmentParams{ID: assignment.ID, DeactivatedBy: testUUID("00000000-0000-0000-0000-000000000001"), Reason: stringPtr("test")}); err != nil {
		t.Fatalf("deactivate keyfob assignment: %v", err)
	}
	active, err = testDB.Queries.ListActiveKeyfobsByBranch(ctx, db.ListActiveKeyfobsByBranchParams{BranchID: branchID, Limit: 10, Offset: 0})
	if err != nil || len(active) != 0 {
		t.Fatalf("active keyfobs after deactivation = %d, err=%v; want 0", len(active), err)
	}
}

func seedCoreRecords(t *testing.T, testDB *TestDatabase) {
	t.Helper()
	_, err := testDB.Pool.Exec(context.Background(), `
INSERT INTO users (id, full_name, email, password_hash) VALUES ('00000000-0000-0000-0000-000000000001','DB Test User','db-test@example.com','test-only');
INSERT INTO branches (id, name) VALUES ('00000000-0000-0000-0000-000000000101','DB Test Branch One'),('00000000-0000-0000-0000-000000000102','DB Test Branch Two');
INSERT INTO customers (id, customer_code, branch_id, first_name, last_name) VALUES ('00000000-0000-0000-0000-000000000201','DB-TEST-001','00000000-0000-0000-0000-000000000101','DB','Customer');
INSERT INTO membership_plans (id, name, duration_value, duration_unit) VALUES ('00000000-0000-0000-0000-000000000301','DB Test Plan',1,'months');`)
	if err != nil {
		t.Fatalf("seed core records: %v", err)
	}
}

func stringPtr(value string) *string { return &value }

func isForeignKeyError(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23503"
}

func isForeignKeyOrUniqueError(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && (pgErr.Code == "23503" || pgErr.Code == "23505")
}
