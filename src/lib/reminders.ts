import type { Membership, ReminderSettings, ReminderStage } from "../types";

export const defaultReminderSettings: ReminderSettings = {
  enabled: true, channels: { email: true, sms: true }, intervals: [7, 3, 0, -1, -3],
  emailTemplate: "Hi {{member_name}}, your {{membership_plan}} membership at {{gym_name}} is approaching its expiration date on {{due_date}}. Please contact us if you would like to renew. {{gym_contact}}",
  smsTemplate: "Hi {{member_name}}, your {{membership_plan}} membership expires on {{due_date}}. Please contact {{gym_contact}} if you would like to renew.",
  gymContact: "Please contact the front desk.",
};
export function parseDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
export function today() { const value = new Date(); return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
export function daysUntil(end: string, now = today()) { const date = parseDate(end); return date ? Math.round((date.getTime() - now.getTime()) / 86400000) : null; }
export function reminderStage(days: number): ReminderStage | null { return days === 7 ? "7 days before" : days === 3 ? "3 days before" : days === 0 ? "Due today" : days === -1 ? "1 day overdue" : days === -3 ? "3 days overdue" : null; }
export function renderTemplate(template: string, membership: Membership, customer: { name: string; email?: string; phone?: string }, settings: ReminderSettings, verifiedBalance?: number) {
  const values: Record<string, string> = { member_name: customer.name, gym_name: "GyTrak Fitness", membership_plan: membership.plan, due_date: membership.end, gym_contact: settings.gymContact };
  if (verifiedBalance !== undefined) values.amount_due = `₱${verifiedBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  return template.replace(/{{\s*([\w]+)\s*}}/g, (_, key: string) => values[key] ?? "").replace(/\s{2,}/g, " ").trim();
}
