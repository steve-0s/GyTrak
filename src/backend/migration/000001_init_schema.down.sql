-- Drop tables in reverse dependency order.

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;

DROP TABLE IF EXISTS reminder_attempts;
DROP TABLE IF EXISTS membership_reminders;
DROP TABLE IF EXISTS reminder_templates;

DROP TABLE IF EXISTS rfid_events;
DROP TABLE IF EXISTS rfid_assignments;
DROP TABLE IF EXISTS rfid_devices;
DROP TABLE IF EXISTS rfid_keyfobs;

DROP TABLE IF EXISTS attendance_corrections;
DROP TABLE IF EXISTS attendance_records;

DROP TABLE IF EXISTS transaction_adjustments;
DROP TRIGGER IF EXISTS trg_enforce_payment_amount_not_below_allocations ON payments;
DROP TRIGGER IF EXISTS trg_enforce_payment_allocation_amount ON payment_allocations;
DROP FUNCTION IF EXISTS enforce_payment_amount_not_below_allocations();
DROP FUNCTION IF EXISTS enforce_payment_allocation_amount();
DROP TABLE IF EXISTS payment_allocations;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS transaction_items;
DROP TABLE IF EXISTS transactions;

DROP TABLE IF EXISTS membership_periods;
DROP TABLE IF EXISTS membership_billing_pauses;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS membership_policies;
DROP TABLE IF EXISTS membership_plan_prices;
DROP TABLE IF EXISTS membership_plans;

DROP TABLE IF EXISTS coach_branch_assignments;
DROP TABLE IF EXISTS coaches;

DROP TABLE IF EXISTS customers;

DROP TABLE IF EXISTS user_branch_assignments;
DROP TABLE IF EXISTS branches;

DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;