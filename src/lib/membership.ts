function currentBusinessDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
}

export function parseMembershipDate(value: string) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(`${value} 00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatMembershipDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function addBillingMonths(startDate: string, months: number) {
  const source = parseMembershipDate(startDate);
  if (!source) return startDate;
  const originalDay = source.getDate();
  const next = new Date(source);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));
  return formatMembershipDate(next);
}

export function durationToMonths(duration: string) {
  const match = duration.match(/(\d+)\s+month/);
  if (match) return Number(match[1]);
  if (duration.toLowerCase().includes("annual")) return 12;
  return 1;
}

export function membershipDueState(dueDate: string) {
  const due = parseMembershipDate(dueDate);
  if (!due) return { key: "upcoming" as const, label: "Due date unavailable", daysUntilDue: null };
  const daysUntilDue = Math.round((due.getTime() - currentBusinessDate().getTime()) / 86400000);
  if (daysUntilDue < 0) return { key: "overdue" as const, label: "Payment overdue", daysUntilDue };
  if (daysUntilDue === 0) return { key: "today" as const, label: "Payment due today", daysUntilDue };
  if (daysUntilDue <= 7) return { key: "soon" as const, label: `Due in ${daysUntilDue} days`, daysUntilDue };
  return { key: "upcoming" as const, label: "Upcoming payment", daysUntilDue };
}
