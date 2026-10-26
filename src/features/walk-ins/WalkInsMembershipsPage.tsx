import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Edit3,
  Plus,
  Search,
} from "lucide-react";
import { formatPHP as php } from "../../lib/utils";
import { addBillingMonths, durationToMonths, formatMembershipDate, membershipDueState, parseMembershipDate } from "../../lib/membership";
import Modal from "../../components/shared/Modal";
import OverlayDropdown from "../../components/shared/OverlayDropdown";
import FilterSelect from "../../components/shared/FilterSelect";
import CustomerCombobox from "../../components/shared/CustomerCombobox";
import ManualAttendanceModal from "../../components/modals/ManualAttendanceModal";
import { nextMockId, nowLabel } from "../../services/mockApi";
import { useGymData } from "../../contexts/GymDataContext";
import type { Customer as SharedCustomer, Membership as SharedMembership, MembershipPlan as SharedMembershipPlan, MembershipPolicySettings, PaymentMethod, PaymentRecord, ServicePrice, VisitRecord } from "../../types";
import { CustomerForm, type Customer } from "../customers/CustomersPage";
import { planPricingSummary, priceForCustomer, membershipPrice } from "../../lib/pricing";
import AttendancePage from "../attendance/AttendancePage";
import { toast } from "../../components/shared/toast";
import { isCollectedPayment } from "../../lib/financial";
import { businessDateKey, dashboardDateKey } from "../../lib/dashboardMetrics";

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
  serviceName?: string;
};
type Membership = SharedMembership;
type Plan = SharedMembershipPlan;
type Props = {
  isAdmin: boolean;
  branch?: string;
  onAction: (message: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  initialView?: "overview" | "walkins" | "memberships" | "attendance";
  openWalkInSignal?: number;
  openMembershipSignal?: number;
  openMembershipId?: string | null;
  onMembershipOpened?: () => void;
  openAttendanceSignal?: number;
  onAttendanceSignalConsumed?: () => void;
};

const badge = (value: string) =>
  value === "Active" || value === "Paid" || value === "Completed"
    ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
    : value === "Pending" || value === "Checked in"
      ? "bg-amber-50 text-amber-700"
      : value === "Expired" || value === "Suspended" || value === "Cancelled"
        ? "bg-red-50 text-red-700"
        : "bg-[var(--bg)] text-[var(--text-muted)]";

function dateInputValue(value: string) {
  const date = parseMembershipDate(value);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function WalkInsMembershipsPage({
  isAdmin,
  branch: assignedBranch = "Makati Central",
  onAction,
  onOpenCustomer,
  initialView = "overview",
  openWalkInSignal = 0,
  openMembershipSignal = 0,
  openMembershipId,
  onMembershipOpened,
  openAttendanceSignal = 0,
  onAttendanceSignalConsumed,
}: Props) {
  const { customers, walkIns, visits, memberships, membershipPlans: plans, membershipPolicySettings, paymentMethods, servicePrices, payments, branches, addWalkIn, removeWalkIn, updateWalkIn, createMembership, updateMembership, pauseMembershipBilling, resumeMembershipBilling, removeMembership, addMembershipPlan, recordWalkInPayment, recordMembershipPayment, recordManualAttendance, upsertCustomer } = useGymData();
  const [view, setView] = useState<"overview" | "walkins" | "memberships" | "plans" | "attendance">(
    initialView,
  );
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | null>(null);
  const [selectedMembership, setSelectedMembership] =
    useState<Membership | null>(null);
  const [initialAttendanceVisitId, setInitialAttendanceVisitId] = useState<string>();
  const [walkInForm, setWalkInForm] = useState(false);
  const [walkInCustomerForm, setWalkInCustomerForm] = useState(false);
  const [createdWalkInCustomer, setCreatedWalkInCustomer] = useState<Customer | null>(null);
  const [membershipForm, setMembershipForm] = useState(false);
  const [manualAttendanceForm, setManualAttendanceForm] = useState(false);
  const [query, setQuery] = useState("");
  const [customerFilterId, setCustomerFilterId] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [scopedBranch, setScopedBranch] = useState(isAdmin ? "All branches" : assignedBranch);
  const activeBranches = branches.filter((item) => item.status === "Active");
  const activeBranchNames = activeBranches.map((item) => item.name);
  const operationBranch = isAdmin
    ? activeBranches.find((item) => item.name === scopedBranch)?.name ?? activeBranches[0]?.name
    : activeBranches.find((item) => item.name === assignedBranch)?.name;
  const closeWalkInFlow = () => {
    setWalkInForm(false);
    setWalkInCustomerForm(false);
    setCreatedWalkInCustomer(null);
  };
  useEffect(() => {
    if (openWalkInSignal) setWalkInForm(true);
  }, [openWalkInSignal]);
  useEffect(() => {
    if (openMembershipSignal) {
      setView("memberships");
      setMembershipForm(true);
    }
  }, [openMembershipSignal]);
  useEffect(() => {
    if (!openMembershipId) return;
    const membership = memberships.find((item) => item.id === openMembershipId);
    if (membership) {
      setView("memberships");
      setSelectedMembership(membership);
    } else {
      onMembershipOpened?.();
    }
  }, [memberships, openMembershipId]);
  useEffect(() => {
    if (openAttendanceSignal) {
      setView("attendance");
      onAttendanceSignalConsumed?.();
    }
  }, [openAttendanceSignal, onAttendanceSignalConsumed]);
  const scopedWalkIns = walkIns.filter(
    (item) => scopedBranch === "All branches" || item.branch === scopedBranch,
  );
  const scopedMemberships = memberships.filter(
    (item) => scopedBranch === "All branches" || item.branch === scopedBranch,
  );
  const filteredWalkIns = scopedWalkIns.filter(
    (item) =>
      (!customerFilterId || item.customerId === customerFilterId) &&
      item.id.toLowerCase().includes(query.toLowerCase()) &&
      (status === "All statuses" ||
        item.payment === status ||
        item.status === status),
  );
  const filteredMemberships = scopedMemberships.filter(
    (item) =>
      (!customerFilterId || item.customerId === customerFilterId) &&
      item.id.toLowerCase().includes(query.toLowerCase()) &&
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
          recordWalkInPayment(selectedWalkIn.id, method);
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
        paymentMethods={paymentMethods.filter((method) => method.active && (!method.branch || method.branch === selectedMembership.branch))}
        canManageBilling={isAdmin || membershipPolicySettings.frontDeskCanPauseBilling}
        recordedBy={isAdmin ? "Admin" : "Front Desk"}
        onRecordPayment={(payment) => {
          const error = recordMembershipPayment(selectedMembership.id, payment);
          if (error) return error;
          const outstanding = selectedMembership.outstandingBalance ?? (selectedMembership.payment === "Paid" ? 0 : selectedMembership.initialAmountDue ?? selectedMembership.price);
          const monthlyAmount = Math.max(0, selectedMembership.monthlyDues - selectedMembership.promoDiscount);
          let feeDue = selectedMembership.initiationFeeOutstanding ?? Math.min(outstanding, selectedMembership.initiationFee);
          let duesDue = selectedMembership.monthlyDuesOutstanding ?? Math.max(0, outstanding - feeDue);
          if (outstanding === 0) duesDue = monthlyAmount;
          const feePaid = Math.min(payment.amount, feeDue);
          const duesPaid = Math.max(0, payment.amount - feePaid);
          feeDue = Math.max(0, feeDue - feePaid);
          duesDue = Math.max(0, duesDue - duesPaid);
          const remaining = feeDue + duesDue;
          setSelectedMembership({
            ...selectedMembership,
            payment: remaining === 0 ? "Paid" : "Partially paid",
            outstandingBalance: remaining,
            initiationFeeOutstanding: feeDue,
            monthlyDuesOutstanding: duesDue,
            nextDueDate: duesPaid > 0 && duesDue === 0
              ? addBillingMonths(selectedMembership.nextDueDate ?? selectedMembership.firstBillingDate ?? selectedMembership.end, 1)
              : selectedMembership.nextDueDate,
          });
          return null;
        }}
        onPause={(pause) => {
          const record = { ...pause, id: nextMockId("PAUSE", 10) };
          const error = pauseMembershipBilling(selectedMembership.id, record);
          if (error) return error;
          setSelectedMembership({ ...selectedMembership, billingPaused: true, billingPauses: [...(selectedMembership.billingPauses ?? []), record] });
          onAction("Membership billing paused");
          return null;
        }}
        onResume={(resumedAt, resumedBy) => {
          const error = resumeMembershipBilling(selectedMembership.id, resumedAt, resumedBy);
          if (error) return error;
          const pauses = selectedMembership.billingPauses ?? [];
          let activeIndex = -1;
          for (let index = pauses.length - 1; index >= 0; index -= 1) {
            if (!pauses[index].resumedAt) { activeIndex = index; break; }
          }
          const updatedPauses = pauses.map((pause, index) => index === activeIndex ? { ...pause, resumedAt, resumedBy } : pause);
          setSelectedMembership({ ...selectedMembership, billingPaused: false, billingPauses: updatedPauses });
          onAction("Membership billing resumed");
          return null;
        }}
        onBack={() => {
          setSelectedMembership(null);
          onMembershipOpened?.();
        }}
        onUpdate={(updated) => {
          updateMembership(updated);
          setSelectedMembership(updated);
          onAction("Membership status updated");
        }}
        onAction={onAction}
      />
    );
  if (view === "attendance")
    return (
      <AttendancePage
        isAdmin={isAdmin}
        branch={assignedBranch}
        onAction={onAction}
        onOpenCustomer={onOpenCustomer}
        initialVisitId={initialAttendanceVisitId}
        onInitialVisitHandled={() => setInitialAttendanceVisitId(undefined)}
        beforeContent={<UnifiedTabs view={view} onChange={setView} />}
      />
    );

  if (view === "plans" && isAdmin)
    return (
      <PlansPage
        plans={plans}
        policy={membershipPolicySettings}
        onBack={() => setView("memberships")}
        onSave={(plan) => {
          addMembershipPlan(plan);
          onAction("Membership plan created");
        }}
      />
    );
  return (
    <div>
      <div className="page-header page-header--actions">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">
            {scopedBranch}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">{view === "overview" ? "Visits & Memberships" : view === "walkins" ? "Walk-ins" : "Memberships"}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {view === "overview"
              ? "One workspace for customer visits, attendance, payments, and memberships."
              : view === "walkins"
              ? "Manage visits, payments, and existing customer profiles."
              : "Track active plans, renewals, and membership status."}
          </p>
        </div>
        <div className="page-header-actions">
          {view === "memberships" && isAdmin && (
            <button
              onClick={() => setView("plans")}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium"
            >
              Membership plans
            </button>
          )}
          <button
            disabled={!operationBranch}
            onClick={() =>
              view === "overview"
                ? setManualAttendanceForm(true)
                : view === "memberships"
                  ? setMembershipForm(true)
                  : setWalkInForm(true)
            }
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />{" "}
            {view === "overview"
              ? "Manual attendance"
              : view === "memberships"
                ? "Create Membership"
                : "Register Walk-in"}
          </button>
        </div>
      </div>
      <UnifiedTabs view={view === "plans" ? "memberships" : view} onChange={setView} />
      {view === "overview" ? (
        <UnifiedOverview
          visits={visits.filter((item) => scopedBranch === "All branches" || item.branch === scopedBranch)}
          walkIns={scopedWalkIns}
          memberships={scopedMemberships}
          payments={payments}
          branch={isAdmin ? scopedBranch : undefined}
          branches={isAdmin ? activeBranchNames : undefined}
          onBranchChange={isAdmin ? (value) => { setScopedBranch(value); setCustomerFilterId(""); } : undefined}
          onSelectVisit={(visit) => { setInitialAttendanceVisitId(visit.id); setView("attendance"); }}
        />
      ) : view === "walkins" ? (
        <WalkInList
          customers={customers}
          customerFilterId={customerFilterId}
          onCustomerFilterChange={setCustomerFilterId}
          rows={filteredWalkIns}
          allRows={scopedWalkIns}
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          branch={isAdmin ? scopedBranch : undefined}
          branches={isAdmin ? activeBranchNames : undefined}
          onBranchChange={isAdmin ? (value) => { setScopedBranch(value); setCustomerFilterId(""); } : undefined}
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
          customers={customers}
          customerFilterId={customerFilterId}
          onCustomerFilterChange={setCustomerFilterId}
          rows={filteredMemberships}
          allRows={scopedMemberships}
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          branch={isAdmin ? scopedBranch : undefined}
          branches={isAdmin ? activeBranchNames : undefined}
          onBranchChange={isAdmin ? (value) => { setScopedBranch(value); setCustomerFilterId(""); } : undefined}
          onSelect={setSelectedMembership}
          onDelete={(row) => {
            if (window.confirm(`Cancel and archive membership ${row.id}? Payment history will be retained.`)) {
              removeMembership(row.id);
              onAction("Membership cancelled and archived");
            }
          }}
        />
      )}
      {manualAttendanceForm && (
        <ManualAttendanceModal
          isAdmin={isAdmin}
          assignedBranch={assignedBranch}
          customers={customers}
          memberships={memberships}
          branches={branches}
          onClose={() => setManualAttendanceForm(false)}
          onSave={(input) => {
            const result = recordManualAttendance(input);
            if (result.ok) {
              setManualAttendanceForm(false);
              onAction("Manual attendance recorded");
              return null;
            }
            toast.error(result.error);
            return result.error;
          }}
        />
      )}
      {walkInForm && (
        <Modal label="Register walk-in" onClose={closeWalkInFlow} wide>
          <WalkInForm
            customers={customers}
            createdCustomer={createdWalkInCustomer}
            servicePrices={servicePrices}
            branch={operationBranch ?? ""}
            onBack={closeWalkInFlow}
            onNewProfile={() => setWalkInCustomerForm(true)}
            onSave={(visit) => {
              addWalkIn(visit);
              closeWalkInFlow();
              onAction("Walk-in visit registered");
            }}
          />
        </Modal>
      )}
      {walkInCustomerForm && (
        <Modal label="Add new customer" onClose={() => setWalkInCustomerForm(false)} wide>
          <CustomerForm
            customers={customers}
            branch={operationBranch ?? ""}
            onCancel={() => setWalkInCustomerForm(false)}
            onSave={(customer) => {
              upsertCustomer(customer);
              setCreatedWalkInCustomer(customer);
              setWalkInCustomerForm(false);
              onAction("Customer created");
            }}
          />
        </Modal>
      )}
      {membershipForm && (
        <Modal label="Create membership" onClose={() => setMembershipForm(false)} wide>
          <MembershipForm
            customers={customers}
            plans={plans}
            branch={operationBranch ?? ""}
            paymentMethods={paymentMethods.filter((method) => method.active && (!method.branch || method.branch === operationBranch))}
            policy={membershipPolicySettings}
            onBack={() => setMembershipForm(false)}
            onSave={(membership) => {
              const error = createMembership(membership);
              if (error) {
                toast.error(error);
                return;
              }
              setMembershipForm(false);
              onAction("Membership created");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function UnifiedTabs({
  view,
  onChange,
}: {
  view: "overview" | "walkins" | "memberships" | "attendance";
  onChange: (view: "overview" | "walkins" | "memberships" | "attendance") => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-sm sm:w-fit">
      {([
        ["overview", "Overview"],
        ["walkins", "Walk-ins"],
        ["memberships", "Memberships"],
        ["attendance", "Attendance History"],
      ] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-md px-4 py-2 ${view === value ? "bg-[var(--accent-subtle)] font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function UnifiedOverview({
  visits,
  walkIns,
  memberships,
  payments,
  branch,
  branches,
  onBranchChange,
  onSelectVisit,
}: {
  visits: VisitRecord[];
  walkIns: WalkIn[];
  memberships: Membership[];
  payments: PaymentRecord[];
  branch?: string;
  branches?: string[];
  onBranchChange?: (value: string) => void;
  onSelectVisit: (visit: VisitRecord) => void;
}) {
  const today = businessDateKey();
  const latestActivityDate = [...visits.map((visit) => visit.date), ...walkIns.map((visit) => visit.date)]
    .sort((left, right) => (dashboardDateKey(right) ?? "").localeCompare(dashboardDateKey(left) ?? ""))[0];
  const todayVisits = visits.filter(
    (visit) => dashboardDateKey(visit.date) === today && visit.status !== "Voided",
  );
  const todayWalkIns = walkIns.filter((visit) => dashboardDateKey(visit.date) === today);
  const membershipsById = new Map(memberships.map((membership) => [membership.id, membership]));
  const scopedPayments = payments.filter((payment) => {
    if (branch === undefined || branch === "All branches") return true;
    return (payment.branch ?? membershipsById.get(payment.membershipId)?.branch) === branch;
  });
  const todayCollectedPayments = scopedPayments.filter(
    (payment) => dashboardDateKey(payment.date) === today && isCollectedPayment(payment),
  );
  const walkInRevenueWithoutPaymentRecord = todayWalkIns
    .filter((visit) => visit.payment === "Paid" && !scopedPayments.some(
      (payment) => payment.category === "Walk-in" && payment.reference === visit.id,
    ))
    .reduce((total, visit) => total + visit.fee, 0);
  const collectedRevenue = todayCollectedPayments.reduce((total, payment) => total + payment.amount, 0)
    + walkInRevenueWithoutPaymentRecord;
  const recentVisits = [...visits]
    .filter((visit) => visit.status !== "Voided")
    .sort((left, right) => `${right.date} ${right.timeIn}`.localeCompare(`${left.date} ${left.timeIn}`))
    .slice(0, 8);

  const metrics = [
    ["Today's check-ins", todayVisits.length],
    ["Today's walk-ins", todayWalkIns.length],
    ["Active memberships", memberships.filter((membership) =>
      membership.status === "Active" &&
      (!dashboardDateKey(membership.start) || dashboardDateKey(membership.start)! <= today) &&
      (!dashboardDateKey(membership.end) || dashboardDateKey(membership.end)! >= today),
    ).length],
    ["Collected today", php(collectedRevenue)],
  ];

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="summary-card">
            <p className="summary-card-label">{label}</p>
            <p className="summary-card-value">{value}</p>
          </div>
        ))}
      </div>
      <section className="data-table-section">
        <div className="data-table-toolbar flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Recent attendance</h3>
          <p className="text-xs text-[var(--text-muted)]">Latest check-ins across the selected branch scope.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {latestActivityDate && <span className="text-xs text-[var(--text-muted)]">Latest activity: {latestActivityDate}</span>}
            {branch !== undefined && branches && onBranchChange && (
              <FilterSelect
                value={branch}
                options={["All branches", ...branches]}
                onChange={onBranchChange}
              />
            )}
          </div>
        </div>
        {recentVisits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[850px]">
              <thead>
                <tr>
                  {['Customer', 'Date', 'Time-in', 'Time-out', 'Type', 'Source', 'Status'].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentVisits.map((visit) => (
                  <tr key={visit.id} tabIndex={0} onClick={() => onSelectVisit(visit)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectVisit(visit); } }} className="cursor-pointer hover:bg-[var(--bg)] focus:bg-[var(--bg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]">
                    <td className="font-semibold">{visit.customer}</td>
                    <td className="text-[var(--text-muted)]">{visit.date}</td>
                    <td>{visit.timeIn}</td>
                    <td className="text-[var(--text-muted)]">{visit.timeOut || "Open"}</td>
                    <td className="text-[var(--text-muted)]">{visit.type}</td>
                    <td className="text-[var(--text-muted)]">{visit.source}</td>
                    <td><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(visit.status)}`}>{visit.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No attendance activity is available for this branch yet." />
        )}
      </section>
    </div>
  );
}

function WalkInList({
  customers,
  customerFilterId,
  onCustomerFilterChange,
  rows,
  allRows,
  query,
  setQuery,
  status,
  setStatus,
  branch,
  branches,
  onBranchChange,
  onSelect,
  onDelete,
}: {
  customers: SharedCustomer[];
  customerFilterId: string;
  onCustomerFilterChange: (customerId: string) => void;
  rows: WalkIn[];
  allRows: WalkIn[];
  query: string;
  setQuery: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  branch?: string;
  branches?: string[];
  onBranchChange?: (value: string) => void;
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
          <div key={label} className="summary-card">
            <p className="summary-card-label">{label}</p>
            <p className="summary-card-value">{value}</p>
          </div>
        ))}
      </div>
      <DataTable
        title="Walk-in visits"
        customers={customers}
        customerFilterId={customerFilterId}
        onCustomerFilterChange={onCustomerFilterChange}
        query={query}
        setQuery={setQuery}
        status={status}
        setStatus={setStatus}
        branch={branch}
        branches={branches}
        onBranchChange={onBranchChange}
        statusOptions={[
          "All statuses",
          "Paid",
          "Pending",
          "Registered",
          "Checked in",
          "Completed",
        ]}
      >
        <table className="data-table min-w-[850px]">
          <thead>
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
                <th key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.id} tabIndex={0} onClick={() => onSelect(row)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row); } }} className="cursor-pointer hover:bg-[var(--bg)] focus:bg-[var(--bg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]">
                <td className="font-medium text-[var(--text-muted)]">
                  {row.id}
                </td>
                <td className="font-semibold">{row.customer}</td>
                <td className="text-[var(--text-muted)]">
                  {row.branch}
                </td>
                <td className="text-[var(--text-muted)]">
                  {row.date}
                </td>
                <td>{row.timeIn}</td>
                <td className="text-[var(--text-muted)]">
                  {row.timeOut}
                </td>
                <td>{php(row.fee)}</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(row.payment)}`}
                  >
                    {row.payment}
                  </span>
                </td>
                <td className="text-right" onClick={(event) => event.stopPropagation()}>
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
  customers,
  customerFilterId,
  onCustomerFilterChange,
  rows,
  allRows,
  query,
  setQuery,
  status,
  setStatus,
  branch,
  branches,
  onBranchChange,
  onSelect,
  onDelete,
}: {
  customers: SharedCustomer[];
  customerFilterId: string;
  onCustomerFilterChange: (customerId: string) => void;
  rows: Membership[];
  allRows: Membership[];
  query: string;
  setQuery: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  branch?: string;
  branches?: string[];
  onBranchChange?: (value: string) => void;
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
          <div key={label} className="summary-card">
            <p className="summary-card-label">{label}</p>
            <p className="summary-card-value">{value}</p>
          </div>
        ))}
      </div>
      <DataTable
        title="Membership records"
        customers={customers}
        customerFilterId={customerFilterId}
        onCustomerFilterChange={onCustomerFilterChange}
        query={query}
        setQuery={setQuery}
        status={status}
        setStatus={setStatus}
        branch={branch}
        branches={branches}
        onBranchChange={onBranchChange}
        statusOptions={[
          "All statuses",
          "Active",
          "Pending",
          "Expired",
          "Suspended",
          "Cancelled",
        ]}
      >
        <table className="data-table min-w-[850px]">
          <thead>
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
                <th key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.id} tabIndex={0} onClick={() => onSelect(row)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row); } }} className="cursor-pointer hover:bg-[var(--bg)] focus:bg-[var(--bg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]">
                <td className="font-medium text-[var(--text-muted)]">
                  {row.id}
                </td>
                <td className="font-semibold">{row.customer}</td>
                <td>{row.plan}</td>
                <td className="text-[var(--text-muted)]">
                  {row.start}
                </td>
                <td className="text-[var(--text-muted)]">
                  {row.end}
                </td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(row.status)}`}
                  >
                    {row.status}
                  </span>
                  {membershipDueState(row.end).key !== "upcoming" && <p className={`mt-1 text-[10px] ${membershipDueState(row.end).key === "overdue" ? "text-red-600" : "text-amber-600"}`}>{membershipDueState(row.end).label}</p>}
                </td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(row.payment)}`}
                  >
                    {row.payment}
                  </span>
                </td>
                <td className="text-[var(--text-muted)]">
                  {row.branch}
                </td>
                <td className="text-right" onClick={(event) => event.stopPropagation()}>
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
  return (
    <div className="flex justify-end">
      <OverlayDropdown
        label="More options"
        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
        menuClassName="min-w-32"
      >
        <button
          role="menuitem"
          onClick={onDetails}
          className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg)]"
        >
          View / edit
        </button>
        <button
          role="menuitem"
          onClick={onDelete}
          className="block w-full rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </OverlayDropdown>
    </div>
  );
}

