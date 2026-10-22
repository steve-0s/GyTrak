import type { NotificationRecord } from "../types";

// Stable demo events. Read state is persisted separately so these do not reset on refresh.
export const mockNotifications: NotificationRecord[] = [
  { id: "NOTIF-MEM-00802", category: "membership", title: "Membership expiring soon", message: "Sofia Kim's Monthly Membership expires on Oct 26, 2026.", timestamp: "Oct 20, 2026 · 09:12 AM", branch: "BGC High Street", destination: "Membership Reminders" },
  { id: "NOTIF-MEM-00794", category: "membership", title: "Membership expired", message: "Noah Patel's membership expired on Oct 12, 2026 and needs follow-up.", timestamp: "Oct 20, 2026 · 08:58 AM", branch: "Cebu IT Park", destination: "Membership Reminders" },
  { id: "NOTIF-PAY-00802", category: "payment", title: "Payment pending", message: "Sofia Kim's membership payment is still pending.", timestamp: "Oct 20, 2026 · 08:48 AM", branch: "BGC High Street", destination: "Walk-ins & Memberships" },
  { id: "NOTIF-VIS-20841", category: "walk-in", title: "New walk-in recorded", message: "Luis Moreno was checked in at Makati Central.", timestamp: "Oct 20, 2026 · 09:31 AM", branch: "Makati Central", destination: "Walk-ins & Memberships" },
  { id: "NOTIF-ATT-90215", category: "attendance", title: "Attendance correction", message: "Noah Patel's attendance record requires review after a sync issue.", timestamp: "Oct 20, 2026 · 08:56 AM", branch: "Cebu IT Park", destination: "Attendance" },
  { id: "NOTIF-RFID-UNASSIGNED", category: "rfid", title: "RFID keyfob issue", message: "An unassigned keyfob is available for assignment at Makati Central.", timestamp: "Oct 20, 2026 · 08:40 AM", branch: "Makati Central", destination: "RFID Keyfobs" },
  { id: "NOTIF-SYNC-QUEUE", category: "scanner", title: "Scanner synchronization issue", message: "Attendance events are waiting for synchronization at Cebu IT Park.", timestamp: "Oct 20, 2026 · 09:47 AM", branch: "Cebu IT Park", roles: ["Admin", "Front Desk"], destination: "Scanner and Sync Status" },
  { id: "NOTIF-REMINDER-DEMO", category: "reminder", title: "Membership reminder recorded", message: "A simulated membership reminder was recorded for Sofia Kim. No external message was sent.", timestamp: "Oct 20, 2026 · 09:15 AM", branch: "BGC High Street", destination: "Membership Reminders" },
  ...Array.from({ length: 14 }, (_, index) => {
    const branch = ["Makati Central", "BGC High Street", "Cebu IT Park"][index % 3];
    const categories: NotificationRecord["category"][] = ["attendance", "payment", "membership", "rfid", "scanner", "walk-in", "reminder"];
    const category = categories[index % categories.length];
    return {
      id: `NOTIF-DEMO-${String(index + 1).padStart(3, "0")}`,
      category,
      title: category === "attendance" ? "Attendance event synced" : category === "payment" ? "Payment activity recorded" : category === "membership" ? "Membership status updated" : category === "rfid" ? "Keyfob activity recorded" : category === "scanner" ? "Scanner queue updated" : category === "walk-in" ? "Walk-in activity recorded" : "Reminder activity updated",
      message: `Development activity sample ${index + 1} for ${branch}.`,
      timestamp: `Oct ${String(19 - (index % 5)).padStart(2, "0")}, 2026 · ${String(8 + (index % 4)).padStart(2, "0")}:15 AM`,
      branch,
      destination: category === "attendance" ? "Attendance" : category === "rfid" ? "RFID Keyfobs" : category === "scanner" ? "Scanner and Sync Status" : category === "reminder" ? "Membership Reminders" : "Dashboard",
    };
  }),
];
