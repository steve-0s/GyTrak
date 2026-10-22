import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Edit3,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { formatPHP as php } from "../../lib/utils";
import { addBillingMonths, durationToMonths, membershipDueState } from "../../lib/membership";
import Modal from "../../components/shared/Modal";
import { nextMockId } from "../../services/mockApi";
import { useGymData } from "../../contexts/GymDataContext";
import type { Membership as SharedMembership, MembershipPlan as SharedMembershipPlan } from "../../types";

type WalkIn = {
  id: string;
  customer: string;
  customerId: string;
  branch: string;
  date: string;
  timeIn: string;
  timeOut: string;
  fee: number;
  payment: "Paid" | "Pending";
  method: string;
  status: "Registered" | "Completed" | "Checked in";
};
type Membership = SharedMembership;
type Plan = SharedMembershipPlan;
type Props = {
  isAdmin: boolean;
  branch?: string;
  onAction: (message: string) => void;
  initialView?: "walkins" | "memberships";
  openWalkInSignal?: number;
};

const badge = (value: string) =>
  value === "Active" || value === "Paid" || value === "Completed"
    ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
    : value === "Pending" || value === "Checked in"
      ? "bg-amber-50 text-amber-700"
      : value === "Expired" || value === "Suspended"
        ? "bg-red-50 text-red-700"
        : "bg-[var(--bg)] text-[var(--text-muted)]";

