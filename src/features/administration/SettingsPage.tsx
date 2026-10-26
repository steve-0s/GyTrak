import { useState, type ReactNode } from "react";
import type { AuthAccount } from "../../contexts/AuthContext";
import { useAuth } from "../../contexts/AuthContext";
import { useGymData } from "../../contexts/GymDataContext";
import type { ServicePrice } from "../../types";
import { nextMockId } from "../../services/mockApi";

type Props = {
  onAction: (message: string) => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  account?: AuthAccount | null;
  onChangeEmail?: (email: string, confirmation: string, password: string) => Promise<string | null>;
  onChangePassword?: (current: string, next: string, confirmation: string) => Promise<string | null>;
};
type DisplaySettings = { name: string; currency: string; requireReason: boolean; notifications: boolean };

const settingsKey = "gytrak-mock-settings";
const defaults: DisplaySettings = { name: "GyTrak Fitness", currency: "PHP (₱)", requireReason: true, notifications: true };

function readSettings(role: "Admin" | "Front Desk", accountId?: string): DisplaySettings {
  const key = role === "Admin" ? settingsKey : `${settingsKey}:${role}:${accountId ?? "unknown"}`;
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<DisplaySettings> | null;
    if (!stored || typeof stored !== "object") return { ...defaults };
    return {
      name: typeof stored.name === "string" ? stored.name : defaults.name,
      currency: stored.currency === "PHP (₱)" || stored.currency === "USD ($)" ? stored.currency : defaults.currency,
      requireReason: typeof stored.requireReason === "boolean" ? stored.requireReason : defaults.requireReason,
      notifications: typeof stored.notifications === "boolean" ? stored.notifications : defaults.notifications,
    };
  } catch {
    return { ...defaults };
  }
}

