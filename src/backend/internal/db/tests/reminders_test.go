package tests

import (
	"context"
	db "gytrak/backend/internal/db"
	"testing"
)

func TestReminderQueriesFilterNotificationsByRecipient(t *testing.T) {
	d := NewTestDatabase(t)
	seedCoreRecords(t, d)
	ctx := context.Background()
	user := testUUID("00000000-0000-0000-0000-000000000001")
	if _, err := d.Queries.CreateNotification(ctx, db.CreateNotificationParams{RecipientUserID: user, BranchID: testUUID("00000000-0000-0000-0000-000000000101"), NotificationType: "reminder", Title: "Test", Message: "Test"}); err != nil {
		t.Fatal(err)
	}
	rows, err := d.Queries.ListNotifications(ctx, db.ListNotificationsParams{RecipientUserID: user, Limit: 10, Offset: 0})
	if err != nil || len(rows) != 1 {
		t.Fatalf("notifications=%d err=%v", len(rows), err)
	}
}