function DataTable({
  title,
  customers,
  customerFilterId,
  onCustomerFilterChange,
  query,
  setQuery,
  status,
  setStatus,
  statusOptions,
  branch,
  branches,
  onBranchChange,
  children,
}: {
  title: string;
  customers: SharedCustomer[];
  customerFilterId: string;
  onCustomerFilterChange: (customerId: string) => void;
  query: string;
  setQuery: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  statusOptions: string[];
  branch?: string;
  branches?: string[];
  onBranchChange?: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <section className="data-table-section">
      <div className="data-table-toolbar flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[220px] flex-1">
            <CustomerCombobox
              customers={customers}
              value={customerFilterId}
              onChange={onCustomerFilterChange}
              placeholder="Filter by customer"
              aria-label="Filter records by customer"
            />
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search record ID"
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
          {branch !== undefined && branches && onBranchChange && (
            <FilterSelect
              value={branch}
              options={["All branches", ...branches]}
              onChange={onBranchChange}
            />
          )}
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function WalkInForm({
  customers,
  createdCustomer,
  servicePrices,
  branch,
  onBack,
  onNewProfile,
  onSave,
}: {
  customers: SharedCustomer[];
  createdCustomer: Customer | null;
  servicePrices: ServicePrice[];
  branch: string;
  onBack: () => void;
  onNewProfile: () => void;
  onSave: (visit: WalkIn) => void;
}) {
  const [existing, setExisting] = useState(true);
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [fee, setFee] = useState("");
  const [service, setService] = useState("Non-member walk-in");
  const [payment, setPayment] = useState<"Paid" | "Pending">("Paid");
  const [method, setMethod] = useState("Cash");
  const [checkedIn, setCheckedIn] = useState(false);
  const [error, setError] = useState("");
  const showValidationError = (message: string) => {
    setError(message);
    toast.warning(message);
  };
  useEffect(() => {
    if (!createdCustomer) return;
    setExisting(true);
    setCustomerId(createdCustomer.id);
    setName("");
    setError("");
  }, [createdCustomer]);
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const selectedService = servicePrices.find((item) => item.name === service && item.active);
  useEffect(() => {
    if (selectedService) setFee(String(selectedCustomer ? priceForCustomer(selectedService, selectedCustomer.classification) : selectedService.amount));
  }, [selectedCustomer, selectedService]);
  const submit = () => {
    if (!existing && !name.trim())
      return showValidationError(
        "Select an existing customer or enter a new customer name.",
      );
    const matchedCustomer = customers.find((customer) => customer.id === customerId);
    if (existing && !matchedCustomer)
      return showValidationError("Select an existing customer from the customer records.");
    const configured = servicePrices.find((item) => item.name === service && item.active);
    const parsedFee = Number(fee);
    if (!configured || !Number.isFinite(parsedFee) || parsedFee < 0) return showValidationError("Select an active service and enter a valid configured price.");
    onSave({
      id: nextMockId("VIS", 20850),
      customer: existing ? matchedCustomer!.name : name.trim(),
      customerId: existing ? matchedCustomer!.id : nextMockId("CUS", 10501),
      branch,
      date: nowLabel(),
      timeIn: checkedIn ? "Now" : "Not checked in",
      timeOut: "—",
      fee: parsedFee,
      serviceName: service,
      payment,
      method: payment === "Paid" ? method : "—",
      status: checkedIn ? "Checked in" : "Registered",
    });
  };
  return (
    <FormShell
      title="Register Walk-in"
      subtitle="Registration and attendance are separate actions."
      onBack={onBack}
      showBack={false}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-medium">Customer</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setExisting(true); setName(""); setCustomerId(""); }}
              className={`rounded-lg border px-3 py-2 text-sm ${existing ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]" : "border-[var(--border)]"}`}
            >
              Existing customer
            </button>
            <button
              type="button"
              onClick={onNewProfile}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              New profile
            </button>
          </div>
          {existing ? (
            <div className="mt-3">
              <CustomerCombobox
                customers={customers}
                value={customerId}
                onChange={(id) => { setCustomerId(id); setError(""); }}
                placeholder="Search by name, phone, or customer ID"
              />
            </div>
          ) : (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          )}
        </div>
        <Field label="Branch" value={branch} disabled />
        <label className="block"><span className="mb-1.5 block text-xs font-medium">Service</span><select value={service} onChange={(event) => { const value = event.target.value; setService(value); const configured = servicePrices.find((item) => item.name === value && item.active); setFee(configured ? String(configured.amount) : ""); }} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">{servicePrices.filter((item) => item.active).map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
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
            value={method}
            onChange={(event) => setMethod(event.target.value)}
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
  paymentMethods,
  policy,
  onBack,
  onSave,
}: {
  customers: SharedCustomer[];
  plans: Plan[];
  branch: string;
  paymentMethods: PaymentMethod[];
  policy: MembershipPolicySettings;
  onBack: () => void;
  onSave: (membership: Membership) => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [plan, setPlan] = useState(plans.find((item) => item.active)?.name ?? "");
  const selected = plans.find((item) => item.name === plan);
  const matchedCustomer = customers.find((item) => item.id === customerId);
  const selectedPrice = selected ? membershipPrice(selected, matchedCustomer?.classification) : 0;
  const [payment, setPayment] = useState<"Paid" | "Pending">("Pending");
  const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [useCustomBillingDate, setUseCustomBillingDate] = useState(false);
  const [customBillingDate, setCustomBillingDate] = useState("");
  const [error, setError] = useState("");
  const showValidationError = (message: string) => {
    setError(message);
    toast.warning(message);
  };
  const dateFromToday = nowLabel();
  const today = dateInputValue(dateFromToday);
  const customDateAllowed = policy.customBillingStartAllowed;
  const plannedBillingMode = selected?.billingStartMode ?? "after_intro";
  const firstBillingDate = useCustomBillingDate && customBillingDate
    ? customBillingDate
    : plannedBillingMode === "immediate"
      ? addBillingMonths(dateFromToday, selected?.freeIntroMonths ?? 0)
      : plannedBillingMode === "custom_date"
        ? selected?.customFirstBillingDate ?? addBillingMonths(dateFromToday, (selected?.freeIntroMonths ?? 0) + 1)
        : addBillingMonths(dateFromToday, (selected?.freeIntroMonths ?? 0) + 1);
  const enrollmentPricing = selected ? planPricingSummary(selected, matchedCustomer?.classification) : null;
  const dueAtEnrollment = (parseMembershipDate(firstBillingDate)?.getTime() ?? Infinity) <= (parseMembershipDate(dateFromToday)?.getTime() ?? 0);
  const initialDueAmount = (enrollmentPricing?.initiationFee ?? 0) + (dueAtEnrollment ? enrollmentPricing?.discountedMonthly ?? 0 : 0);
  return (
    <FormShell
      title="Create Membership"
      subtitle="Set the member's access term and billing schedule separately, then record any amount collected today."
      onBack={onBack}
      showBack={false}
    >
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium">Customer</span>
        <CustomerCombobox
          customers={customers}
          value={customerId}
          onChange={(id) => { setCustomerId(id); setError(""); }}
          placeholder="Search by name, phone, or customer ID"
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
        <Info label="Monthly dues" value={php(selected ? planPricingSummary(selected, matchedCustomer?.classification).discountedMonthly : 0)} />
        <Info label="One-time initiation fee" value={php(selected ? planPricingSummary(selected, matchedCustomer?.classification).initiationFee : 0)} />
        <Info label="First billing date" value={formatMembershipDate(parseMembershipDate(firstBillingDate) ?? new Date())} />
        <Info label="Branch" value={branch} />
        {customDateAllowed && <label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={useCustomBillingDate} onChange={(event) => setUseCustomBillingDate(event.target.checked)} />Use a custom first billing date for this member</label>}
        {useCustomBillingDate && customDateAllowed && <label className="block"><span className="mb-1.5 block text-xs font-medium">Custom first billing date</span><input type="date" min={today} value={customBillingDate} onChange={(event) => { setCustomBillingDate(event.target.value); setError(""); }} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" /></label>}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">
            Payment status
          </span>
          <select
            value={payment}
            onChange={(event) =>
              setPayment(event.target.value as "Paid" | "Pending")
            }
            disabled={!selected || initialDueAmount === 0}
            className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"
          >
            <option>Pending</option>
            <option>Paid</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">Payment method</span>
          <select value={methodId} onChange={(event) => setMethodId(event.target.value)} disabled={payment !== "Paid" || initialDueAmount === 0} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm">
            {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
          </select>
          {paymentMethods.length === 0 && <span className="mt-1 block text-xs text-amber-700">No active payment methods are configured for this branch.</span>}
        </label>
        <Info label="Amount due today" value={php(initialDueAmount)} />
      </div>
      {error && <p className="mt-4 text-xs text-red-600">{error}</p>}
      <div className="mt-6 flex justify-end border-t border-[var(--border)] pt-5">
      <button
        onClick={() => {
          if (!customerId)
            return showValidationError(
              "Select an existing customer before creating a membership.",
            );
          const matchedCustomer = customers.find((item) => item.id === customerId);
          if (!matchedCustomer)
            return showValidationError("Select an existing customer from the customer records.");
          if (!selected) return showValidationError("Select an active membership plan.");
          if (useCustomBillingDate && (!customBillingDate || customBillingDate < today)) return showValidationError("Choose a custom first billing date that is today or later.");
          if (payment === "Paid" && initialDueAmount > 0 && !paymentMethods.some((method) => method.id === methodId)) return showValidationError("Select an active payment method available for this branch.");
          const summary = planPricingSummary(selected, matchedCustomer.classification);
          const durationMonths = durationToMonths(selected.duration);
          const dueDate = useCustomBillingDate ? customBillingDate : firstBillingDate;
          const startsToday = (parseMembershipDate(dueDate)?.getTime() ?? Infinity) <= (parseMembershipDate(dateFromToday)?.getTime() ?? 0);
          const initialAmountDue = summary.initiationFee + (startsToday ? summary.discountedMonthly : 0);
          const billingPeriods = Array.from({ length: durationMonths }, (_, index) => {
            const freeIntro = index < summary.freeIntroMonths;
            const periodDueDate = freeIntro
              ? addBillingMonths(dateFromToday, index + 1)
              : addBillingMonths(dueDate, index - summary.freeIntroMonths);
            return { periodNumber: index + 1, dueDate: periodDueDate, amount: freeIntro ? 0 : summary.discountedMonthly, freeIntro };
          });
          const paymentReceived = payment === "Paid" && initialAmountDue > 0;
          const firstDueDate = paymentReceived && startsToday ? addBillingMonths(dueDate, 1) : dueDate;
          onSave({
            id: nextMockId("MEM", 820),
            customer: matchedCustomer.name,
            customerId: matchedCustomer.id,
            plan: selected.name,
            start: dateFromToday,
            end: addBillingMonths(dateFromToday, durationMonths),
            status: "Active",
            payment: paymentReceived ? "Paid" : "Pending",
            paymentMethod: paymentReceived ? paymentMethods.find((method) => method.id === methodId)?.name : undefined,
            paymentMethodId: paymentReceived ? methodId : undefined,
            branch,
            price: selectedPrice,
            monthlyDues: summary.monthly,
            initiationFee: summary.initiationFee,
            freeIntroMonths: summary.freeIntroMonths,
            promoDiscount: summary.promoAmount,
            promoName: selected.promoName,
            outstandingBalance: paymentReceived ? 0 : initialAmountDue,
            initiationFeeOutstanding: paymentReceived ? 0 : summary.initiationFee,
            monthlyDuesOutstanding: paymentReceived || !startsToday ? 0 : summary.discountedMonthly,
            initialAmountDue,
            firstBillingDate: dueDate,
            billingStartMode: useCustomBillingDate ? "custom_date" : plannedBillingMode,
            nextDueDate: firstDueDate,
            billingPeriods,
            renewalEligible: true,
          });
        }}
        className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)]"
      >
        Confirm membership
      </button>
      </div>
    </FormShell>
  );
}

function MembershipDetails({
  membership,
  payments,
  paymentMethods,
  canManageBilling,
  recordedBy,
  onRecordPayment,
  onPause,
  onResume,
  onBack,
  onUpdate,
  onAction,
}: {
  membership: Membership;
  payments: PaymentRecord[];
  paymentMethods: PaymentMethod[];
  canManageBilling: boolean;
  recordedBy: string;
  onRecordPayment: (payment: Omit<PaymentRecord, "id" | "membershipId">) => string | null;
  onPause: (pause: { startDate: string; expectedResumeDate?: string; reason: string; recordedBy: string }) => string | null;
  onResume: (resumedAt: string, resumedBy: string) => string | null;
  onBack: () => void;
  onUpdate: (membership: Membership) => void;
  onAction: (message: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const currentOutstanding = membership.outstandingBalance ?? (membership.payment === "Paid" ? 0 : membership.initialAmountDue ?? membership.price);
  const monthlyDue = Math.max(0, membership.monthlyDues - membership.promoDiscount);
  const currentAmountDue = currentOutstanding || monthlyDue;
  const [amount, setAmount] = useState(String(currentAmountDue));
  const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [reference, setReference] = useState("");
  const [pauseForm, setPauseForm] = useState(false);
  const [pauseStart, setPauseStart] = useState(dateInputValue(nowLabel()));
  const [expectedResume, setExpectedResume] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [formError, setFormError] = useState("");
  const dueState = membershipDueState(membership.end);
  const recordPayment = () => {
    const method = paymentMethods.find((item) => item.id === methodId);
    if (!method) {
      setFormError("Select an active payment method available for this branch.");
      return;
    }
    const payment: Omit<PaymentRecord, "id" | "membershipId"> = {
      date: nowLabel(),
      amount: Number(amount),
      amountDue: currentAmountDue,
      method: method.name,
      paymentMethodId: method.id,
      reference: reference.trim() || "—",
      category: currentOutstanding > 0 ? "Membership" : "Monthly dues",
      billingPeriod: membership.nextDueDate ?? membership.firstBillingDate,
      status: "Pending",
      branch: membership.branch,
    };
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
      setFormError("Enter a payment amount greater than zero.");
      return;
    }
    const error = onRecordPayment(payment);
    if (error) {
      setFormError(error);
      toast.error(error);
      return;
    }
    setFormError("");
    onAction("Manual membership payment recorded");
    setRecording(false);
  };
  const pauseBilling = () => {
    if (!pauseReason.trim()) {
      setFormError("Enter a reason for pausing billing.");
      return;
    }
    const error = onPause({
      startDate: pauseStart,
      expectedResumeDate: expectedResume || undefined,
      reason: pauseReason.trim(),
      recordedBy,
    });
    if (error) {
      setFormError(error);
      toast.error(error);
      return;
    }
    setFormError("");
    setPauseForm(false);
    setPauseReason("");
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
        <Info label="Monthly dues" value={php(membership.monthlyDues ?? membership.price)} />
        <Info label="Initiation fee" value={php(membership.initiationFee ?? 0)} />
        <Info label="Promo discount" value={membership.promoDiscount ? `-${php(membership.promoDiscount)}` : "No promotion"} />
        <Info label="Free intro period" value={membership.freeIntroMonths ? `${membership.freeIntroMonths} months` : "None"} />
        <Info label="Outstanding balance" value={php(membership.outstandingBalance ?? 0)} />
        <Info label="First billing date" value={membership.firstBillingDate ?? membership.nextDueDate ?? "Not set"} />
        <Info label="Next due date" value={`${membership.nextDueDate ?? membership.end} · ${dueState.label}`} />
        <Info label="Renewal eligibility" value={membership.renewalEligible ? "Eligible" : "Review required"} />
      </div>
      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-semibold">Manual payment recording</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Record payment only after staff confirms the member has paid. GyTrak never charges automatically. The membership end date is not changed by a payment.</p></div>
          <button onClick={() => { setFormError(""); setRecording(!recording); }} disabled={paymentMethods.length === 0 || membership.billingPaused} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--on-accent)] disabled:opacity-50">Record payment</button>
        </div>
        {membership.billingPaused && <p className="mt-3 text-xs font-medium text-amber-700">Billing is paused. Monthly dues cannot be recorded until billing resumes.</p>}
        {recording && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs font-medium">Amount due</span><input value={php(currentAmountDue)} readOnly className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium">Payment amount</span><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" max={currentAmountDue} step="0.01" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium">Payment method</span><select value={methodId} onChange={(event) => setMethodId(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-xs font-medium">Reference (optional)</span><input value={reference} onChange={(event) => setReference(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
          <button onClick={recordPayment} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] sm:col-span-2">Confirm payment received</button>
        </div>}
        {formError && <p role="alert" className="mt-3 text-xs text-red-600">{formError}</p>}
      </div>
      <div className="mt-5 rounded-lg border border-[var(--border)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Billing pauses</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Pausing billing does not change membership access dates or extend the term.</p></div>
          {canManageBilling && (membership.billingPaused
            ? <button onClick={() => { const error = onResume(dateInputValue(nowLabel()), recordedBy); if (error) { setFormError(error); toast.error(error); } else setFormError(""); }} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">Resume billing</button>
            : <button onClick={() => { setFormError(""); setPauseForm(!pauseForm); }} disabled={membership.status === "Expired"} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold disabled:opacity-50">Pause billing</button>)}
        </div>
        {pauseForm && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs font-medium">Pause start date</span><input type="date" min={dateInputValue(nowLabel())} value={pauseStart} onChange={(event) => setPauseStart(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium">Expected resume date (optional)</span><input type="date" min={pauseStart} value={expectedResume} onChange={(event) => setExpectedResume(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-medium">Reason</span><textarea value={pauseReason} onChange={(event) => setPauseReason(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" placeholder="Add a reason for the billing pause" /></label>
          <button onClick={pauseBilling} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] sm:col-span-2">Confirm billing pause</button>
        </div>}
        {(membership.billingPauses ?? []).length > 0 && <ul className="mt-4 space-y-2 text-xs">{membership.billingPauses?.map((pause) => <li key={pause.id} className="rounded-md bg-[var(--bg)] p-3"><p className="font-medium">{formatMembershipDate(parseMembershipDate(pause.startDate) ?? new Date())}{pause.resumedAt ? ` – ${formatMembershipDate(parseMembershipDate(pause.resumedAt) ?? new Date())}` : " · Ongoing"}</p><p className="mt-1 text-[var(--text-muted)]">{pause.reason} · recorded by {pause.recordedBy}{pause.expectedResumeDate ? ` · expected resume ${pause.expectedResumeDate}` : ""}</p></li>)}</ul>}
      </div>
      {membership.billingPeriods?.length ? <div className="mt-5 rounded-lg border border-[var(--border)] p-4"><h3 className="font-semibold">Billing schedule</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Monthly billing dates are independent of the membership access term.</p><div className="mt-3 divide-y divide-[var(--border)]">{membership.billingPeriods.map((period) => {
        const payment = payments.find((item) => item.billingPeriod === period.dueDate && item.category === "Monthly dues");
        const state = period.freeIntro ? "Free intro" : payment?.status ?? (period.dueDate === membership.nextDueDate ? "Due next" : "Scheduled");
        return <div key={`${membership.id}-${period.periodNumber}`} className="flex flex-wrap justify-between gap-2 py-2 text-xs"><span>Period {period.periodNumber} · {formatMembershipDate(parseMembershipDate(period.dueDate) ?? new Date())}</span><span className="font-medium">{period.freeIntro ? "₱0" : php(period.amount)} · {state}</span></div>;
      })}</div></div> : null}
      <div id="membership-payment-history" className="mt-5 rounded-lg border border-[var(--border)] p-4"><h3 className="font-semibold">Billing history</h3>{payments.length ? <div className="mt-3 space-y-2 text-xs">{payments.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-2"><span>{payment.date} · {payment.method}{payment.category ? ` · ${payment.category}` : ""}</span><span className="text-[var(--text-muted)]">{php(payment.amount)}{payment.status ? ` · ${payment.status}` : ""} · {payment.reference}</span></div>)}</div> : <p className="mt-2 text-xs text-[var(--text-muted)]">No payment history has been recorded in this prototype.</p>}</div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
        <button
          onClick={() => onAction("Membership reminders opened")}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)]"
        >
          Send reminder
        </button>
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
  policy,
  onBack,
  onSave,
}: {
  plans: Plan[];
  policy: MembershipPolicySettings;
  onBack: () => void;
  onSave: (plan: Plan) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("1 month");
  const [monthlyDues, setMonthlyDues] = useState("800");
  const [initiationFee, setInitiationFee] = useState("0");
  const [promoDiscountPercent, setPromoDiscountPercent] = useState("0");
  const [promoName, setPromoName] = useState("");
  const [freeIntroMonths, setFreeIntroMonths] = useState("0");
  const [billingStartMode, setBillingStartMode] = useState<"immediate" | "after_intro" | "custom_date">("after_intro");
  const [customFirstBillingDate, setCustomFirstBillingDate] = useState("");
  const [formError, setFormError] = useState("");
  const monthlyAmount = Number(monthlyDues);
  const initiationAmount = Number(initiationFee);
  const promoPercent = Number(promoDiscountPercent);
  const freeMonths = Number(freeIntroMonths);
  const discountedMonthly = monthlyAmount * (1 - promoPercent / 100);

  const closeAddForm = () => {
    setAdding(false);
    setFormError("");
    setName("");
    setDuration("1 month");
    setMonthlyDues("800");
    setInitiationFee("0");
    setPromoDiscountPercent("0");
    setPromoName("");
    setFreeIntroMonths("0");
    setBillingStartMode("after_intro");
    setCustomFirstBillingDate("");
  };

  const showFormError = (message: string) => {
    setFormError(message);
    toast.warning(message);
  };

  const savePlan = () => {
    if (!name.trim()) return showFormError("Enter a name for this membership plan.");
    if (plans.some((plan) => plan.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      return showFormError("A membership plan with this name already exists.");
    }
    if (!monthlyDues.trim() || !Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
      return showFormError("Enter a valid monthly dues amount of zero or more.");
    }
    if (!initiationFee.trim() || !Number.isFinite(initiationAmount) || initiationAmount < 0) {
      return showFormError("Enter a valid one-time initiation fee of zero or more.");
    }
    if (!promoDiscountPercent.trim() || !Number.isFinite(promoPercent) || promoPercent < 0 || promoPercent > 100) {
      return showFormError("The promotional discount must be between 0% and 100%.");
    }
    if (!freeIntroMonths.trim() || !Number.isInteger(freeMonths) || freeMonths < 0) {
      return showFormError("Free introductory months must be a whole number of zero or more.");
    }
    if (freeMonths > durationToMonths(duration)) {
      return showFormError("Free introductory months cannot be longer than the membership term.");
    }
    if (promoPercent > policy.maxPromotionDiscountPercent) {
      return showFormError(`The current policy allows a maximum promotion discount of ${policy.maxPromotionDiscountPercent}%.`);
    }
    if (freeMonths > policy.freeIntroMonthsCap) {
      return showFormError(`The current policy allows up to ${policy.freeIntroMonthsCap} free introductory months.`);
    }
    if (billingStartMode === "custom_date" && !customFirstBillingDate) {
      return showFormError("Choose a first billing date for this plan.");
    }
    if (billingStartMode === "custom_date" && customFirstBillingDate < dateInputValue(nowLabel())) {
      return showFormError("The plan's first billing date must be today or later.");
    }

    onSave({
      name: name.trim(),
      duration,
      durationMonths: durationToMonths(duration),
      price: monthlyAmount,
      monthlyDues: monthlyAmount,
      initiationFee: initiationAmount,
      active: true,
      used: 0,
      promoName: promoName.trim() || undefined,
      promoDiscountPercent: promoPercent,
      freeIntroMonths: freeMonths,
      billingStartMode,
      customFirstBillingDate: billingStartMode === "custom_date" ? customFirstBillingDate : undefined,
    });
    closeAddForm();
  };

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
          onClick={() => {
            if (adding) closeAddForm();
            else setAdding(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]"
        >
          <Plus size={16} /> Add plan
        </button>
      </div>
      {adding && (
        <Modal label="Add membership plan" onClose={closeAddForm} wide>
          <div className="mb-5 pr-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Membership plans</p>
            <h2 className="mt-1 text-xl font-bold">Create a plan</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Set the plan term and recurring price. Add an optional promotion to preview the monthly discount and one-time fee.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              savePlan();
            }}
          >
            <section aria-labelledby="plan-details-heading">
              <h3 id="plan-details-heading" className="mb-3 text-sm font-semibold">Plan details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Plan name</span>
                  <input
                    autoFocus
                    required
                    value={name}
                    onChange={(event) => { setName(event.target.value); setFormError(""); }}
                    placeholder="e.g. Monthly Membership"
                    aria-describedby="plan-name-help"
                    className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"
                  />
                  <span id="plan-name-help" className="mt-1 block text-xs text-[var(--text-muted)]">Use a clear name staff can recognize when enrolling a member.</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Membership term</span>
                  <select
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    aria-describedby="plan-duration-help"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                  >
                    <option>1 month</option>
                    <option>3 months</option>
                    <option>6 months</option>
                    <option>12 months</option>
                  </select>
                  <span id="plan-duration-help" className="mt-1 block text-xs text-[var(--text-muted)]">How long the membership remains valid before renewal.</span>
                </label>
              </div>
            </section>

            <section aria-labelledby="plan-pricing-heading">
              <h3 id="plan-pricing-heading" className="mb-3 text-sm font-semibold">Pricing</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Monthly dues</span>
                  <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)]">
                    <span className="pl-3 text-sm text-[var(--text-muted)]" aria-hidden="true">₱</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={monthlyDues}
                      onChange={(event) => { setMonthlyDues(event.target.value); setFormError(""); }}
                      aria-describedby="plan-dues-help"
                      className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <span id="plan-dues-help" className="mt-1 block text-xs text-[var(--text-muted)]">Recurring amount before any promotion.</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">One-time initiation fee</span>
                  <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)]">
                    <span className="pl-3 text-sm text-[var(--text-muted)]" aria-hidden="true">₱</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={initiationFee}
                      onChange={(event) => { setInitiationFee(event.target.value); setFormError(""); }}
                      aria-describedby="plan-fee-help"
                      className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <span id="plan-fee-help" className="mt-1 block text-xs text-[var(--text-muted)]">Charged once when a member joins. Enter 0 if there is no fee.</span>
                </label>
              </div>
            </section>

            <section aria-labelledby="plan-billing-heading">
              <h3 id="plan-billing-heading" className="mb-3 text-sm font-semibold">Billing start</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">First monthly dues</span>
                  <select value={billingStartMode} onChange={(event) => setBillingStartMode(event.target.value as "immediate" | "after_intro" | "custom_date")} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
                    <option value="immediate">At enrollment (after any free intro)</option>
                    <option value="after_intro">After the introductory period</option>
                    <option value="custom_date">On a chosen date</option>
                  </select>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">The membership term and access dates do not change when billing starts.</span>
                </label>
                {billingStartMode === "custom_date" && <label className="block"><span className="mb-1.5 block text-sm font-medium">First billing date</span><input type="date" min={dateInputValue(nowLabel())} value={customFirstBillingDate} onChange={(event) => { setCustomFirstBillingDate(event.target.value); setFormError(""); }} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm" /></label>}
              </div>
            </section>

            <section aria-labelledby="plan-promotion-heading">
              <h3 id="plan-promotion-heading" className="mb-1 text-sm font-semibold">Promotion <span className="font-normal text-[var(--text-muted)]">(optional)</span></h3>
              <p className="mb-3 text-xs text-[var(--text-muted)]">Promotions apply to the monthly dues shown here; the initiation fee is not discounted.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium">Promotion name</span>
                  <input
                    value={promoName}
                    onChange={(event) => setPromoName(event.target.value)}
                    placeholder="e.g. New member offer"
                    aria-describedby="plan-promo-name-help"
                    className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"
                  />
                  <span id="plan-promo-name-help" className="mt-1 block text-xs text-[var(--text-muted)]">Optional label shown to staff alongside the discount.</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Monthly discount</span>
                  <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)]">
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={promoDiscountPercent}
                      onChange={(event) => { setPromoDiscountPercent(event.target.value); setFormError(""); }}
                      aria-describedby="plan-discount-help"
                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                    />
                    <span className="pr-3 text-sm text-[var(--text-muted)]" aria-hidden="true">%</span>
                  </div>
                  <span id="plan-discount-help" className="mt-1 block text-xs text-[var(--text-muted)]">Percent taken off monthly dues (0–100%).</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Free introductory months</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={freeIntroMonths}
                    onChange={(event) => { setFreeIntroMonths(event.target.value); setFormError(""); }}
                    aria-describedby="plan-intro-help"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                  />
                  <span id="plan-intro-help" className="mt-1 block text-xs text-[var(--text-muted)]">Whole number of introductory months at no monthly dues.</span>
                </label>
              </div>
            </section>

            <section aria-labelledby="plan-estimate-heading" className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 id="plan-estimate-heading" className="text-sm font-semibold">Price preview</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Recurring and one-time costs are shown separately. Free introductory months have no monthly dues.</p>
                </div>
                <p className="shrink-0 text-right text-lg font-bold text-[var(--text)]">{php(Number.isFinite(discountedMonthly) ? discountedMonthly : 0)}<span className="block text-xs font-normal text-[var(--text-muted)]">per month</span></p>
              </div>
              <dl className="mt-4 grid gap-2 border-t border-[var(--border)] pt-3 text-xs sm:grid-cols-2">
                <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Membership term</dt><dd className="font-medium">{duration}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Regular monthly dues</dt><dd className="font-medium">{php(Number.isFinite(monthlyAmount) ? monthlyAmount : 0)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Monthly discount{promoName.trim() ? ` · ${promoName.trim()}` : ""}</dt><dd className="font-medium">{Number.isFinite(promoPercent) ? promoPercent : 0}% <span className="text-[var(--text-muted)]">(-{php(Number.isFinite(monthlyAmount * promoPercent / 100) ? monthlyAmount * promoPercent / 100 : 0)})</span></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Monthly dues after discount</dt><dd className="font-medium">{php(Number.isFinite(discountedMonthly) ? discountedMonthly : 0)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">One-time initiation fee</dt><dd className="font-medium">{php(Number.isFinite(initiationAmount) ? initiationAmount : 0)}</dd></div>
                <div className="flex justify-between gap-3 sm:col-span-2"><dt className="text-[var(--text-muted)]">Free introductory period</dt><dd className="font-medium">{Number.isInteger(freeMonths) && freeMonths >= 0 ? `${freeMonths} month${freeMonths === 1 ? "" : "s"}` : "Enter a whole number"}</dd></div>
              </dl>
            </section>

            {formError && <p role="alert" className="rounded-lg border border-[var(--toast-error-border)] bg-[var(--toast-error-bg)] px-3 py-2 text-sm text-[var(--toast-error-text)]">{formError}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >Save membership plan</button>
          </form>
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
            <p className="mt-4 text-2xl font-bold">{php(plan.monthlyDues ?? plan.price)}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {plan.duration} · {plan.freeIntroMonths ? `${plan.freeIntroMonths} free months` : "No intro offer"}
            </p>
            <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
              <div>Regular monthly dues: {php(plan.monthlyDues ?? plan.price)}</div>
              <div>Initiation fee: {php(plan.initiationFee ?? 0)}</div>
              <div>{plan.promoName ? `${plan.promoName} (${plan.promoDiscountPercent ?? 0}% off)` : (plan.promoDiscountPercent ? `${plan.promoDiscountPercent}% off` : "No promotion")}</div>
            </div>
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
  showBack = true,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  showBack?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      {showBack && (
        <button
          onClick={onBack}
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <ArrowLeft size={16} /> Back
        </button>
      )}
      <div className="mb-5">
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
