# GyTrak — Gym Management System

GyTrak is an offline-first, multi-branch gym management system designed to simplify customer and membership management, coach records, RFID keyfob assignments, and attendance tracking. It supports QR code self-registration for walk-in visitors, manual attendance management, role-based access control, reporting, and automatic synchronization with a central database when an internet connection is restored.

## Features

### Customer and Membership Management

- **Customer Profiles** — Create, view, update, and manage customer information, including walk-in visitors and registered members.
- **Membership Management** — Manage membership plans, statuses, renewals, and membership history.
- **Walk-in Management** — Record one-time gym visits, visit fees, payments, and attendance for customers without an active membership.
- **Membership Conversion** — Convert an existing walk-in customer into a registered member without creating a duplicate profile.
- **Coach Management** — Maintain coach records and related information.

### QR Code Self-Registration

- **QR Code Registration** — Allow new visitors to scan a branch-specific QR code and fill out their own registration information using a mobile-friendly page.
- **Returning Visitor Check-in** — Allow returning walk-in visitors to verify their identity and use their existing customer profile.
- **Duplicate Prevention** — Check for existing profiles and flag potential duplicates for review instead of automatically creating another profile.
- **Branch Identification** — Associate registration and visit records with the appropriate gym branch.
- **Profile Reuse** — Keep customer details, visit history, and membership records linked to one customer profile.
- **Registration and Check-in Separation** — Prevent registration alone from automatically confirming physical attendance.

### RFID and Attendance Management

- **RFID Keyfob Assignment** — Assign, deactivate, and reassign RFID keyfobs while maintaining assignment history.
- **RFID Attendance Tracking** — Use the attendance scanner for member time-in/time-out. A separate keyfob-assignment scanner reads RFID UIDs without creating attendance.
- **Manual Attendance Management** — Allow Admin and authorized Front Desk staff to create, correct, and void attendance records while preserving audit history.
- **Walk-in Check-in** — Support manual check-in and check-out for walk-in visitors, with optional temporary RFID passes.
- **Attendance Monitoring** — View attendance records, customer visit history, and branch activity.
- **Audit Trail** — Track manual attendance changes, including the staff member responsible, timestamp, and reason for the change.

### Multi-Branch Management

- **Branch Management** — Create, update, and deactivate gym branches.
- **Branch-Specific Operations** — Manage memberships, visits, attendance, and keyfob assignments by branch.
- **Front Desk Assignment** — Assign Front Desk accounts to one or more branches and restrict their records and actions to those assignments.
- **Globally Shared Customer Profiles** — Keep one customer identity across branches; memberships belong to a specific branch and are never duplicated merely because the customer uses multiple locations.

### Offline Support and Synchronization

- **Offline Attendance** — Record attendance locally when the internet is unavailable.
- **Automatic Synchronization** — Upload pending attendance events to the central database when connectivity returns.
- **Duplicate Sync Prevention** — Use unique event identifiers and idempotent synchronization to prevent duplicate attendance records.
- **Sync Monitoring** — Monitor pending records, synchronization failures, and scanner connectivity.

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
- Assign and manage RFID keyfobs.
- Monitor RFID time-in and time-out records.
- Manually create, view, correct, and void attendance records without deleting their history.
- Generate and export branch-specific reports.
- Monitor scanner status and pending attendance synchronization.

### Security and Permissions

- Enforce permissions on the backend, not only in the user interface.
- Restrict front desk access to assigned branches.
- Validate access to customer, membership, payment, and attendance records.
- Record important administrative actions in audit logs.
- Protect customer information and prevent unauthorized profile access.

## RFID Attendance Workflow

GyTrak is designed to continue recording attendance even when the internet is unavailable.

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
2. The visitor fills out the required information through a mobile-friendly registration page.
3. GyTrak checks for an existing customer profile or potential duplicate.
4. A new customer profile is created, or the existing profile is retrieved after identity verification.
5. The visit is recorded separately from registration and confirmed when the visitor actually checks in at the gym.
6. Returning walk-in visitors can use their existing profiles for subsequent visits.
7. If a walk-in purchases a membership, front desk staff update the customer's membership information and assign an RFID keyfob without creating another profile.

## Confirmed Business Rules

- Customer records are globally shared and identified by a stable customer ID. Phone and email uniqueness is not yet decided.
- Memberships are branch-specific and billed monthly. Renewal should extend the existing membership record where practical, while preserving payment history and membership-date history. A pending or partial payment does not activate a membership; membership status and payment status remain separate.
- Walk-in fees are separate from membership payments and revenue. Attendance records are separate from financial transactions. Reminders, attendance events, and renewals must not create payments automatically.
- Admin users can access all branches. Front Desk users can be assigned to multiple branches and can access or act only within those branches. Authorization must be enforced by application rules, not only by hidden UI controls.
- A customer may hold multiple active keyfobs. A keyfob UID can have only one active assignment at a time; deactivated UIDs may be reassigned without erasing prior assignment history.
- The normal attendance flow uses the first valid scan for time-in, the next valid scan for time-out, and allows a later new session on the same business day after closure. Open-session conflicts and duplicate scanner events must be prevented or audited.
- Authorized staff can add missing time-outs, correct attendance dates/times, and void invalid records. Manual and RFID attendance use the same logical attendance model and every correction records original values, new values, actor, timestamp, and reason where required.
- Public QR submissions must have creation and expiration timestamps, and expired submissions must be rejected before processing. Exact duration, rate limits, and identity verification are unresolved.
- Use `Asia/Manila` as the business timezone. The business day runs midnight to midnight in that timezone for attendance and daily reports.

## Unresolved Business Decisions

See `docs/database-schema-proposal.md` for database-level alternatives and trade-offs. Pending decisions include contact uniqueness; refunds, voids, discounts, and taxes; QR expiration duration, rate limits, and identity verification; duplicate-scan cooldown and second-session approval; scanner/device event identity and resend guarantees; audit actor handling for public events; and whether a separate membership-period history table is needed.

The business rules above describe intended behavior. The schema proposal documents a future relational design; they do not mean every rule is already implemented in the current frontend prototype.

## Tech Stack

- **Go** — Backend development
- **Gin** — HTTP routing and API development
- **SQLite** — Local storage and offline attendance records
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
- Support reliable offline attendance recording and synchronization.
- Provide useful reports for attendance, revenue, and branch performance.
- Maintain data consistency, security, and accountability.

## Development Status

GyTrak is currently under development. Features, architecture, and implementation details may change as development progresses.

## License

No license has been selected yet.
