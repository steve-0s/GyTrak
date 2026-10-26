import { useState, type ReactNode } from "react";
import { Activity, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "../../components/shared/toast";

function Shell({ children }: { children: ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5 py-10 text-[var(--text)]"><div className="w-full max-w-md">{children}</div></main>;
}

function Brand() {
  return <div className="mb-7 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)]"><Activity size={20} /></div><p className="mt-3 text-lg font-bold">GyTrak</p><p className="mt-1 text-xs uppercase tracking-[.16em] text-[var(--text-muted)]">Gym operations</p></div>;
}

export function LoginPage() {
  const { login, hasInitialAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const showValidationError = (message: string) => {
    setError(message);
    toast.warning(message);
  };
  const submit = async () => {
    if (!email.trim() || !password) return showValidationError("Enter your email and password.");
    setLoading(true);
    setError("");
    const result = await login(email, password);
    setLoading(false);
    if (result) {
      setError(result);
      toast.error(result);
    }
    else window.history.replaceState({}, "", "/");
  };
  return <Shell><Brand /><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"><h1 className="text-xl font-bold">Sign in</h1><p className="mt-2 text-sm text-[var(--text-muted)]">Use the staff account provided by your gym administrator.</p><div className="mt-6 space-y-4"><Field label="Email or username" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="username" /><label className="block"><span className="mb-1.5 block text-xs font-medium">Password</span><div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void submit()} autoComplete="current-password" className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 pr-10 text-sm outline-none focus:border-[var(--accent)]" placeholder="Your password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)]">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label></div>{error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}<button disabled={loading} onClick={() => void submit()} className="mt-5 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50">{loading ? "Signing in…" : "Sign in"}</button><button onClick={() => { window.history.pushState({}, "", "/forgot-password"); window.dispatchEvent(new PopStateEvent("popstate")); }} className="mt-4 w-full text-center text-xs font-semibold text-[var(--accent)]">Forgot password?</button></section>{!hasInitialAdmin && <p className="mt-5 text-center text-xs text-[var(--text-muted)]">First-time setup? <button onClick={() => { window.history.pushState({}, "", "/setup"); window.dispatchEvent(new PopStateEvent("popstate")); }} className="font-semibold text-[var(--accent)]">Create the initial Admin account</button></p>}</Shell>;
}

export function InitialSetupPage() {
  const { setupAdmin, hasInitialAdmin } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const showValidationError = (message: string) => {
    setError(message);
    toast.warning(message);
  };
  const submit = async () => {
    if (password !== confirmation) return showValidationError("Passwords do not match.");
    const result = await setupAdmin(name, email, password);
    if (result) {
      setError(result);
      toast.error(result);
    } else window.history.replaceState({}, "", "/");
  };
  if (hasInitialAdmin) return <Shell><Brand /><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center"><h1 className="text-xl font-bold">Setup unavailable</h1><p className="mt-2 text-sm text-[var(--text-muted)]">The initial Admin account already exists.</p><button onClick={() => { window.history.replaceState({}, "", "/login"); window.dispatchEvent(new PopStateEvent("popstate")); }} className="mt-5 text-sm font-semibold text-[var(--accent)]">Back to sign in</button></section></Shell>;
  return <Shell><Brand /><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h1 className="text-xl font-bold">Initial Admin setup</h1><p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">This one-time setup is for the gym owner or administrator. It is not public staff signup.</p><div className="mt-6 space-y-4"><Field label="Full name" value={name} onChange={setName} placeholder="Your name" /><Field label="Email" value={email} onChange={setEmail} placeholder="owner@example.com" autoComplete="email" /><PasswordField label="Password" value={password} onChange={setPassword} /><PasswordField label="Confirm password" value={confirmation} onChange={setConfirmation} /></div>{error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}<button onClick={() => void submit()} className="mt-5 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]">Create Admin account</button></section></Shell>;
}

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async () => { if (!email.trim()) return; setLoading(true); await requestPasswordReset(email); setLoading(false); setSubmitted(true); };
  return <Shell><button onClick={() => { window.history.replaceState({}, "", "/login"); window.dispatchEvent(new PopStateEvent("popstate")); }} className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={16} /> Back to sign in</button><Brand /><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h1 className="text-xl font-bold">Reset password</h1><p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">Enter your account email. This frontend prototype simulates recovery and does not send email.</p>{submitted ? <div className="mt-5 rounded-lg bg-[var(--accent-subtle)] p-3 text-sm text-[var(--accent)]">If an account matches, recovery instructions would be sent through the configured email service.</div> : <><Field label="Account email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" /><button disabled={loading} onClick={() => void submit()} className="mt-5 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50">{loading ? "Checking…" : "Request reset"}</button></>}</section></Shell>;
}

function Field({ label, value, onChange, placeholder, autoComplete }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; autoComplete?: string }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]" /></label>; }
function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { const [visible, setVisible] = useState(false); return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span><div className="relative"><input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 pr-10 text-sm outline-none focus:border-[var(--accent)]" /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)]">{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>; }
