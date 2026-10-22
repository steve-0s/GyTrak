import { useState, type ReactNode } from "react";
import type { AuthAccount } from "../../contexts/AuthContext";
import { useAuth } from "../../contexts/AuthContext";

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
    onAction("Settings saved");
  };

  return (
    <div>
      <div className="mb-6">
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
