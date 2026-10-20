import { useState } from "react";
import { Activity, CheckCircle2 } from "lucide-react";
import { customers } from "../../data/mockData";
import { normalizePhone } from "../../lib/utils";

export default function QRRegistrationPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [submitted, setSubmitted] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [error, setError] = useState("");
  const submit = () => {
    if (!form.name.trim() || !form.phone.trim())
      return setError("Please enter your full name and mobile number.");
    setError("");
    const submittedPhone = normalizePhone(form.phone);
    const matchingCustomer = customers.some(
      (customer) => normalizePhone(customer.phone) === submittedPhone,
    );
    setDuplicate(matchingCustomer);
    setSubmitted(true);
  };
  if (submitted)
    return (
      <main className="min-h-screen bg-[var(--bg)] px-5 py-10 text-[var(--text)]">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="mt-5 text-xl font-bold">Registration received</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {duplicate
              ? "Your details may match an existing profile. Our front desk team will review the submission before linking it."
              : "Your registration is pending front desk review at Makati Central."}
          </p>
          <p className="mt-5 rounded-lg bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-muted)]">
            Registration is not attendance. Please check in at the front desk
            when you arrive.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({ name: "", phone: "", email: "" });
            }}
            className="mt-5 text-sm font-semibold text-[var(--accent)]"
          >
            Submit another registration
          </button>
        </div>
      </main>
    );
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-10 text-[var(--text)]">
      <div className="mx-auto max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)]">
            <Activity size={19} />
          </div>
          <p className="mt-3 text-lg font-bold">GyTrak</p>
          <p className="mt-1 text-xs uppercase tracking-[.16em] text-[var(--text-muted)]">
            Makati Central
          </p>
        </div>
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h1 className="text-xl font-bold">Register your visit</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Complete this short form to create or locate your customer profile.
            A staff member will confirm your registration at the front desk.
          </p>
          <div className="mt-6 space-y-4">
            <Field
              label="Full name"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              placeholder="Your full name"
              required
            />
            <Field
              label="Mobile number"
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
              placeholder="+63 917 000 0000"
              required
            />
            <Field
              label="Email address"
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
              placeholder="Optional"
            />
          </div>
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <p className="mt-5 text-[11px] leading-relaxed text-[var(--text-muted)]">
            By submitting, you agree to let GyTrak use these details for
            registration review. Do not submit someone else’s information.
          </p>
          <button
            onClick={submit}
            className="mt-5 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"
          >
            Submit registration
          </button>
        </section>
      </div>
    </main>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
      />
    </label>
  );
}