export default function WalkInsMembershipsPage({
  isAdmin,
  branch: assignedBranch = "Makati Central",
  onAction,
  initialView = "walkins",
  openWalkInSignal = 0,
}: Props) {
  const { customers, walkIns, memberships, membershipPlans: plans, payments, addWalkIn, removeWalkIn, updateWalkIn, createMembership, updateMembership, removeMembership, addMembershipPlan, recordMembershipPayment } = useGymData();
  const [view, setView] = useState<"walkins" | "memberships" | "plans">(
    initialView,
  );
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | null>(null);
  const [selectedMembership, setSelectedMembership] =
    useState<Membership | null>(null);
  const [walkInForm, setWalkInForm] = useState(false);
  const [membershipForm, setMembershipForm] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [scopedBranch, setScopedBranch] = useState(isAdmin ? "All branches" : assignedBranch);
  useEffect(() => {
    if (openWalkInSignal) setWalkInForm(true);
  }, [openWalkInSignal]);
  const scopedWalkIns = walkIns.filter(
    (item) => scopedBranch === "All branches" || item.branch === scopedBranch,
  );
  const scopedMemberships = memberships.filter(
    (item) => scopedBranch === "All branches" || item.branch === scopedBranch,
  );
  const filteredWalkIns = scopedWalkIns.filter(
    (item) =>
      `${item.customer} ${item.id}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "All statuses" ||
        item.payment === status ||
        item.status === status),
  );
  const filteredMemberships = scopedMemberships.filter(
    (item) =>
      `${item.customer} ${item.id}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "All statuses" ||
        item.status === status ||
        item.payment === status),
  );

  if (selectedWalkIn)
    return (
      <WalkInDetails
        visit={selectedWalkIn}
        onBack={() => setSelectedWalkIn(null)}
        onPayment={(method) => {
          updateWalkIn(selectedWalkIn.id, { payment: "Paid", method });
          setSelectedWalkIn({ ...selectedWalkIn, payment: "Paid", method });
          onAction("Walk-in payment recorded");
        }}
        onCorrect={(reason) => {
          updateWalkIn(selectedWalkIn.id, { reason });
          onAction(`Walk-in corrected: ${reason}`);
          setSelectedWalkIn(null);
        }}
      />
    );
  if (selectedMembership)
    return (
      <MembershipDetails
        membership={selectedMembership}
        payments={payments.filter((payment) => payment.membershipId === selectedMembership.id)}
        onRecordPayment={(payment) => {
          recordMembershipPayment(selectedMembership.id, payment);
          setSelectedMembership({ ...selectedMembership, payment: "Paid", status: selectedMembership.status === "Expired" ? "Active" : selectedMembership.status, end: addBillingMonths(selectedMembership.end, durationToMonths(selectedMembership.plan)) });
        }}
        onBack={() => setSelectedMembership(null)}
        onUpdate={(updated) => {
          updateMembership(updated);
          setSelectedMembership(updated);
          onAction("Membership status updated");
        }}
        onAction={onAction}
      />
    );
  if (walkInForm)
    return (
      <Modal label="Register walk-in" onClose={() => setWalkInForm(false)} wide>
          <WalkInForm
        customers={customers}
        branch={
          scopedBranch === "All branches" ? "Makati Central" : scopedBranch
        }
        onBack={() => setWalkInForm(false)}
        onSave={(visit) => {
          addWalkIn(visit);
          setWalkInForm(false);
          onAction("Walk-in visit registered");
        }}
        />
      </Modal>
    );
  if (membershipForm)
    return (
      <Modal label="Create membership" onClose={() => setMembershipForm(false)} wide>
        <MembershipForm
        customers={customers}
        plans={plans}
        branch={
          scopedBranch === "All branches" ? "Makati Central" : scopedBranch
        }
        onBack={() => setMembershipForm(false)}
        onSave={(membership) => {
          createMembership(membership);
          setMembershipForm(false);
          onAction("Membership created");
        }}
        />
      </Modal>
    );

  if (view === "plans")
    return (
      <PlansPage
        plans={plans}
        onBack={() => setView("memberships")}
        onSave={(plan) => {
          addMembershipPlan(plan);
          onAction("Membership plan created");
        }}
      />
    );
  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">
            {scopedBranch}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            {view === "walkins" ? "Walk-ins" : "Memberships"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {view === "walkins"
              ? "Manage visits, payments, and existing customer profiles."
              : "Track active plans, renewals, and membership status."}
          </p>
        </div>
        <div className="flex gap-2">
          {view === "memberships" && (
            <button
              onClick={() => setView("plans")}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium"
            >
              Membership plans
            </button>
          )}
          <button
            onClick={() =>
              view === "walkins" ? setWalkInForm(true) : setMembershipForm(true)
            }
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]"
          >
            <Plus size={16} />{" "}
            {view === "walkins" ? "Register Walk-in" : "Create Membership"}
          </button>
        </div>
      </div>
      <div className="mb-5 flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-sm sm:w-fit">
        <button
          onClick={() => {
            setView("walkins");
            setQuery("");
            setStatus("All statuses");
          }}
          className={`rounded-md px-4 py-2 ${view === "walkins" ? "bg-[var(--accent-subtle)] font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
        >
          Walk-ins
        </button>
        <button
          onClick={() => {
            setView("memberships");
            setQuery("");
            setStatus("All statuses");
          }}
          className={`rounded-md px-4 py-2 ${view === "memberships" ? "bg-[var(--accent-subtle)] font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
        >
          Memberships
        </button>
      </div>
      {isAdmin && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Branch</span>
          <select value={scopedBranch} onChange={(event) => setScopedBranch(event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs outline-none">
            <option>All branches</option>
            <option>Makati Central</option>
            <option>BGC High Street</option>
            <option>Cebu IT Park</option>
            <option>Quezon Avenue</option>
          </select>
        </div>
      )}
      {view === "walkins" ? (
        <WalkInList
          customers={customers}
          rows={filteredWalkIns}
          allRows={scopedWalkIns}
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          onSelect={setSelectedWalkIn}
          onDelete={(row) => {
            if (window.confirm(`Delete walk-in ${row.id}?`)) {
              removeWalkIn(row.id);
              onAction("Walk-in deleted");
            }
          }}
        />
      ) : (
        <MembershipList
          rows={filteredMemberships}
          allRows={scopedMemberships}
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          onSelect={setSelectedMembership}
          onDelete={(row) => {
            if (window.confirm(`Delete membership ${row.id}?`)) {
              removeMembership(row.id);
              onAction("Membership deleted");
            }
          }}
        />
      )}
    </div>
  );
}

function WalkInList({
  customers,
  rows,
  allRows,
  query,
  setQuery,
  status,
  setStatus,
  onSelect,
  onDelete,
}: {
  customers: Array<{ id: string }>;
  rows: WalkIn[];
  allRows: WalkIn[];
  query: string;
  setQuery: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  onSelect: (row: WalkIn) => void;
  onDelete: (row: WalkIn) => void;
}) {
  const paid = allRows
    .filter((row) => row.payment === "Paid")
    .reduce((sum, row) => sum + row.fee, 0);
  const existingCustomerIds = new Set<string>(customers.map((customer) => customer.id));
  const newWalkInCustomers = new Set(
    allRows
      .filter((row) => !existingCustomerIds.has(row.customerId))
      .map((row) => row.customerId),
  ).size;
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Visits in selected period", allRows.length],
          [
            "Unique walk-in customers",
            new Set(allRows.map((row) => row.customerId)).size,
          ],
          ["New walk-in customers", newWalkInCustomers],
          ["Recorded fees collected", php(paid)],
          [
            "Pending payments",
            php(
              allRows
                .filter((row) => row.payment === "Pending")
                .reduce((sum, row) => sum + row.fee, 0),
            ),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <DataTable
        title="Walk-in visits"
        query={query}
        setQuery={setQuery}
        status={status}
        setStatus={setStatus}
        statusOptions={[
          "All statuses",
          "Paid",
          "Pending",
          "Registered",
          "Checked in",
          "Completed",
        ]}
      >
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              {[
                "Visit ID",
                "Customer",
                "Branch",
                "Visit date",
                "Time-in",
                "Time-out",
                "Fee",
                "Payment",
                "",
              ].map((label) => (
                <th key={label} className="px-5 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--bg)]">
                <td className="px-5 py-4 font-medium text-[var(--text-muted)]">
                  {row.id}
                </td>
                <td className="px-5 py-4 font-semibold">{row.customer}</td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {row.branch}
                </td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {row.date}
                </td>
                <td className="px-5 py-4">{row.timeIn}</td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {row.timeOut}
                </td>
                <td className="px-5 py-4">{php(row.fee)}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(row.payment)}`}
                  >
                    {row.payment}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <RowActions onDetails={() => onSelect(row)} onDelete={() => onDelete(row)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <Empty text="No walk-in visits match the current filters." />
        )}
      </DataTable>
    </>
  );
}

function MembershipList({
  rows,
  allRows,
  query,
  setQuery,
  status,
  setStatus,
  onSelect,
  onDelete,
}: {
  rows: Membership[];
  allRows: Membership[];
  query: string;
  setQuery: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  onSelect: (row: Membership) => void;
  onDelete: (row: Membership) => void;
}) {
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          [
            "Active memberships",
            allRows.filter((row) => row.status === "Active").length,
          ],
          [
            "Pending memberships",
            allRows.filter((row) => row.status === "Pending").length,
          ],
          [
            "Expired memberships",
            allRows.filter((row) => row.status === "Expired").length,
          ],
          [
            "New members",
            allRows.filter((row) => row.start.includes("Oct 2026")).length,
          ],
          [
            "Expiring soon",
            allRows.filter((row) => ["soon", "today"].includes(membershipDueState(row.end).key)).length,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <DataTable
        title="Membership records"
        query={query}
        setQuery={setQuery}
        status={status}
        setStatus={setStatus}
        statusOptions={[
          "All statuses",
          "Active",
          "Pending",
          "Expired",
          "Suspended",
        ]}
      >
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              {[
                "Membership ID",
                "Customer",
                "Plan",
                "Start date",
                "End date",
                "Status",
                "Payment / due",
                "Branch",
                "",
              ].map((label) => (
                <th key={label} className="px-5 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--bg)]">
                <td className="px-5 py-4 font-medium text-[var(--text-muted)]">
                  {row.id}
                </td>
                <td className="px-5 py-4 font-semibold">{row.customer}</td>
                <td className="px-5 py-4">{row.plan}</td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {row.start}
                </td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {row.end}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(row.status)}`}
                  >
                    {row.status}
                  </span>
                  {membershipDueState(row.end).key !== "upcoming" && <p className={`mt-1 text-[10px] ${membershipDueState(row.end).key === "overdue" ? "text-red-600" : "text-amber-600"}`}>{membershipDueState(row.end).label}</p>}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(row.payment)}`}
                  >
                    {row.payment}
                  </span>
                </td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {row.branch}
                </td>
                <td className="px-5 py-4 text-right">
                  <RowActions onDetails={() => onSelect(row)} onDelete={() => onDelete(row)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <Empty text="No memberships match the current filters." />
        )}
      </DataTable>
    </>
  );
}

function RowActions({
  onDetails,
  onDelete,
}: {
  onDetails: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-end">
      <button
        aria-label="More options"
        onClick={() => setOpen((current) => !current)}
        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 min-w-32 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
          <button
            onClick={() => {
              setOpen(false);
              onDetails();
            }}
            className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg)]"
          >
            View / edit
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DataTable({
  title,
  query,
  setQuery,
  status,
  setStatus,
  statusOptions,
  children,
}: {
  title: string;
  query: string;
  setQuery: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  statusOptions: string[];
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:p-5">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search records"
              className="w-36 bg-transparent text-xs outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>
          <label className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-2">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="bg-transparent text-xs outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function WalkInForm({
  customers,
  branch,
  onBack,
  onSave,
}: {
  customers: Array<{ id: string; name: string }>;
  branch: string;
  onBack: () => void;
  onSave: (visit: WalkIn) => void;
}) {
  const [existing, setExisting] = useState(true);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("250");
  const [payment, setPayment] = useState<"Paid" | "Pending">("Paid");
  const [checkedIn, setCheckedIn] = useState(false);
  const [error, setError] = useState("");
  const submit = () => {
    if (!name.trim())
      return setError(
        "Select an existing customer or enter a new customer name.",
      );
    const matchedCustomer = customers.find(
      (customer) =>
        customer.name.toLowerCase() === name.trim().toLowerCase() ||
        customer.id.toLowerCase() === name.trim().toLowerCase(),
    );
    if (existing && !matchedCustomer)
      return setError("Select an existing customer from the customer records.");
    onSave({
      id: nextMockId("VIS", 20850),
      customer: name,
      customerId: matchedCustomer?.id ?? nextMockId("CUS", 10501),
      branch,
      date: "Oct 20, 2026",
      timeIn: checkedIn ? "Now" : "Not checked in",
      timeOut: "—",
      fee: Number(fee) || 0,
      payment,
      method: payment === "Paid" ? "Cash" : "—",
      status: checkedIn ? "Checked in" : "Registered",
    });
  };
  return (
    <FormShell
      title="Register Walk-in"
      subtitle="Registration and attendance are separate actions."
      onBack={onBack}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-medium">Customer</p>
          <div className="flex gap-2">
            <button
              onClick={() => setExisting(true)}
              className={`rounded-lg border px-3 py-2 text-sm ${existing ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]" : "border-[var(--border)]"}`}
            >
              Existing customer
            </button>
            <button
              onClick={() => setExisting(false)}
              className={`rounded-lg border px-3 py-2 text-sm ${!existing ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]" : "border-[var(--border)]"}`}
            >
              New profile
            </button>
          </div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              existing ? "Search by name or customer ID" : "Full name"
            }
            className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <Field label="Branch" value={branch} disabled />
        <Field label="Visit fee" value={fee} onChange={setFee} prefix="₱" />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">
            Payment status
          </span>
          <select
            value={payment}
            onChange={(event) =>
              setPayment(event.target.value as "Paid" | "Pending")
            }
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"
          >
            <option>Paid</option>
            <option>Pending</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">
            Payment method
          </span>
          <select
            disabled={payment === "Pending"}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"
          >
            <option>Cash</option>
            <option>GCash</option>
            <option>Card</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={checkedIn}
            onChange={(event) => setCheckedIn(event.target.checked)}
          />{" "}
          Confirm physical check-in now
        </label>
      </div>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end border-t border-[var(--border)] pt-5">
        <button
          onClick={submit}
          className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]"
        >
          Save walk-in visit
        </button>
      </div>
    </FormShell>
  );
}

