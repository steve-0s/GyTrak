import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useGymData } from "../../contexts/GymDataContext";
import { priceForCustomer } from "../../lib/pricing";
import { toast } from "../../components/shared/toast";

function branchIdFromUrl() {
  return new URLSearchParams(window.location.search).get("branchId") ?? "";
}

export default function QRRegistrationPage({ mode = "profile" }: { mode?: "profile" | "walk-in" }) {
  const { branches, servicePrices, submitProfileRegistration, checkInWalkIn, findCustomersByPhone } = useGymData();
  const branchId = branchIdFromUrl();
  const branch = branches.find((item) => item.id === branchId && item.status === "Active");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const isProfile = mode === "profile";

  if (!branch) {
    return (
      <PublicShell>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <MapPin size={25} />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Branch link unavailable</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">We couldn’t find this gym</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
          This QR link may be incorrect or the branch may no longer be active. Please ask the front desk for a current registration link.
        </p>
      </PublicShell>
    );
  }

  if (submitted) {
    return (
      <PublicShell>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 size={29} />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Request received</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {isProfile ? "Thanks for registering" : "You’re checked in"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          {isProfile
            ? `Your profile request for ${branch.name} is ready for staff review.`
            : `Your visit at ${branch.name} has been recorded.`}
        </p>
        {reference && (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-left">
            <p className="text-xs text-[var(--text-muted)]">Reference number</p>
            <p className="mt-1 font-mono text-sm font-semibold">{reference}</p>
          </div>
        )}
        {isProfile ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-950">
            <p className="font-semibold">Please note</p>
            <p className="mt-1">
              This prototype saves requests in this browser only; it does not send them to gym staff. Visit the front desk to complete your registration.
            </p>
          </div>
        ) : (
          <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">
            Payment and membership activation are handled separately by the front desk.
          </p>
        )}
      </PublicShell>
    );
  }

  const reportError = (message: string) => {
    setError(message);
    toast.warning(message);
  };

  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setError("");

    if (!phone.trim() || (isProfile && !name.trim())) {
      return reportError(isProfile ? "Full name and mobile number are required." : "Mobile number is required.");
    }
    if (!/^\+?[0-9 ()-]{10,20}$/.test(phone.trim())) {
      return reportError("Enter a valid mobile number.");
    }
    if (isProfile && email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return reportError("Enter a valid email address or leave it blank.");
    }

    setLoading(true);
    try {
      if (isProfile) {
        const result = submitProfileRegistration({ branchId, name, phone, email });
        setReference(result.submission.reference);
        setSubmitted(true);
        return;
      }

      const result = checkInWalkIn(branchId, phone);
      if (result.kind === "not-found") {
        return reportError("No matching customer profile was found. Complete profile registration first or ask the front desk for help.");
      }
      if (result.kind === "not-configured") {
        return reportError("The walk-in price is not configured. Please contact the front desk for help.");
      }
      if (result.kind === "ambiguous") {
        return reportError("Multiple profiles match this number. Please ask the front desk to resolve your identity.");
      }
      if (result.kind === "duplicate") {
        return reportError(`${result.customer.name} already has an open visit at ${branch.name}.`);
      }

      setReference(result.walkIn.id);
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save this request.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const walkInPriceConfig = servicePrices.find((item) => item.name === "Non-member walk-in" && item.active);
  const matchingCustomers = findCustomersByPhone(phone);
  const walkInPrice = walkInPriceConfig && matchingCustomers.length === 1
    ? priceForCustomer(walkInPriceConfig, matchingCustomers[0].classification)
    : walkInPriceConfig?.amount;

  return (
    <main className="public-registration min-h-screen bg-[#f5f7f5] px-4 py-6 text-[var(--text)] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5" aria-label="GyTrak">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-800 text-white">
              <Activity size={20} />
            </span>
            <span className="text-lg font-bold tracking-tight">GyTrak</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
            <ShieldCheck size={14} className="text-emerald-700" />
            Public registration
          </div>
        </header>

        <div className="grid overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative overflow-hidden bg-emerald-950 px-6 py-8 text-white sm:px-9 sm:py-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-50">
                <MapPin size={14} />
                {branch.name}
              </div>
              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                {isProfile ? "Welcome to the gym" : "Your visit starts here"}
              </p>
              <h1 className="mt-3 max-w-sm text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {isProfile ? "Let’s get your profile started." : "Check in for your visit."}
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-100/80">
                {isProfile
                  ? "Share a few details so our team can find or prepare the right profile for you."
                  : "Confirm your mobile number to look up your existing walk-in profile."}
              </p>

              <div className="mt-9 space-y-4">
                <Step icon={<UserRound size={17} />} title={isProfile ? "Your details" : "Find your profile"} detail="A few quick fields to get started" active />
                <Step icon={<Clock3 size={17} />} title="Staff review" detail="The front desk helps with the next step" />
                {isProfile && (
                  <Step icon={<CreditCard size={17} />} title="Membership is separate" detail="Registration does not activate a membership" />
                )}
              </div>

              <div className="mt-10 border-t border-white/15 pt-5 text-xs leading-5 text-emerald-100/70">
                {isProfile
                  ? "Already visited us? Enter the same contact details so staff can check for an existing profile."
                  : "Registration, attendance, and payment are separate records."}
              </div>
            </div>
          </section>

          <section className="px-5 py-7 sm:px-9 sm:py-10">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                {isProfile ? "Profile registration" : "Walk-in check-in"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                {isProfile ? "Your contact details" : "Find your profile"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {isProfile
                  ? "Phone number is required. Email is optional."
                  : "Use the mobile number connected to your customer profile."}
              </p>
            </div>

            <form onSubmit={submit} noValidate>
              <div className="space-y-5">
                {isProfile && (
                  <Field
                    id="registration-name"
                    label="Full name"
                    value={name}
                    onChange={setName}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                    icon={<UserRound size={17} />}
                  />
                )}
                <Field
                  id="registration-phone"
                  label="Mobile number"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+63 917 000 0000"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  icon={<Phone size={17} />}
                />
                {isProfile && (
                  <Field
                    id="registration-email"
                    label="Email address"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    icon={<Mail size={17} />}
                  />
                )}
              </div>

              {isProfile ? (
                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-sm font-semibold text-emerald-950">What happens next?</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-900/80">
                    Staff will review your details and check for an existing profile before creating a new one. This request does not check you in or start a membership.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Walk-in fee</span>
                    <strong>{walkInPrice === undefined ? "Not configured" : `₱${walkInPrice.toLocaleString("en-PH")}`}</strong>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Payment is recorded separately by staff.</p>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || (!isProfile && walkInPrice === undefined)}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Submitting…" : isProfile ? "Submit registration request" : "Confirm walk-in check-in"}
                {!loading && <ArrowRight size={17} />}
              </button>
              <p className="mt-4 text-center text-xs leading-5 text-[var(--text-muted)]">
                By continuing, you’re asking {branch.name} staff to review the details you submitted.
              </p>
            </form>
          </section>
        </div>

        <footer className="mt-5 flex flex-col items-center justify-between gap-2 text-xs text-[var(--text-muted)] sm:flex-row">
          <span>GyTrak · {branch.name}</span>
          <span>Need help? Please speak with the front desk.</span>
        </footer>
      </div>
    </main>
  );
}

function Step({ icon, title, detail, active = false }: { icon: ReactNode; title: string; detail: string; active?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? "bg-white text-emerald-900" : "bg-white/10 text-emerald-100"}`}>
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-emerald-100/65">{detail}</span>
      </span>
    </div>
  );
}

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="public-registration flex min-h-screen items-center justify-center bg-[#f5f7f5] px-4 py-10 text-center text-[var(--text)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-white p-7 shadow-sm sm:p-10">
        <div className="mx-auto flex w-fit items-center gap-2" aria-label="GyTrak">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-800 text-white"><Activity size={18} /></span>
          <span className="text-lg font-bold">GyTrak</span>
        </div>
        {children}
      </section>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  required = false,
  icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: "text" | "tel" | "email";
  autoComplete: string;
  required?: boolean;
  icon: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-center justify-between text-sm font-medium">
        <span>{label}{required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}</span>
        {required && <span className="text-xs font-normal text-[var(--text-muted)]">Required</span>}
      </label>
      <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3.5 transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <input
          id={id}
          name={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-required={required}
          className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-stone-400"
        />
      </div>
    </div>
  );
}
