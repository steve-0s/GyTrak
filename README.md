# GyTrak — Gym Management System

GyTrak is a multi-branch gym management system designed to simplify customer and membership management, coach records, and attendance tracking. The planned first release is online-only, uses staff-entered attendance, supports public QR profile registration, and includes membership reminders. Offline synchronization and gym scanner hardware are not part of the first release.

## Features

### Customer and Membership Management

- **Customer Profiles** — Create, view, update, and manage customer information, including walk-in visitors and registered members.
- **Membership Management** — Manage membership plans, statuses, renewals, and immutable membership-term history.
- **Walk-in Management** — Record one-time gym visits, visit fees, payments, and attendance for customers without an active membership.
- **Membership Conversion** — Convert an existing walk-in customer into a registered member without creating a duplicate profile.
- **Coach Management** — Maintain coach records and related information.
- **Membership Reminders** — Send reminders for memberships approaching or past their due date. Delivery-provider, channel, and consent configuration remain to be finalized.

### QR Code Self-Registration

- **QR Code Registration** — Allow new visitors to scan a branch-specific QR code and fill out their own registration information using a mobile-friendly page.
- **Returning Visitor Profiles** — Let returning visitors provide their contact details so staff can find and select an existing customer profile.
- **Duplicate Review** — Compare normalized phone numbers and exact email matches, and require staff to review matches before creating a profile.
- **Branch Identification** — Associate registration and visit records with the appropriate gym branch.
- **Profile Reuse** — Keep customer details, visit history, and membership records linked to one customer profile.
- **Registration and Attendance Separation** — Registration alone never activates a membership or records physical attendance. Staff record attendance manually in the first release.

### RFID and Attendance Management

- **Manual Attendance Management (First Release)** — Let authorized staff create, correct, and void attendance records while preserving audit history.
- **RFID Keyfob Assignment (Post-Release)** — Plan to assign, deactivate, and reassign RFID keyfobs while maintaining assignment history.
- **RFID Attendance Tracking (Post-Release)** — Plan separate attendance and keyfob-assignment scanners; scanner events must not be required for first-release attendance.
- **Walk-in Check-in** — Staff manually record walk-in attendance and check-out. Scanner-based check-in is not part of the first release.
- **Attendance Monitoring** — View attendance records, customer visit history, and branch activity.
- **Audit Trail** — Track attendance changes, including the staff member responsible, timestamp, and reason for the change.

### Multi-Branch Management

- **Branch Management** — Create, update, and deactivate gym branches.
- **Branch-Specific Operations** — Manage memberships, visits, attendance, and keyfob assignments by branch.
- **Front Desk Assignment** — Assign Front Desk accounts to one or more branches and restrict their records and actions to those assignments.
- **Globally Shared Customer Profiles** — Keep one customer identity across branches; memberships belong to a specific branch and are never duplicated merely because the customer uses multiple locations.

### Post-Release: Offline and Scanner Support

Offline attendance, automatic synchronization, scanner event processing, and sync monitoring are planned for a later release. They are explicitly out of scope for the online, manual-attendance first release.

### Reporting and Analytics

- **Attendance Reports** — Generate daily, weekly, monthly, yearly, and custom date-range reports.
- **Customer Activity** — Review customer attendance history, visit frequency, and membership activity.
- **Walk-in Reports** — Monitor walk-in visits, visit fees, and recorded revenue.
- **Branch Performance** — Compare attendance and customer activity across branches.
- **Payment Reports** — Review recorded membership and walk-in payments.
- **Audit Reports** — Review manual attendance changes and other important administrative actions.
- **Report Export** — Support CSV and PDF exports.
- **Role-Based Reporting** — Restrict reports and analytics according to the user's role and branch assignments.

## User Roles and Access Control

GyTrak uses role-based access control (RBAC) to manage permissions across multiple gym branches.

### Admin — Gym Owner

The Admin has system-wide access and oversees all branches.

- Create, update, and deactivate branches.
- Create and manage front desk accounts.
- Assign front desk staff to specific branches.
- View business-wide dashboards, statistics, and analytics.
- Access customer, membership, attendance, and visit records across branches.
- Compare branch performance and activity.
- View walk-in activity and recorded revenue.
- Access reports and audit logs across all branches.
- Manage system-wide settings and permissions.

### Front Desk — Branch Staff

Front Desk accounts manage day-to-day operations within their assigned branches.

- View branch-specific dashboards and attendance statistics.
- Manage customer profiles, membership information, and coach records.
- Review QR self-registration submissions and resolve potential duplicate profiles.
- Register walk-in visits and record payments.
- Convert walk-in customers into registered members.
- Assign and manage RFID keyfobs (post-release).
- Monitor RFID time-in/time-out and synchronization (post-release).
- Manually create, view, correct, and void attendance records without deleting their history.
- Generate and export branch-specific reports.
- Monitor scanner status and pending attendance synchronization (post-release).

### Security and Permissions

- Enforce permissions on the backend, not only in the user interface.
- Restrict front desk access to assigned branches.
- Validate access to customer, membership, payment, and attendance records.
- Record important administrative actions in audit logs.
- Protect customer information and prevent unauthorized profile access.

## RFID Attendance Workflow

This scanner workflow is planned for a post-release phase. The first release records attendance manually and does not require RFID hardware or offline synchronization.

