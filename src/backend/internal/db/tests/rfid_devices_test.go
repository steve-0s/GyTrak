package tests

import (
	"context"
	db "gytrak/backend/internal/db"
	"testing"
)

func TestRFIDDeviceQueriesSupportBranchListingAndStatus(t *testing.T) {
	d := NewTestDatabase(t)
	seedCoreRecords(t, d)
	ctx := context.Background()
	branch := testUUID("00000000-0000-0000-0000-000000000101")
	device, err := d.Queries.CreateRFIDDevice(ctx, db.CreateRFIDDeviceParams{BranchID: branch, DeviceName: "Scanner", DeviceType: "attendance_scanner", DeviceIdentifier: "scanner-test"})
	if err != nil {
		t.Fatal(err)
	}
	if rows, err := d.Queries.ListRFIDDevicesByBranch(ctx, db.ListRFIDDevicesByBranchParams{BranchID: branch, Column2: "active", Limit: 10, Offset: 0}); err != nil || len(rows) != 1 {
		t.Fatalf("devices=%d err=%v", len(rows), err)
	}
	if _, err = d.Queries.SetRFIDDeviceStatus(ctx, db.SetRFIDDeviceStatusParams{ID: device.ID, Status: "inactive"}); err != nil {
		t.Fatal(err)
	}
}
