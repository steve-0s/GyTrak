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
export type MembershipPlan = { name: string; duration: string; price: number; active: boolean; used: number }
export type PaymentRecord = { id: string; membershipId: string; date: string; amount: number; method: string; reference: string }
export type Membership = {
  id: string
  customer: string
  customerId: string
  plan: string
  start: string
  end: string
  status: MembershipStatus
  payment: PaymentStatus
  branch: string
  price: number
}
export type Coach = { id: string; name: string; specialty: string; branch: string; status: "Active" | "Inactive"; phone: string }
export type Keyfob = { id: string; uid: string; customer: string; branch: string; status: "Assigned" | "Unassigned" | "Deactivated"; date: string }
export type FrontDeskAccount = { id: string; name: string; email: string; branch: string; status: "Active" | "Inactive"; created: string; activity: string }
export type AuditLog = { time: string; user: string; role: Role; branch: string; action: string; record: string; summary: string }