function WalkInDetails({
  visit,
  onBack,
  onPayment,
  onCorrect,
}: {
  visit: WalkIn;
  onBack: () => void;
  onPayment: (method: string) => void;
  onCorrect: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("Cash");
  return (
    <FormShell
      title={visit.id}
      subtitle={`${visit.customer} · ${visit.branch}`}
      onBack={onBack}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Info label="Visit date" value={visit.date} />
        <Info label="Visit status" value={visit.status} />
        <Info label="Time-in" value={visit.timeIn} />
        <Info label="Time-out" value={visit.timeOut} />
        <Info label="Fee" value={php(visit.fee)} />
        <Info label="Payment" value={`${visit.payment} · ${visit.method}`} />
      </div>
      <div className="mt-6 border-t border-[var(--border)] pt-5">
        {visit.payment === "Pending" && <div className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><h3 className="font-semibold">Record manual payment</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Payment remains pending until staff confirms receipt.</p><div className="mt-3 flex flex-wrap gap-2"><select value={method} onChange={(event) => setMethod(event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"><option>Cash</option><option>GCash</option><option>Card</option><option>Bank transfer</option></select><button onClick={() => onPayment(method)} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)]">Confirm payment received</button></div></div>}
        <h3 className="font-semibold">Correct visit record</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          A reason is required and the correction remains in the audit trail.
        </p>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for correction"
          className="mt-3 w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm outline-none"
        />
        <button
          disabled={!reason.trim()}
          onClick={() => onCorrect(reason)}
          className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40"
        >
          Save correction
        </button>
      </div>
    </FormShell>
  );
}

function MembershipForm({
  customers,
  plans,
  branch,
  onBack,
  onSave,
}: {
  customers: Array<{ id: string; name: string }>;
  plans: Plan[];
  branch: string;
  onBack: () => void;
  onSave: (membership: Membership) => void;
}) {
  const [customer, setCustomer] = useState("");
  const [plan, setPlan] = useState(plans[0].name);
  const selected = plans.find((item) => item.name === plan) ?? plans[0];
  const [payment, setPayment] = useState<"Paid" | "Pending">("Pending");
  const [error, setError] = useState("");
  return (
    <FormShell
      title="Create Membership"
      subtitle="Link a plan to an existing customer profile."
      onBack={onBack}
    >
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium">Customer</span>
        <input
          value={customer}
          onChange={(event) => setCustomer(event.target.value)}
          placeholder="Search customer name or ID"
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm outline-none"
        />
      </label>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">
            Membership plan
          </span>
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"
          >
            {plans
              .filter((item) => item.active)
              .map((item) => (
                <option key={item.name}>{item.name}</option>
              ))}
          </select>
        </label>
        <Info label="Plan price" value={php(selected.price)} />
        <Info label="Branch" value={branch} />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">
            Payment status
          </span>
          <select
            value={payment}
            onChange={(event) =>
              setPayment(event.target.value as "Paid" | "Pending")
            }
            className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"
          >
            <option>Pending</option>
            <option>Paid</option>
          </select>
        </label>
      </div>
      {error && <p className="mt-4 text-xs text-red-600">{error}</p>}
      <button
        onClick={() => {
          if (!customer.trim())
            return setError(
              "Select an existing customer before creating a membership.",
            );
          const matchedCustomer = customers.find(
            (item) =>
              item.name.toLowerCase() === customer.trim().toLowerCase() ||
              item.id.toLowerCase() === customer.trim().toLowerCase(),
          );
          if (!matchedCustomer)
            return setError("Select an existing customer from the customer records.");
          onSave({
            id: nextMockId("MEM", 820),
            customer: matchedCustomer.name,
            customerId: matchedCustomer.id,
            plan: selected.name,
            start: "Oct 20, 2026",
            end: addBillingMonths("Oct 20, 2026", durationToMonths(selected.duration)),
            status: payment === "Paid" ? "Active" : "Pending",
            payment,
            branch,
            price: selected.price,
          });
        }}
        className="mt-6 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]"
      >
        Confirm membership
      </button>
    </FormShell>
  );
}

function MembershipDetails({
  membership,
  payments,
  onRecordPayment,
  onBack,
  onUpdate,
  onAction,
}: {
  membership: Membership;
  payments: Array<{ id: string; date: string; amount: number; method: string; reference: string }>;
  onRecordPayment: (payment: { date: string; amount: number; method: string; reference: string }) => void;
  onBack: () => void;
  onUpdate: (membership: Membership) => void;
  onAction: (message: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [amount, setAmount] = useState(String(membership.price));
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const dueState = membershipDueState(membership.end);
  const recordPayment = () => {
    const payment = {
      date: "Oct 20, 2026",
      amount: Number(amount) || 0,
      method,
      reference: reference.trim() || "—",
    };
    if (!payment.amount) return;
    onRecordPayment(payment);
    onAction("Manual membership payment recorded");
    setRecording(false);
  };
  return (
    <FormShell
      title={membership.id}
      subtitle={`${membership.customer} · ${membership.branch}`}
      onBack={onBack}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Info
          label="Customer profile"
          value={`${membership.customer} (${membership.customerId})`}
        />
        <Info label="Plan" value={membership.plan} />
        <Info label="Start date" value={membership.start} />
        <Info label="End date" value={membership.end} />
        <Info label="Status" value={membership.status} />
        <Info
          label="Payment status"
          value={`${membership.payment} · ${php(membership.price)}`}
        />
        <Info label="Next due date" value={`${membership.end} · ${dueState.label}`} />
      </div>
      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-semibold">Manual payment recording</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Record payment only after staff confirms the member has paid. GyTrak never charges automatically.</p></div>
          <button onClick={() => setRecording(!recording)} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--on-accent)]">Record payment</button>
        </div>
        {recording && <div className="mt-4 grid gap-3 sm:grid-cols-3"><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" placeholder="Amount" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /><select value={method} onChange={(event) => setMethod(event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"><option>Cash</option><option>GCash</option><option>Card</option><option>Bank transfer</option></select><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Reference (optional)" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /><button onClick={recordPayment} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] sm:col-span-3">Confirm payment received</button></div>}
      </div>
      <div id="membership-payment-history" className="mt-5 rounded-lg border border-[var(--border)] p-4"><h3 className="font-semibold">Payment history</h3>{payments.length ? <div className="mt-3 space-y-2 text-xs">{payments.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-2"><span>{payment.date} · {payment.method}</span><span className="text-[var(--text-muted)]">{php(payment.amount)} · {payment.reference}</span></div>)}</div> : <p className="mt-2 text-xs text-[var(--text-muted)]">No payment history has been recorded in this prototype.</p>}</div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
        {membership.status === "Active" && (
          <button
            onClick={() => onUpdate({ ...membership, status: "Suspended" })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            Suspend
          </button>
        )}
        {membership.status === "Suspended" && (
          <button
            onClick={() => onUpdate({ ...membership, status: "Active" })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            Reactivate
          </button>
        )}
        {membership.status === "Expired" && (
          <button
            onClick={() => setRecording(true)}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)]"
          >
            Renew membership
          </button>
        )}
        <button
          onClick={() => document.getElementById("membership-payment-history")?.scrollIntoView({ behavior: "smooth" })}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        >
          Payment history
        </button>
      </div>
    </FormShell>
  );
}

function PlansPage({
  plans,
  onBack,
  onSave,
}: {
  plans: Plan[];
  onBack: () => void;
  onSave: (plan: Plan) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("1 month");
  const [price, setPrice] = useState("");
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
      >
        <ArrowLeft size={16} /> Back to memberships
      </button>
      <div className="mb-6 flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">Membership Plans</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Reusable plans for membership conversion and new records.
          </p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]"
        >
          <Plus size={16} /> Add plan
        </button>
      </div>
      {adding && (
        <Modal label="Add membership plan" onClose={() => setAdding(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Plan name"
            className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          />
          <select
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          >
            <option>1 month</option>
            <option>3 months</option>
            <option>12 months</option>
          </select>
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            type="number"
            min="0"
            placeholder="Price in PHP"
            className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              if (name.trim() && Number(price) > 0) {
                onSave({
                  name,
                  duration,
                  price: Number(price),
                  active: true,
                  used: 0,
                });
                setAdding(false);
                setName("");
                setPrice("");
              }
            }}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)]"
          >
            Save plan
          </button>
        </div>
        </Modal>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <section
            key={plan.name}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">{plan.name}</h3>
              <span
                className={`rounded-full px-2 py-1 text-[11px] ${plan.active ? badge("Active") : badge("Expired")}`}
              >
                {plan.active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold">{php(plan.price)}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {plan.duration}
            </p>
            <div className="mt-5 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
              {plan.used} memberships use this plan
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function FormShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
      >
        <ArrowLeft size={16} /> Back
      </button>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
      </div>
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        {children}
      </section>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  prefix,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  prefix?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      <div className="flex items-center rounded-lg border border-[var(--border)] px-3">
        <span className="text-sm text-[var(--text-muted)]">{prefix}</span>
        <input
          disabled={disabled}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="w-full bg-transparent py-2.5 text-sm outline-none disabled:text-[var(--text-muted)]"
        />
      </div>
    </label>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="p-10 text-center text-sm text-[var(--text-muted)]">
      {text}
    </div>
  );
}
