import { useState, type ReactNode } from "react";
import { Activity, CheckCircle2, CreditCard, ShieldAlert } from "lucide-react";
import { useGymData } from "../../contexts/GymDataContext";
import { priceForCustomer } from "../../lib/pricing";
import { toast } from "../../components/shared/toast";

function branchIdFromUrl() { return new URLSearchParams(window.location.search).get("branchId") ?? ""; }

export default function QRRegistrationPage({ mode = "profile" }: { mode?: "profile" | "walk-in" }) {
  const { branches, servicePrices, submitProfileRegistration, checkInWalkIn, findCustomersByPhone } = useGymData();
  const branchId = branchIdFromUrl();
  const branch = branches.find((item) => item.id === branchId && item.status === "Active");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [reference, setReference] = useState(""); const [loading, setLoading] = useState(false);
  if (!branch) return <PublicShell><ShieldAlert className="mx-auto text-amber-500" size={28} /><h1 className="mt-4 text-xl font-bold">Invalid gym link</h1><p className="mt-2 text-sm text-[var(--text-muted)]">This QR link is missing a valid active branch. Ask the front desk for the correct branch QR code.</p></PublicShell>;
  if (message) return <PublicShell><CheckCircle2 className="mx-auto text-[var(--accent)]" size={32} /><h1 className="mt-4 text-xl font-bold">{message}</h1><p className="mt-2 text-sm text-[var(--text-muted)]">Branch: {branch.name}</p>{reference && <p className="mt-4 rounded-lg bg-[var(--bg)] px-3 py-2 text-xs">Reference: <strong>{reference}</strong></p>}<p className="mt-4 text-xs text-[var(--text-muted)]">Prototype mode: saved in browser-local mock data; no payment or identity verification was performed.</p></PublicShell>;
  const isProfile = mode === "profile";
  const reportError = (message: string, failure = false) => {
    setError(message);
    if (failure) toast.error(message);
    else toast.warning(message);
  };
  const submit = () => {
    setError("");
    if (!phone.trim() || (isProfile && !name.trim())) {
      return reportError(isProfile ? "Full name and mobile number are required." : "Mobile number is required.");
    }
    if (!/^\+?[0-9 ()-]{10,20}$/.test(phone.trim())) {
      return reportError("Enter a valid mobile number.");
    }
    setLoading(true);
    try {
      if (isProfile) {
        const result = submitProfileRegistration({ branchId, name, phone, email });
        setReference(result.submission.reference);
        setMessage(result.duplicate ? "Submission received for duplicate review" : "Profile registration received");
        toast.success(result.duplicate ? "Profile submission received for review." : "Profile registration received.");
      } else {
        const result = checkInWalkIn(branchId, phone);
        if (result.kind === "not-found") {
          return reportError("No matching customer profile was found. Complete profile registration first or ask the front desk for help.");
        }
        if (result.kind === "not-configured") {
          return reportError("The walk-in price is not configured. Please contact the front desk for help.", true);
        }
        if (result.kind === "ambiguous") {
          return reportError("Multiple profiles match this number. Please ask the front desk to resolve your identity.");
        }
        if (result.kind === "duplicate") {
          return reportError(`${result.customer.name} already has an open visit at ${branch.name}.`);
        }
        setMessage("Walk-in check-in confirmed");
        setReference(result.walkIn.id);
        toast.success("Walk-in check-in confirmed.");
      }
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Unable to save this request.", true);
    } finally {
      setLoading(false);
    }
  };
  const walkInPriceConfig = servicePrices.find((item) => item.name === "Non-member walk-in" && item.active);
  const matchingCustomers = findCustomersByPhone(phone);
  const walkInPrice = walkInPriceConfig && matchingCustomers.length === 1 ? priceForCustomer(walkInPriceConfig, matchingCustomers[0].classification) : walkInPriceConfig?.amount;
  return <PublicShell><div className="mb-6 text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)]"><Activity size={19} /></div><p className="mt-3 text-lg font-bold">GyTrak</p><p className="mt-1 text-xs uppercase tracking-[.16em] text-[var(--text-muted)]">{branch.name}</p></div><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"><div className="flex items-center gap-2 text-[var(--accent)]">{isProfile ? <Activity size={18} /> : <CreditCard size={18} />}<h1 className="text-xl font-bold text-[var(--text)]">{isProfile ? "Customer Profile Registration" : "Walk-in Check-in"}</h1></div><p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{isProfile ? "Create or locate your customer profile. Staff will review it before approval." : "Check in for an actual gym visit. Registration, payment, and membership remain separate."}</p><div className="mt-6 space-y-4">{isProfile && <Field label="Full name" value={name} onChange={setName} placeholder="Your full name" />}{<Field label="Mobile number" value={phone} onChange={setPhone} placeholder="+63 917 000 0000" />}{isProfile && <Field label="Email address" value={email} onChange={setEmail} placeholder="Optional" type="email" />}</div>{!isProfile && <div className="mt-5 rounded-lg bg-[var(--bg)] p-3 text-xs text-[var(--text-muted)]">Walk-in fee: <strong className="text-[var(--text)]">{walkInPrice === undefined ? "Not configured" : `₱${walkInPrice.toLocaleString("en-PH")}`}</strong> · Payment remains pending until staff records receipt.</div>}{error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}<button disabled={loading || (!isProfile && walkInPrice === undefined)} onClick={submit} className="mt-5 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50">{loading ? "Saving…" : isProfile ? "Submit profile registration" : "Confirm check-in"}</button></section></PublicShell>;
}
function PublicShell({ children }: { children: ReactNode }) { return <main className="min-h-screen bg-[var(--bg)] px-5 py-10 text-[var(--text)]"><div className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center shadow-sm">{children}</div></main>; }
function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) { return <label className="block text-left"><span className="mb-1.5 block text-xs font-medium">{label}<span className="ml-1 text-red-500">*</span></span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]" /></label>; }
