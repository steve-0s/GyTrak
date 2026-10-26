import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Archive,
  Check,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { formatPHP as php } from "../../lib/utils";
import FilterSelect from "../../components/shared/FilterSelect";
import Modal from "../../components/shared/Modal";
import { useGymData } from "../../contexts/GymDataContext";
import { nextMockId } from "../../services/mockApi";
import type { BranchRecord } from "../../types";

type Branch = BranchRecord;
type Account = {
  id?: string;
  name: string;
  email: string;
  branch: string;
  status: "Active" | "Inactive";
  created: string;
  activity: string;
};
type Audit = {
  time: string;
  user: string;
  role: string;
  branch: string;
  action: string;
  record: string;
  summary: string;
};
type Props = {
  onAction: (message: string) => void;
  initialView?: "branches" | "accounts" | "audit";
};

const badge = (value: string) =>
  value === "Active"
    ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
    : value === "Archived"
      ? "bg-amber-50 text-amber-700"
    : "bg-[var(--bg)] text-[var(--text-muted)]";

export default function AdministrationPages({
  onAction,
  initialView = "branches",
}: Props) {
  const [view, setView] = useState(initialView);
  const { branches: sharedBranches, frontDeskAccounts: sharedAccounts, auditLogs, upsertBranch, getBranchDeleteBlockers, deleteBranch, upsertFrontDeskAccount, toggleFrontDeskAccount } = useGymData();
  const branches = sharedBranches;
  const accounts = sharedAccounts;
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchAction, setBranchAction] = useState<{ branch: Branch; action: "archive" | "delete" } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [query, setQuery] = useState("");
  if (selectedBranch)
    return (
      <BranchDetails
        branch={selectedBranch}
        onBack={() => setSelectedBranch(null)}
        onAction={onAction}
      />
    );
  if (editingAccount)
    return (
      <Modal label={editingAccount.email ? "Edit Front Desk account" : "Create Front Desk account"} onClose={() => setEditingAccount(null)} wide>
        <AccountForm
        branches={branches}
        account={editingAccount.email ? editingAccount : undefined}
        onBack={() => setEditingAccount(null)}
        onSave={(account) => {
          const existing = accounts.find((item) => item.email === editingAccount.email);
          upsertFrontDeskAccount({ ...account, id: existing?.id ?? nextMockId("FDA", 5) });
          setEditingAccount(null);
          onAction("Front Desk account saved");
        }}
        />
      </Modal>
    );
  return (
    <div>
      <div className="page-header page-header--actions">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">
            Administration
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            {view === "branches"
              ? "Branches"
              : view === "accounts"
                ? "Front Desk Accounts"
              : "Audit Logs"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {view === "branches"
              ? "Manage locations, branch status, and assigned staff."
              : view === "accounts"
                ? "Manage branch operators and their access status."
                : "Review traceable administrative and operational changes."}
          </p>
        </div>
        <div className="page-header-actions">
        {view === "branches" && (
          <button
            onClick={() =>
              setEditingBranch({
                id: "",
                name: "",
                location: "",
                status: "Active",
                customers: 0,
                memberships: 0,
                visits: 0,
                revenue: 0,
                frontDesk: 0,
              })
            }
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]"
          >
            <Plus size={16} /> Create branch
          </button>
        )}
        {view === "accounts" && (
          <button
            onClick={() =>
              setEditingAccount({
                name: "",
                email: "",
                branch: branches.find((item) => item.status === "Active")?.name ?? "",
                status: "Active",
                created: "Today",
                activity: "Not yet active",
              })
            }
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]"
          >
            <Plus size={16} /> Create account
          </button>
        )}
        </div>
      </div>
      <div className="mb-5 flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-sm">
        <Tab active={view === "branches"} onClick={() => setView("branches")}>
          Branches
        </Tab>
        <Tab active={view === "accounts"} onClick={() => setView("accounts")}>
          Front Desk Accounts
        </Tab>
      </div>
      {view === "branches" && (
        <BranchList
          branches={branches}
          query={query}
          setQuery={setQuery}
          onSelect={setSelectedBranch}
          onEdit={setEditingBranch}
          onArchive={(branch) => setBranchAction({ branch, action: "archive" })}
          onUnarchive={(branch) => {
            upsertBranch({ ...branch, status: "Active" });
            onAction(`${branch.name} unarchived`);
          }}
          onDelete={(branch) => { setDeleteError(""); setBranchAction({ branch, action: "delete" }); }}
        />
      )}
      {view === "accounts" && (
        <AccountList
          accounts={accounts}
          branches={branches}
          query={query}
          setQuery={setQuery}
          onEdit={setEditingAccount}
          onToggle={(account) => {
            toggleFrontDeskAccount(account.id ?? "");
            onAction(`${account.name} status updated`);
          }}
        />
      )}
      {view === "audit" && <AuditList rows={auditLogs} query={query} setQuery={setQuery} />}
      {editingBranch && (
        <Modal
          label={editingBranch.name ? "Edit branch" : "Create branch"}
          onClose={() => setEditingBranch(null)}
        >
          <BranchForm
            branch={editingBranch.name ? editingBranch : undefined}
            onBack={() => setEditingBranch(null)}
            onSave={(branch) => {
              const existing = branches.find((item) => item.id === editingBranch.id);
              upsertBranch({ ...branch, id: existing?.id ?? nextMockId("BR", 5) });
              setEditingBranch(null);
              onAction("Branch saved");
            }}
          />
        </Modal>
      )}
      {branchAction && (
        <Modal label={branchAction.action === "archive" ? "Archive branch" : "Delete branch"} onClose={() => { setBranchAction(null); setDeleteError(""); }}>
          <h3 className="text-lg font-semibold">{branchAction.action === "archive" ? "Archive branch?" : "Delete branch?"}</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {branchAction.action === "archive"
              ? `${branchAction.branch.name} will be marked Archived and removed from new operational choices. Its branch information and history will be preserved.`
              : `Permanently delete ${branchAction.branch.name}? This is allowed only when the branch has no associated records.`}
          </p>
          {branchAction.action === "delete" && getBranchDeleteBlockers(branchAction.branch.id).length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Deletion unavailable: this branch has associated records.</p>
              <p className="mt-1">{getBranchDeleteBlockers(branchAction.branch.id).join(", ")}.</p>
              <p className="mt-1">Archive the branch to preserve its history.</p>
            </div>
          )}
          {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => { setBranchAction(null); setDeleteError(""); }} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Cancel</button>
            <button
              disabled={branchAction.action === "delete" && getBranchDeleteBlockers(branchAction.branch.id).length > 0}
              onClick={() => {
                if (branchAction.action === "archive") {
                  const archived = { ...branchAction.branch, status: "Archived" as const };
                  upsertBranch(archived);
                  onAction(`${branchAction.branch.name} archived`);
                  setBranchAction(null);
                } else {
                  const error = deleteBranch(branchAction.branch.id);
                  if (error) setDeleteError(error);
                  else {
                    onAction(`${branchAction.branch.name} deleted`);
                    setBranchAction(null);
                  }
                }
              }}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {branchAction.action === "archive" ? "Archive branch" : "Delete branch"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BranchList({
  branches,
  query,
  setQuery,
  onSelect,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  branches: Branch[];
  query: string;
  setQuery: (value: string) => void;
  onSelect: (branch: Branch) => void;
  onEdit: (branch: Branch) => void;
  onArchive: (branch: Branch) => void;
  onUnarchive: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
}) {
  const [status, setStatus] = useState("Active");
  const rows = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(query.toLowerCase()) &&
      (status === "All statuses" || branch.status === status),
  );
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total branches", branches.length],
          [
            "Active branches",
            branches.filter((row) => row.status === "Active").length,
          ],
          [
            "Archived branches",
            branches.filter((row) => row.status === "Archived").length,
          ],
          [
            "Inactive branches",
            branches.filter((row) => row.status === "Inactive").length,
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
      <TableShell title="Branch directory">
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
            <Search size={15} className="text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search branches"
              className="bg-transparent text-sm outline-none"
            />
          </label>
          <Select
            value={status}
            onChange={setStatus}
            options={["Active", "Archived", "Inactive", "All statuses"]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table data-table--compact min-w-[850px]">
            <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                {[
                  "Branch name",
                  "Location",
                  "Status",
                  "Customers",
                  "Active members",
                  "Visits",
                  "Revenue",
                  "",
                ].map((label) => (
                  <th key={label} className="px-5 py-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((branch) => (
                <tr key={branch.id} tabIndex={0} onClick={() => onSelect(branch)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(branch); } }} className="cursor-pointer hover:bg-[var(--bg)] focus:bg-[var(--bg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]">
                  <td className="px-5 py-4">
                    <button
                      onClick={(event) => { event.stopPropagation(); onSelect(branch); }}
                      className="font-semibold hover:text-[var(--accent)]"
                    >
                      {branch.name}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-muted)]">
                    {branch.location}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(branch.status)}`}
                    >
                      {branch.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">{branch.customers}</td>
                  <td className="px-5 py-4">{branch.memberships}</td>
                  <td className="px-5 py-4">{branch.visits}</td>
                  <td className="px-5 py-4">{php(branch.revenue)}</td>
                  <td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                    <details className="relative inline-block text-left">
                      <summary aria-label={`Actions for ${branch.name}`} className="flex cursor-pointer list-none items-center rounded-lg border border-[var(--border)] p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] [&::-webkit-details-marker]:hidden">
                        <MoreHorizontal size={16} />
                      </summary>
                      <div className="absolute right-0 z-10 mt-1 min-w-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-left shadow-lg">
                        <BranchActionButton icon={<Eye size={14} />} label="View" onClick={() => onSelect(branch)} />
                        <BranchActionButton icon={<Pencil size={14} />} label="Edit" onClick={() => onEdit(branch)} />
                        {branch.status === "Archived"
                          ? <BranchActionButton icon={<Archive size={14} />} label="Unarchive" onClick={() => onUnarchive(branch)} />
                          : <BranchActionButton icon={<Archive size={14} />} label="Archive" onClick={() => onArchive(branch)} />}
                        <BranchActionButton icon={<Trash2 size={14} />} label="Delete" onClick={() => onDelete(branch)} danger />
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">{status === "Archived" ? "No archived branches." : status === "Active" ? "No active branches." : "No branches match your filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </TableShell>
    </>
  );
}

function BranchDetails({
  branch,
  onBack,
  onAction,
}: {
  branch: Branch;
  onBack: () => void;
  onAction: (message: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
      >
        <ArrowLeft size={16} /> Back to branches
      </button>
      <div className="page-header page-header--actions page-header--top">
        <div>
          <p className="mb-1 text-sm text-[var(--accent)]">Branch details</p>
          <h2 className="text-2xl font-bold">{branch.name}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {branch.location}
          </p>
        </div>
        <span className={`h-fit rounded-full px-2.5 py-1 text-xs font-medium ${badge(branch.status)}`}>{branch.status}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Customers", branch.customers],
          ["Active memberships", branch.memberships],
          ["Visits in period", branch.visits],
          ["Recorded revenue", php(branch.revenue)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="summary-card"
          >
            <p className="summary-card-label">{label}</p>
            <p className="summary-card-value">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <InfoPanel title="Assigned Front Desk accounts">
          <p className="text-sm">{branch.frontDesk} active operators assigned</p>
          <button
            onClick={() => onAction("Front Desk account list opened")}
            className="mt-3 text-xs font-semibold text-[var(--accent)]"
          >
            Manage accounts
          </button>
        </InfoPanel>
        <InfoPanel title="Scanner and sync status">
          <div className="space-y-2 text-xs">
            <p className="flex justify-between">
              <span>Scanner 1 · Time-in</span>
              <b className="text-[var(--accent)]">Online</b>
            </p>
            <p className="flex justify-between">
              <span>Scanner 2 · Time-out</span>
              <b className="text-[var(--accent)]">Online</b>
            </p>
            <p className="flex justify-between">
              <span>Pending sync</span>
              <b className="text-amber-500">2 events</b>
            </p>
          </div>
          <button
            onClick={() => onAction("Scanner status opened")}
            className="mt-3 text-xs font-semibold text-[var(--accent)]"
          >
            View sync status
          </button>
        </InfoPanel>
        <InfoPanel title="Recent branch activity">
          <p className="text-xs text-[var(--text-muted)]">Today · 09:42 AM</p>
          <p className="mt-1 text-sm">Attendance recorded for Maya Santos</p>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Today · 09:18 AM
          </p>
          <p className="mt-1 text-sm">Membership renewed for Ava Rivera</p>
        </InfoPanel>
        <InfoPanel title="Related records">
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-[var(--accent)]">
            <button onClick={() => onAction("Customers opened")}>
              Customers
            </button>
            <button onClick={() => onAction("Memberships opened")}>
              Memberships
            </button>
            <button onClick={() => onAction("Attendance opened")}>
              Attendance
            </button>
            <button onClick={() => onAction("Reports opened")}>Reports</button>
          </div>
        </InfoPanel>
      </div>
    </div>
  );
}

function BranchForm({
  branch,
  onBack,
  onSave,
}: {
  branch?: Branch;
  onBack: () => void;
  onSave: (branch: Branch) => void;
}) {
  const [name, setName] = useState(branch?.name ?? "");
  const [location, setLocation] = useState(branch?.location ?? "");
  const [status, setStatus] = useState<Branch["status"]>(
    branch?.status ?? "Active",
  );
  const [error, setError] = useState("");
  return (
    <FormShell
      title={branch ? "Edit branch" : "Create branch"}
      subtitle="Branch records are mock data for this prototype."
      onBack={onBack}
      showBack={false}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Branch name"
          value={name}
          onChange={setName}
          placeholder="e.g. Ortigas Center"
        />
        <Field
          label="Location"
          value={location}
          onChange={setLocation}
          placeholder="City and region"
        />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">Status</span>
          {status === "Archived"
            ? <p className="rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text-muted)]">Archived · use Unarchive to restore this branch.</p>
            : <Select
                value={status}
                onChange={(value) => setStatus(value as Branch["status"])}
                options={["Active", "Inactive"]}
              />}
        </label>
      </div>
      {error && <p className="mt-4 text-xs text-red-600">{error}</p>}
      <button
        onClick={() => {
          if (!name.trim() || !location.trim())
            return setError("Branch name and location are required.");
          onSave({
            id: branch?.id ?? "",
            name,
            location,
            status,
            customers: branch?.customers ?? 0,
            memberships: branch?.memberships ?? 0,
            visits: branch?.visits ?? 0,
            revenue: branch?.revenue ?? 0,
            frontDesk: branch?.frontDesk ?? 0,
          });
        }}
        className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
      >
        <Check size={15} /> Save branch
      </button>
    </FormShell>
  );
}

function AccountList({
  accounts,
  branches,
  query,
  setQuery,
  onEdit,
  onToggle,
}: {
  accounts: Account[];
  branches: Branch[];
  query: string;
  setQuery: (value: string) => void;
  onEdit: (account: Account) => void;
  onToggle: (account: Account) => void;
}) {
  const [branch, setBranch] = useState("All branches");
  const [status, setStatus] = useState("All statuses");
  const rows = accounts
    .filter(
      (account) =>
        account.name.toLowerCase().includes(query.toLowerCase()) ||
        account.email.toLowerCase().includes(query.toLowerCase()),
    )
    .filter(
      (account) =>
        (branch === "All branches" || account.branch === branch) &&
        (status === "All statuses" || account.status === status),
    );
  return (
    <TableShell title="Front Desk accounts">
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4">
        <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
          <Search size={15} className="text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search accounts"
            className="bg-transparent text-sm outline-none"
          />
        </label>
        <Select
          value={branch}
          onChange={setBranch}
          options={["All branches", ...branches.map((item) => item.name)]}
        />
        <Select
          value={status}
          onChange={setStatus}
          options={["All statuses", "Active", "Inactive"]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table data-table--compact min-w-[750px]">
          <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              {[
                "Name",
                "Username or email",
                "Assigned branch",
                "Status",
                "Created",
                "Last activity",
                "",
              ].map((label) => (
                <th key={label} className="px-5 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((account) => (
              <tr key={account.email}>
                <td className="px-5 py-4 font-semibold">{account.name}</td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {account.email}
                </td>
                <td className="px-5 py-4">{account.branch}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] ${badge(account.status)}`}
                  >
                    {account.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {account.created}
                </td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {account.activity}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => onEdit(account)}
                    className="mr-3 font-semibold text-[var(--accent)]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onToggle(account)}
                    className="font-semibold text-[var(--text-muted)]"
                  >
                    {account.status === "Active" ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableShell>
  );
}