1. A member scans their RFID keyfob on the branch attendance scanner.
2. The first valid scan creates time-in for the member's `Asia/Manila` business day; the next valid scan closes the open session as time-out.
3. After a session closes, a later valid scan may start a new session on the same business day.
4. Duplicate events and conflicting open sessions must be detected rather than silently creating incorrect records.
5. Offline records may remain pending for later idempotent synchronization while preserving the original events.

### Scanner Functions

- **Attendance scanner:** Processes valid RFID scans as time-in/time-out events for the branch business day.
- **Keyfob assignment scanner:** Reads an RFID UID during assignment, reassignment, or deactivation. It never creates attendance.
- The branch and scanner identity should be captured with each scanner event. Device IDs, event IDs, and resend guarantees remain unresolved design decisions.

## QR Code Registration Workflow

1. A visitor scans the QR code displayed at the gym branch.
2. The visitor submits their contact details through the branch's mobile-friendly public registration page.
3. Staff review possible profile matches before creating a profile. The public page does not reveal matching customers.
4. Staff may select an existing profile or confirm that the visitor is a different person before creating a separate profile.
5. Registration does not confirm attendance, take payment, or activate a membership. Staff record any visit manually.
6. Returning visitors can provide the same contact details so staff can find and reuse their existing profile.

Membership reminder delivery is part of the first-release scope. Exact QR expiration, identity-verification, and rate-limit rules, as well as reminder provider, channel, and consent settings, remain to be finalized.

## Confirmed Business Rules

- Customer profiles are globally shared and identified by a stable customer ID. Phone numbers are normalized for matching; exact email matches are also checked. Phone and email are not globally unique because they may be shared. Potential duplicates must be reviewed before profile creation. Staff may select a matching profile or explicitly confirm that the new person is distinct.
- Memberships are branch-specific and billed monthly. Each renewal creates a separate membership term linked to the same customer and the previous term. Preserve each term's dates, plan, pricing, and associated payment. An early renewal starts the day after the current term ends. For an expired membership, the new term starts on the payment/activation date unless staff explicitly selects another start date. A term does not activate until its required payment is complete; membership status and payment status remain separate.
- Completed financial records are immutable. Pending payments may be edited or cancelled before completion. Correct an incorrect completed payment by preserving and voiding/reversing it with a reason, then recording the correct payment. Record partial and full refunds separately, with the actual refund occurrence date; never change the original payment date. Refunds cannot exceed the refundable amount, and fully refunded payments do not count as recognized revenue. Record discount amount and reason, applicable tax amount and rate, and payment-method corrections with an audit trail. Require reasons for voids, refunds, and corrections.
- Walk-in fees are separate from membership payments and revenue. Attendance records are separate from financial transactions. Reminders, attendance events, and renewals must not create payments automatically.
- Admin users can access all branches. Front Desk users can be assigned to multiple branches and can access or act only within those branches. Authorization must be enforced by application rules, not only by hidden UI controls.
- A customer may hold multiple active keyfobs. A keyfob UID can have only one active assignment at a time; deactivated UIDs may be reassigned without erasing prior assignment history.
- Manual attendance may contain multiple completed visits for the same customer on the same day. Each visit has its own time-in and time-out. Warn staff when a completed visit already exists, but allow another visit. Prevent overlapping or invalid sessions. Require a reason for manual corrections and voids, record the actor and time, and preserve the original attendance values in the audit history.
- The first release is online-only and attendance is entered manually. RFID scanning and offline synchronization are post-release capabilities; scanner events are not required to operate v1.
- Public QR registration collects a profile request only; it does not itself confirm physical attendance, take payment, or activate membership. Public submissions must have creation and expiration timestamps, and expired submissions must be rejected before processing.
- Use `Asia/Manila` as the business timezone. The business day runs midnight to midnight in that timezone for attendance and daily reports.

## Unresolved Business Decisions

See `docs/database-schema-proposal.md` for database-level alternatives and trade-offs. Remaining first-release decisions include QR expiration duration, identity verification, and rate limits; reminder delivery provider, channels, scheduling, and consent; how anonymous public QR submissions are represented in audit history; and which staff may select an alternate start date for an expired renewal and what dates are allowed. RFID scanner identity, event deduplication, and offline resend rules are post-release decisions. Phone/email uniqueness, renewal-term history, payment reversals/refunds, and manual same-day attendance rules are no longer open decisions.

The business rules above describe intended behavior. The schema proposal documents a future relational design; they do not mean every rule is already implemented in the current frontend prototype.

## Tech Stack

- **Go** — Backend development
- **Gin** — HTTP routing and API development
- **SQLite** — Potential local store for a future offline phase; not part of the first release
- **PostgreSQL** — Central database
- **Supabase** — Managed PostgreSQL hosting
- **sqlc** — Type-safe database query generation
- **JWT or PASETO** — API authentication (to be determined)
- **Redis** — Optional caching and rate limiting

## Project Goals

- Simplify daily gym operations across multiple branches.
- Improve customer, membership, and attendance management.
- Reduce duplicate customer profiles and preserve visit history.
- Make walk-in registration faster through QR codes.
- Add reliable offline attendance recording and synchronization in a future release.
- Provide useful reports for attendance, revenue, and branch performance.
- Maintain data consistency, security, and accountability.

## Development Status

GyTrak is currently under development. Features, architecture, and implementation details may change as development progresses.

The first release is planned as an online system with manual attendance, public QR profile registration, and membership reminders. RFID scanners and offline synchronization are deferred. The current frontend is a prototype; its browser-local mock storage does not deliver QR submissions to staff or send real reminders.

## License

No license has been selected yet.
