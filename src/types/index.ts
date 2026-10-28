export type Role = "Admin" | "Front Desk"
export type Theme = "light" | "dark"
export type BranchStatus = "Active" | "Inactive" | "Archived"
export type Branch = { id: string; name: string; location: string; status: BranchStatus; archivedAt?: string }
export type BranchRecord = Branch & { customers: number; memberships: number; visits: number; revenue: number; frontDesk: number }
export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  type: "Member" | "Walk-in"
  status: "Active" | "Pending" | "Expired" | "None" | "Archived"
  branch: string
  registered: string
  lastVisit: string
  plan?: string
  endDate?: string
  keyfob?: string
  classification?: "Regular" | "Student"
  photo?: string
  archivedAt?: string
  archivedFromStatus?: "Active" | "Pending" | "Expired" | "None"
}
export type RegistrationStatus = "Pending" | "Needs correction" | "Approved" | "Rejected"
export type RegistrationSubmission = {
  id: string
  reference: string
  branchId: string
  branch: string
  name: string
  phone: string
  email: string
  submittedAt: string
  status: RegistrationStatus
  possibleCustomerIds: string[]
  customerId?: string
  reviewedBy?: string
  reviewedAt?: string
  correctionNote?: string
}
export type WalkIn = {
  id: string
  customer: string
  customerId: string
  branch: string
  date: string
  timeIn: string
  timeOut: string
  fee: number
  payment: "Paid" | "Pending"
  method: string
  status: "Registered" | "Completed" | "Checked in" | "Cancelled"
  serviceName?: string
  attendanceId?: string
  reason?: string
}
export type VisitRecord = {
  id: string
  customerId: string
  customer: string
  branch: string
  date: string
  timeIn: string
  timeOut: string
  type: "Member" | "Walk-in"
  source: "RFID · Scanner 1" | "Manual"
  status: "Checked in" | "Completed" | "Voided"
  sync: "Synced" | "Pending" | "Failed"
  walkInId?: string
  reason?: string
}
export type MembershipStatus = "Active" | "Pending" | "Expired" | "Suspended" | "Cancelled"
export type PaymentStatus = "Paid" | "Pending" | "Partially paid"
export type MembershipPlan = {
  id?: string
  name: string
  duration: string
  durationMonths: number
  price: number
  monthlyDues: number
  initiationFee: number
  studentPrice?: number
  studentMonthlyDues?: number
  studentInitiationFee?: number
  active: boolean
  archived?: boolean
  archivedAt?: string
  used: number
  promoName?: string
  promoDiscountPercent?: number
  freeIntroMonths?: number
  promoCode?: string
  billingStartMode?: "immediate" | "after_intro" | "custom_date"
  customFirstBillingDate?: string
}
export type ServicePrice = { id: string; name: string; category: "Walk-in access" | "Coaching" | "Other service"; amount: number; studentAmount?: number; active: boolean }
export type PaymentRecord = {
  id: string
  membershipId: string
  date: string
  amount: number
  method: string
  reference: string
  category?: "Membership" | "Walk-in" | "Coaching" | "Other service" | "Initiation fee" | "Monthly dues" | "Renewal fee" | "Promo discount"
  branch?: string
  status?: PaymentStatus
  serviceName?: string
  amountDue?: number
  billingPeriod?: string
  paymentMethodId?: string
}
export type PaymentMethod = {
  id: string
  code: string
  name: string
  description?: string
  active: boolean
  branch?: string
}
export type MembershipPolicySettings = {
  defaultDurationMonths: 1 | 3 | 6 | 12
  renewalWindowDays: number
  overdueAccessPolicy: "Restrict access" | "Allow with manager review" | "Allow with warning"
  initiationFeePolicy: "Charge standard fee" | "Waive first month" | "Apply campaign waiver"
  maxPromotionDiscountPercent: number
  freeIntroMonthsCap: number
  frontDeskCanPauseBilling: boolean
  customBillingStartAllowed: boolean
}
export type MembershipBillingPeriod = {
  periodNumber: number
  dueDate: string
  amount: number
  freeIntro: boolean
}
export type MembershipBillingPause = {
  id: string
  startDate: string
  expectedResumeDate?: string
  reason: string
  recordedBy: string
  resumedAt?: string
  resumedBy?: string
}
export type Membership = {
  id: string
  customer: string
  customerId: string
  plan: string
  start: string
  end: string
  status: MembershipStatus
  payment: PaymentStatus
  paymentMethod?: string
  paymentMethodId?: string
  branch: string
  price: number
  monthlyDues: number
  initiationFee: number
  freeIntroMonths: number
  promoDiscount: number
  promoName?: string
  outstandingBalance?: number
  initiationFeeOutstanding?: number
  monthlyDuesOutstanding?: number
  nextDueDate?: string
  renewalEligible?: boolean
  firstBillingDate?: string
  billingStartMode?: "immediate" | "after_intro" | "custom_date"
  initialAmountDue?: number
  billingPeriods?: MembershipBillingPeriod[]
  billingPaused?: boolean
  billingPauses?: MembershipBillingPause[]
  cancelledAt?: string
}
export type Coach = { id: string; name: string; specialty: string; branch: string; status: "Active" | "Inactive" | "Archived"; phone: string; archivedAt?: string; archivedFromStatus?: "Active" | "Inactive" }
export type Keyfob = { id: string; uid: string; customer: string; branch: string; status: "Assigned" | "Unassigned" | "Deactivated"; date: string }
export type FrontDeskAccount = { id: string; name: string; email: string; branch: string; status: "Active" | "Inactive"; created: string; activity: string }
export type AuditLog = { time: string; user: string; role: Role; branch: string; action: string; record: string; summary: string }
export type ReminderStage = "7 days before" | "3 days before" | "Due today" | "1 day overdue" | "3 days overdue"
export type ReminderSource = "manual" | "simulated automatic"
export type ReminderChannel = "email" | "SMS"
export type ReminderStatus = "Scheduled" | "Simulated" | "Failed" | "Skipped" | "Cancelled"
export type ReminderSettings = {
  enabled: boolean
  channels: { email: boolean; sms: boolean }
  intervals: number[]
  emailTemplate: string
  smsTemplate: string
  gymContact: string
}
export type ReminderRecord = {
  id: string; customerId: string; membershipId: string; branch: string; stage: ReminderStage
  source: ReminderSource; channel: ReminderChannel; initiatedBy?: string; eligibleDate: string
  attemptedAt: string; status: ReminderStatus; message: string; reason?: string; note?: string
}
export type NotificationCategory = "membership" | "payment" | "walk-in" | "attendance" | "rfid" | "scanner" | "reminder"
export type NotificationRecord = {
  id: string
  category: NotificationCategory
  title: string
  message: string
  timestamp: string
  branch?: string
  roles?: Role[]
  destination?: string
}
export type ArchivedRecord = {
  id: string
  entity: "Customer" | "Branch" | "Membership plan" | "Coach"
  name: string
  branch?: string
  archivedAt: string
  status: string
}