export default function SettingsPage({ onAction, theme, onThemeChange, account, onChangeEmail, onChangePassword }: Props) {
  const { role } = useAuth();
  const isAdmin = role === "Admin";
  const { servicePrices, upsertServicePrice, reminderSettings, updateReminderSettings, resetDemoData } = useGymData();
  const [membershipPolicy, setMembershipPolicy] = useState({
    defaultDurationMonths: 1 as 1 | 3 | 6 | 12,
    renewalWindowDays: 7,
    overdueAccessPolicy: "Allow with manager review" as "Restrict access" | "Allow with manager review" | "Allow with warning",
    initiationFeePolicy: "Charge standard fee" as "Charge standard fee" | "Waive first month" | "Apply campaign waiver",
    maxPromotionDiscountPercent: 15,
    freeIntroMonthsCap: 2,
  });
  const [initialSettings] = useState(() => readSettings(role, account?.id));
  const [name, setName] = useState(initialSettings.name);
  const [currency, setCurrency] = useState(initialSettings.currency);
  const [requireReason, setRequireReason] = useState(initialSettings.requireReason);
  const [notifications, setNotifications] = useState(initialSettings.notifications);
  const [newEmail, setNewEmail] = useState(account?.email ?? "");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceAmount, setNewServiceAmount] = useState("0");
  const [reminders, setReminders] = useState(reminderSettings);

  const saveEmail = async () => {
    if (!onChangeEmail) return;
    setSecurityError("");
    const error = await onChangeEmail(newEmail, emailConfirmation, emailPassword);
    if (error) setSecurityError(error);
    else {
      setSecurityMessage("Email updated. Verification is required before it is treated as verified.");
      setEmailPassword("");
    }
  };
  const savePassword = async () => {
    if (!onChangePassword) return;
    setSecurityError("");
    const error = await onChangePassword(currentPassword, newPassword, passwordConfirmation);
    if (error) setSecurityError(error);
    else {
      setSecurityMessage("Password updated in the mock account store.");
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
    }
  };
  const saveSettings = () => {
    const key = isAdmin ? settingsKey : `${settingsKey}:${role}:${account?.id ?? "unknown"}`;
    localStorage.setItem(key, JSON.stringify({ name, currency, requireReason, notifications }));
    if (isAdmin) updateReminderSettings(reminders);
    onAction("Settings saved");
  };
  const resetReminders = () => setReminders(reminderSettings);
  const savePrice = (price: ServicePrice, amount: string, studentAmount: string) => {
    const value = Number(amount);
    const studentValue = studentAmount.trim() === "" ? undefined : Number(studentAmount);
    if (!Number.isFinite(value) || value < 0 || Math.round(value * 100) !== value * 100 || (studentValue !== undefined && (!Number.isFinite(studentValue) || studentValue < 0 || Math.round(studentValue * 100) !== studentValue * 100))) return;
    upsertServicePrice({ ...price, amount: value, studentAmount: studentValue });
    onAction(`${price.name} price updated`);
  };
  const addServicePrice = () => {
    const amount = Number(newServiceAmount);
    if (!newServiceName.trim() || !Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100) return;
    upsertServicePrice({ id: nextMockId("SR", 10), name: newServiceName.trim(), category: "Other service", amount, active: true });
    setNewServiceName("");
    setNewServiceAmount("0");
    onAction("Service price added");
  };

  return (
    <div>
      <div className="page-header">
        <p className="mb-1 text-sm font-medium text-[var(--accent)]">{isAdmin ? "Administration" : "Front Desk"}</p>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Manage {isAdmin ? "system, appearance, regional formatting, and account security." : "your workstation preferences and account information."}</p>
      </div>

      <div className="max-w-3xl space-y-5">
        <Panel title="Appearance">
          <p className="mb-4 text-xs text-[var(--text-muted)]">Theme changes apply across the application and persist across refreshes.</p>
          <div className="flex gap-2">
            <button onClick={() => onThemeChange("light")} className={`rounded-lg border px-4 py-2 text-sm ${theme === "light" ? "border-[var(--accent)] bg-[var(--accent-subtle)] font-semibold text-[var(--accent)]" : "border-[var(--border)]"}`}>Light</button>
            <button onClick={() => onThemeChange("dark")} className={`rounded-lg border px-4 py-2 text-sm ${theme === "dark" ? "border-[var(--accent)] bg-[var(--accent-subtle)] font-semibold text-[var(--accent)]" : "border-[var(--border)]"}`}>Dark</button>
          </div>
        </Panel>

        {!isAdmin ? (
          <>
            <Panel title="Account information">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="Name" value={account?.name ?? "—"} />
                <Info label="Email" value={account?.email ?? "—"} />
                <Info label="Role" value="Front Desk" />
                <Info label="Assigned branch" value={account?.branch ?? "—"} />
              </div>
              <p className="mt-4 text-xs text-[var(--text-muted)]">Role, assigned branch, and permissions are managed by an Admin.</p>
            </Panel>
            <Panel title="Notifications">
              <Toggle label="Show non-critical in-app reminders" checked={notifications} setChecked={setNotifications} />
              <p className="mt-3 text-xs text-[var(--text-muted)]">Important validation errors and scanner synchronization failures are always shown.</p>
            </Panel>
            <Panel title="Membership reminders">
              <p className="text-xs text-[var(--text-muted)]">Global reminder settings are managed by an Admin. You can view and use reminders for your assigned branch.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3"><Info label="Automatic simulation" value={reminderSettings.enabled ? "Enabled" : "Disabled"} /><Info label="Channels" value={[reminderSettings.channels.email ? "Email" : "", reminderSettings.channels.sms ? "SMS" : ""].filter(Boolean).join(" · ") || "None"} /><Info label="Stages configured" value={String(reminderSettings.intervals.length)} /></div>
            </Panel>
            <button onClick={saveSettings} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]">Save settings</button>
          </>
        ) : (
          <>
            <Panel title="Business display">
              <TextField label="Gym or business name" value={name} onChange={setName} placeholder="Business name" />
            </Panel>
            <Panel title="Regional formatting">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-xs font-medium">Currency display</span><select value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"><option>PHP (₱)</option><option>USD ($)</option></select></label>
                <div><p className="mb-2 text-xs font-medium">Date and time format</p><p className="rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text-muted)]">MMM DD, YYYY · 12-hour</p></div>
              </div>
            </Panel>
            <Panel title="Attendance preferences">
              <Toggle label="Require a reason for manual corrections" checked={requireReason} setChecked={setRequireReason} />
              <Toggle label="Show sync notifications" checked={notifications} setChecked={setNotifications} />
            </Panel>
            <Panel title="Membership reminders">
              <p className="mb-4 text-xs text-[var(--text-muted)]">Automatic reminders are simulated only while this application is open. They never send real email or SMS.</p>
              <Toggle label="Enable simulated automatic reminders" checked={reminders.enabled} setChecked={(value) => isAdmin && setReminders({ ...reminders, enabled: value })} />
              <div className="grid gap-4 border-b border-[var(--border)] py-4 sm:grid-cols-2"><Toggle label="Simulate email channel" checked={reminders.channels.email} setChecked={(value) => isAdmin && setReminders({ ...reminders, channels: { ...reminders.channels, email: value } })} /><Toggle label="Simulate SMS channel" checked={reminders.channels.sms} setChecked={(value) => isAdmin && setReminders({ ...reminders, channels: { ...reminders.channels, sms: value } })} /></div>
              <p className="mb-2 mt-4 text-xs font-medium">Reminder stages</p><div className="flex flex-wrap gap-2">{[[7, "7 days before"], [3, "3 days before"], [0, "Due date"], [-1, "1 day after"], [-3, "3 days after"]].map(([value, label]) => <label key={String(value)} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><input type="checkbox" disabled={!isAdmin} checked={reminders.intervals.includes(Number(value))} onChange={() => setReminders({ ...reminders, intervals: reminders.intervals.includes(Number(value)) ? reminders.intervals.filter((item) => item !== Number(value)) : [...reminders.intervals, Number(value)] })} />{label}</label>)}</div>
              <div className="mt-4 grid gap-4"><TextField label="Gym contact shown in messages" value={reminders.gymContact} onChange={(value) => isAdmin && setReminders({ ...reminders, gymContact: value })} placeholder="Phone, email, or front desk" /><label className="block"><span className="mb-1.5 block text-xs font-medium">Email template</span><textarea disabled={!isAdmin} value={reminders.emailTemplate} onChange={(e) => setReminders({ ...reminders, emailTemplate: e.target.value })} className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium">SMS template</span><textarea disabled={!isAdmin} value={reminders.smsTemplate} onChange={(e) => setReminders({ ...reminders, smsTemplate: e.target.value })} className="min-h-20 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" /></label></div>
              {isAdmin && <div className="mt-3 flex gap-2"><button onClick={resetReminders} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">Reset reminder settings</button><span className="self-center text-xs text-[var(--text-muted)]">Placeholders: member_name, membership_plan, due_date, gym_contact</span></div>}
            </Panel>
            <Panel title="Membership policy defaults">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-xs font-medium">Default membership duration</span><select value={String(membershipPolicy.defaultDurationMonths)} onChange={(event) => setMembershipPolicy({ ...membershipPolicy, defaultDurationMonths: Number(event.target.value) as 1 | 3 | 6 | 12 })} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"><option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option></select></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium">Renewal window (days)</span><input type="number" min="1" max="30" value={membershipPolicy.renewalWindowDays} onChange={(event) => setMembershipPolicy({ ...membershipPolicy, renewalWindowDays: Number(event.target.value) || 1 })} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium">Overdue access policy</span><select value={membershipPolicy.overdueAccessPolicy} onChange={(event) => setMembershipPolicy({ ...membershipPolicy, overdueAccessPolicy: event.target.value as "Restrict access" | "Allow with manager review" | "Allow with warning" })} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"><option>Restrict access</option><option>Allow with manager review</option><option>Allow with warning</option></select></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium">Initiation fee policy</span><select value={membershipPolicy.initiationFeePolicy} onChange={(event) => setMembershipPolicy({ ...membershipPolicy, initiationFeePolicy: event.target.value as "Charge standard fee" | "Waive first month" | "Apply campaign waiver" })} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"><option>Charge standard fee</option><option>Waive first month</option><option>Apply campaign waiver</option></select></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium">Max promo discount</span><input type="number" min="0" max="100" value={membershipPolicy.maxPromotionDiscountPercent} onChange={(event) => setMembershipPolicy({ ...membershipPolicy, maxPromotionDiscountPercent: Number(event.target.value) || 0 })} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium">Free intro months cap</span><input type="number" min="0" max="12" value={membershipPolicy.freeIntroMonthsCap} onChange={(event) => setMembershipPolicy({ ...membershipPolicy, freeIntroMonthsCap: Number(event.target.value) || 0 })} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">Front Desk users can review these policies but cannot modify them without admin access.</p>
            </Panel>
            <Panel title="Service pricing">
              <p className="mb-4 text-xs text-[var(--text-muted)]">Prices apply to new transactions. Recorded payment amounts are not changed when a rate is updated.</p>
              <div className="space-y-3">
                {servicePrices.map((price) => <PriceRow key={price.id} price={price} onSave={savePrice} onToggle={() => upsertServicePrice({ ...price, active: !price.active })} />)}
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--border)] pt-4"><label className="min-w-[220px] flex-1"><span className="mb-1 block text-xs text-[var(--text-muted)]">New optional service</span><input value={newServiceName} onChange={(event) => setNewServiceName(event.target.value)} placeholder="e.g. Day pass" className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" /></label><label className="w-32"><span className="mb-1 block text-xs text-[var(--text-muted)]">Price (₱)</span><input type="number" min="0" step="0.01" value={newServiceAmount} onChange={(event) => setNewServiceAmount(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" /></label><button onClick={addServicePrice} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--on-accent)]">Add service</button></div>
            </Panel>
            <Panel title="Development data">
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">Restore the complete fictional Philippine gym dataset for demonstrations. This removes locally created demo records from the current browser only.</p>
              <button type="button" onClick={() => { if (window.confirm("Reset all GyTrak demo data in this browser? Locally created records will be removed.")) { resetDemoData(); onAction("Demo data reset"); } }} className="mt-4 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Reset demo data</button>
            </Panel>
            <Panel title="Account email">
              <p className="mb-4 text-xs text-[var(--text-muted)]">Current account: {account?.email ?? "—"}. Email changes require verification in production.</p>
              <div className="grid gap-4 sm:grid-cols-2"><TextField label="New email" value={newEmail} onChange={setNewEmail} placeholder="new-email@example.com" /><TextField label="Confirm new email" value={emailConfirmation} onChange={setEmailConfirmation} placeholder="Repeat new email" /><PasswordField label="Current password" value={emailPassword} onChange={setEmailPassword} /></div>
              <button onClick={() => void saveEmail()} className="mt-4 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold">Update email</button>
            </Panel>
            <Panel title="Account password">
              <p className="mb-4 text-xs text-[var(--text-muted)]">This prototype updates the mock account store only; it is not real authentication.</p>
              <div className="grid gap-4 sm:grid-cols-2"><PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} /><PasswordField label="New password" value={newPassword} onChange={setNewPassword} /><PasswordField label="Confirm new password" value={passwordConfirmation} onChange={setPasswordConfirmation} /></div>
              <button onClick={() => void savePassword()} className="mt-4 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold">Update password</button>
            </Panel>
            {(securityError || securityMessage) && <p className={`rounded-lg px-3 py-2 text-xs ${securityError ? "bg-red-50 text-red-700" : "bg-[var(--accent-subtle)] text-[var(--accent)]"}`}>{securityError || securityMessage}</p>}
            <button onClick={saveSettings} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]">Save settings</button>
          </>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="mb-4 font-semibold">{title}</h3>{children}</section>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label>;
}
function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span><div className="relative"><input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 pr-16 text-sm" /><button type="button" onClick={() => setVisible(!visible)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--accent)]">{visible ? "Hide" : "Show"}</button></div></label>;
}
function Toggle({ label, checked, setChecked }: { label: string; checked: boolean; setChecked: (value: boolean) => void }) {
  return <label className="flex items-center justify-between border-b border-[var(--border)] py-3 text-sm last:border-0"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /></label>;
}
function PriceRow({ price, onSave, onToggle }: { key?: string; price: ServicePrice; onSave: (price: ServicePrice, amount: string, studentAmount: string) => void; onToggle: () => void }) {
  const [amount, setAmount] = useState(String(price.amount));
  const [studentAmount, setStudentAmount] = useState(price.studentAmount === undefined ? "" : String(price.studentAmount));
  return <div className="flex flex-wrap items-end gap-3 border-b border-[var(--border)] pb-3 last:border-0"><div className="min-w-[190px] flex-1"><p className="text-sm font-medium">{price.name}</p><p className="text-xs text-[var(--text-muted)]">{price.category}</p></div><label className="w-32"><span className="mb-1 block text-xs text-[var(--text-muted)]">Regular (₱)</span><input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" /></label><label className="w-32"><span className="mb-1 block text-xs text-[var(--text-muted)]">Student (₱)</span><input type="number" min="0" step="0.01" value={studentAmount} onChange={(event) => setStudentAmount(event.target.value)} placeholder="Not set" className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" /></label><button onClick={() => onSave(price, amount, studentAmount)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">Save</button><button onClick={onToggle} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">{price.active ? "Deactivate" : "Activate"}</button></div>;
}
