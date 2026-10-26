import { useState } from "react";
import Modal from "../shared/Modal";
import CustomerCombobox from "../shared/CustomerCombobox";
import type { BranchRecord, Customer, Membership } from "../../types";
import { toast } from "../shared/toast";

type AttendanceInput = {
  customerId: string;
  branch: string;
  type: "Member" | "Walk-in";
  date: string;
  timeIn: string;
  timeOut: string;
  note?: string;
};

export default function ManualAttendanceModal({
  isAdmin,
  assignedBranch,
  customers,
  memberships,
  branches,
  onClose,
  onSave,
}: {
  isAdmin: boolean;
  assignedBranch: string;
  customers: Customer[];
  memberships: Membership[];
  branches: BranchRecord[];
  onClose: () => void;
  onSave: (input: AttendanceInput) => string | null;
}) {
  const [customerId, setCustomerId] = useState("");
  const [type, setType] = useState<"Member" | "Walk-in">("Member");
  const [branch, setBranch] = useState(isAdmin ? "" : assignedBranch);
  const [date, setDate] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [timeIn, setTimeIn] = useState(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
  const [timeOut, setTimeOut] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const showValidationError = (message: string) => {
    setError(message);
    toast.warning(message);
  };
  const selected = customers.find((customer) => customer.id === customerId);
  const membership = memberships.find((item) => item.customerId === customerId);

  const submit = () => {
    setError("");
    if (!customerId || !selected) return showValidationError("Select an existing customer.");
    if (!branch) return showValidationError("Select a branch.");
    if (type === "Member" && (!membership || membership.status !== "Active")) {
      return showValidationError(`This customer does not have an active membership. Current status: ${membership?.status ?? "None"}.`);
    }
    if (!/^\d{2}:\d{2}$/.test(timeIn) || (timeOut && !/^\d{2}:\d{2}$/.test(timeOut))) {
      return showValidationError("Enter valid time-in and time-out values.");
    }
    const result = onSave({ customerId, branch, type, date: new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" }), timeIn, timeOut: timeOut || "—", note: note.trim() || undefined });
    if (result) {
      setError(result);
      toast.error(result);
    }
  };

  return (
    <Modal label="Log attendance" onClose={onClose} wide>
      <div className="pr-8">
        <p className="mb-1 text-sm font-medium text-[var(--accent)]">Manual entry</p>
        <h2 className="text-xl font-bold">Log attendance</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Record a customer visit separately from payment and membership changes.</p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-medium">Customer</span><CustomerCombobox customers={customers.filter((customer) => isAdmin || customer.branch === assignedBranch)} value={customerId} onChange={setCustomerId} placeholder="Search by name, phone, or customer ID" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-medium">Attendance type</span><select value={type} onChange={(event) => setType(event.target.value as "Member" | "Walk-in")} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"><option>Member</option><option>Walk-in</option></select></label>
        <label className="block"><span className="mb-1.5 block text-xs font-medium">Branch</span><select value={branch} onChange={(event) => setBranch(event.target.value)} disabled={!isAdmin} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"><option value="">Select branch</option>{branches.filter((item) => item.status === "Active" && (isAdmin || item.name === assignedBranch)).map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-xs font-medium">Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-medium">Time-in</span><input type="time" value={timeIn} onChange={(event) => setTimeIn(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-medium">Time-out (optional)</span><input type="time" value={timeOut} onChange={(event) => setTimeOut(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label>
      </div>
      {selected && <div className="mt-4 rounded-lg bg-[var(--bg)] p-3 text-xs text-[var(--text-muted)]">Category: <strong className="text-[var(--text)]">{selected.classification ?? "Regular"}</strong> · Membership: <strong className="text-[var(--text)]">{membership?.status ?? "None"}</strong>{membership?.plan ? ` · ${membership.plan}` : ""}</div>}
      <label className="mt-4 block"><span className="mb-1.5 block text-xs font-medium">Note or reason (optional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm" placeholder="Why was this attendance recorded manually?" /></label>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium">Cancel</button><button type="button" onClick={submit} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]">Save attendance</button></div>
    </Modal>
  );
}
