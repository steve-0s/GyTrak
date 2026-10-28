-- name: ListMembershipReminders :many
SELECT r.*, c.first_name, c.last_name, m.branch_id, b.name AS branch_name
FROM membership_reminders r
JOIN customers c ON c.id = r.customer_id
JOIN memberships m ON m.id = r.membership_id
JOIN branches b ON b.id = m.branch_id
WHERE ($1::uuid IS NULL OR m.branch_id = $1)
  AND ($2::text = '' OR r.status = $2)
ORDER BY COALESCE(r.scheduled_at, r.eligible_at, r.created_at), r.created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountMembershipReminders :one
SELECT COUNT(*)::bigint AS count
FROM membership_reminders r
JOIN memberships m ON m.id = r.membership_id
WHERE ($1::uuid IS NULL OR m.branch_id = $1)
  AND ($2::text = '' OR r.status = $2);

-- name: CreateMembershipReminder :one
INSERT INTO membership_reminders (membership_id, customer_id, scheduled_at, stage, source, channel, eligible_at, message, reason, note, status, template_id, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: MarkReminderStatus :one
UPDATE membership_reminders SET status = $2
WHERE id = $1
RETURNING *;

-- name: CreateReminderAttempt :one
INSERT INTO reminder_attempts (reminder_id, channel, status, result_details)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListReminderAttempts :many
SELECT * FROM reminder_attempts WHERE reminder_id = $1 ORDER BY attempted_at DESC;

-- name: ListNotifications :many
SELECT * FROM notifications
WHERE recipient_user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CreateNotification :one
INSERT INTO notifications (recipient_user_id, branch_id, notification_type, title, message, entity_type, entity_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: MarkNotificationRead :one
UPDATE notifications SET read_at = CURRENT_TIMESTAMP
WHERE id = $1 AND recipient_user_id = $2
RETURNING *;
