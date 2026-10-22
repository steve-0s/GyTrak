export type Role = "Admin" | "Front Desk"
export type Theme = "light" | "dark"
export type Branch = { id: string; name: string; location: string; status: "Active" | "Inactive" }
export type BranchRecord = Branch & { customers: number; memberships: number; visits: number; revenue: number; frontDesk: number }
export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  type: "Member" | "Walk-in"
  status: "Active" | "Pending" | "Expired" | "None"
  branch: string
  registered: string
  lastVisit: string
  plan?: string
  endDate?: string
  keyfob?: string
  classification?: "Regular" | "Student"
  photo?: string
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
  status: "Registered" | "Completed" | "Checked in"
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
export type MembershipStatus = "Active" | "Pending" | "Expired" | "Suspended"
export type PaymentStatus = "Paid" | "Pending"
export type MembershipPlan = { name: string; duration: string; price: number; studentPrice?: number; active: boolean; used: number }
export type ServicePrice = { id: string; name: string; category: "Walk-in access" | "Coaching" | "Other service"; amount: number; studentAmount?: number; active: boolean }
export type PaymentRecord = { id: string; membershipId: string; date: string; amount: number; method: string; reference: string; category?: "Membership" | "Walk-in" | "Coaching" | "Other service"; branch?: string; status?: PaymentStatus; serviceName?: string }
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
  branch: string
  price: number
}
export type Coach = { id: string; name: string; specialty: string; branch: string; status: "Active" | "Inactive"; phone: string }
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