function AuditList({
  rows: auditRows,
  query,
  setQuery,
}: {
  rows: Audit[];
  query: string;
  setQuery: (value: string) => void;
}) {
  const [action, setAction] = useState("All actions");
  const [branch, setBranch] = useState("All branches");
  const rows = auditRows.filter(
    (row) =>
      `${row.user} ${row.record} ${row.summary}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (action === "All actions" || row.action === action) &&
      (branch === "All branches" || row.branch === branch),
  );
  return (
    <TableShell title="Audit history">
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4">
        <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
          <Search size={15} className="text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search audit events"
            className="bg-transparent text-sm outline-none"
          />
        </label>
        <Select
          value={branch}
          onChange={setBranch}
          options={[
            "All branches",
            "Makati Central",
            "BGC High Street",
            "Cebu IT Park",
          ]}
        />
        <Select
          value={action}
          onChange={setAction}
          options={[
            "All actions",
            "Attendance correction",
            "Membership renewal",
            "Branch update",
            "Keyfob assignment",
          ]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table data-table--compact min-w-[900px]">
          <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              {[
                "Timestamp",
                "User",
                "Role",
                "Branch",
                "Action",
                "Affected record",
                "Summary",
              ].map((label) => (
                <th key={label} className="px-5 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={`${row.time}-${row.record}`}>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {row.time}
                </td>
                <td className="px-5 py-4 font-medium">{row.user}</td>
                <td className="px-5 py-4">{row.role}</td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {row.branch}
                </td>
                <td className="px-5 py-4">{row.action}</td>
                <td className="px-5 py-4 font-mono text-[var(--text-muted)]">
                  {row.record}
                </td>
                <td className="px-5 py-4 text-[var(--text-muted)]">
                  {row.summary}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableShell>
  );
}

function AccountForm({
  branches,
  account,
  onBack,
  onSave,
}: {
  branches: Branch[];
  account?: Account;
  onBack: () => void;
  onSave: (account: Account) => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [branch, setBranch] = useState(account?.branch ?? "Makati Central");
  const [status, setStatus] = useState<Account["status"]>(
    account?.status ?? "Active",
  );
  return (
    <FormShell
      title={account ? "Edit Front Desk account" : "Create Front Desk account"}
      subtitle="Prototype account management only. No passwords are stored here."
      onBack={onBack}
      showBack={false}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Full name"
        />
        <Field
          label="Username or email"
          value={email}
          onChange={setEmail}
          placeholder="name@example.com"
        />
        <label>
          <span className="mb-1.5 block text-xs font-medium">
            Assigned branch
          </span>
          <Select
            value={branch}
            onChange={setBranch}
            options={Array.from(new Set([
              ...branches.filter((item) => item.status === "Active").map((item) => item.name),
              ...(account ? [account.branch] : []),
            ]))}
          />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-medium">
            Account status
          </span>
          <Select
            value={status}
            onChange={(value) => setStatus(value as Account["status"])}
            options={["Active", "Inactive"]}
          />
        </label>
      </div>
      <button
        onClick={() =>
          name.trim() &&
          email.trim() &&
          onSave({
            name,
            email,
            branch,
            status,
            created: account?.created ?? "Today",
            activity: account?.activity ?? "Not yet active",
          })
        }
        className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
      >
        <Check size={15} /> Save account
      </button>
    </FormShell>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm outline-none"
      />
    </label>
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
    <div className="mx-auto max-w-3xl">
      {showBack && (
        <button
          onClick={onBack}
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <ArrowLeft size={16} /> Back
        </button>
      )}
      <div className="page-header">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
      </div>
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        {children}
      </section>
    </div>
  );
}
function TableShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] p-5">
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}
function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return <FilterSelect value={value} options={options} onChange={onChange} />;
}
function BranchActionButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.currentTarget.closest("details")?.removeAttribute("open");
        onClick();
      }}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg)] ${danger ? "text-red-600" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}
function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-xs sm:px-4 sm:text-sm ${active ? "bg-[var(--accent-subtle)] font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
    >
      {children}
    </button>
  );
}
