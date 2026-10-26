const monthNumbers: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

export function businessDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function dashboardDateKey(value: string) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const label = value.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
  if (label && monthNumbers[label[1]]) {
    return `${label[3]}-${monthNumbers[label[1]]}-${label[2].padStart(2, "0")}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : businessDateKey(parsed);
}

export function addDateDays(key: string, amount: number) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function daysFromToday(key: string, today = businessDateKey()) {
  return Math.round((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

export function dateInWindow(value: string, start: string, end = businessDateKey()) {
  const key = dashboardDateKey(value);
  return key !== null && key >= start && key <= end;
}

export function chartBucket(key: string, granularity: "Daily" | "Weekly" | "Monthly" | "Yearly") {
  const date = new Date(`${key}T00:00:00Z`);
  if (granularity === "Yearly") return { id: key.slice(0, 4), label: key.slice(0, 4) };
  if (granularity === "Monthly") return { id: key.slice(0, 7), label: date.toLocaleDateString("en-PH", { month: "short", timeZone: "UTC" }) };
  if (granularity === "Weekly") {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const monday = addDateDays(key, -mondayOffset);
    return { id: monday, label: new Date(`${monday}T00:00:00Z`).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }) };
  }
  return { id: key, label: date.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }) };
}

export function dateRangeStart(granularity: "Daily" | "Weekly" | "Monthly" | "Yearly", today = businessDateKey()) {
  const date = new Date(`${today}T00:00:00Z`);
  if (granularity === "Daily") return addDateDays(today, -13);
  if (granularity === "Weekly") return addDateDays(today, -83);
  if (granularity === "Monthly") {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - 11);
  } else {
    date.setUTCMonth(0, 1);
    date.setUTCFullYear(date.getUTCFullYear() - 4);
  }
  return date.toISOString().slice(0, 10);
}

export function weekDayLabel(key: string) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-PH", { weekday: "short", timeZone: "UTC" });
}

export function formatBusinessDate(key: string) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function timeHourBucket(value: string) {
  const match = value.match(/^(\d{1,2}):\d{2}\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[2].toUpperCase() === "PM") hour += 12;
  return hour;
}

export function hourLabel(hour: number) {
  return new Date(Date.UTC(2020, 0, 1, hour)).toLocaleTimeString("en-PH", {
    hour: "numeric",
    hour12: true,
    timeZone: "UTC",
  });
}
