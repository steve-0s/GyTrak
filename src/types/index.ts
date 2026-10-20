export type Role = "Admin" | "Front Desk"
export type Theme = "light" | "dark"
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
