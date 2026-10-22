import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Edit3,
  Plus,
  Search,
  UserRound,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { createMockId } from "../../services/mockApi";
import FilterSelect from "../../components/shared/FilterSelect";
import Modal from "../../components/shared/Modal";
import { useGymData } from "../../contexts/GymDataContext";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: "Member" | "Walk-in";
  status: "Active" | "Pending" | "Expired" | "None";
  branch: string;
  registered: string;
  lastVisit: string;
  plan?: string;
  endDate?: string;
  keyfob?: string;
  photo?: string;
};
type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void; openCreateSignal?: number };

const statusClasses: Record<Customer["status"], string> = {
  Active: "bg-[var(--accent-subtle)] text-[var(--accent)]",
  Pending: "bg-amber-50 text-amber-700",
  Expired: "bg-red-50 text-red-700",
  None: "bg-[var(--bg)] text-[var(--text-muted)]",
};

export default function CustomersPage({ isAdmin, branch: assignedBranch = "Makati Central", onAction, openCreateSignal = 0 }: Props) {
  const { customers, registrations, visits, upsertCustomer, updateCustomer, reviewRegistration } = useGymData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState(
    isAdmin ? "All branches" : assignedBranch,
  );
  const [type, setType] = useState("All types");
  const [status, setStatus] = useState("All statuses");
  const [page, setPage] = useState(1);
  const scopedCustomers = useMemo(() => customers.filter((customer) => branch === "All branches" || customer.branch === branch), [customers, branch]);
  const visible = useMemo(
    () =>
      scopedCustomers.filter(
        (customer) =>
          (type === "All types" || customer.type === type) &&
          (status === "All statuses" || customer.status === status) &&
          `${customer.name} ${customer.id} ${customer.phone}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [scopedCustomers, type, status, query],
  );
  const selected = customers.find((customer) => customer.id === selectedId);
  const pendingRegistrations = registrations.filter((item) => ["Pending", "Needs correction"].includes(item.status) && (isAdmin || item.branch === assignedBranch));
  useEffect(() => {
    if (!openCreateSignal) return;
    setEditing({ id: "", name: "", phone: "", email: "", type: "Walk-in", status: "None", branch: branch === "All branches" ? assignedBranch : branch, registered: "Today", lastVisit: "—" });
  }, [openCreateSignal]);

  if (editing)
    return (
      <Modal label={editing.id ? "Edit customer" : "Add customer"} onClose={() => setEditing(null)} wide>
        <CustomerForm
        customer={editing.id ? editing : undefined}
        customers={customers}
        branch={branch === "All branches" ? assignedBranch : branch}
        onCancel={() => setEditing(null)}
        onSave={(customer) => {
          upsertCustomer(customer);
          setEditing(null);
          setSelectedId(customer.id);
          onAction(editing.id ? "Customer updated" : "Customer created");
        }}
        />
      </Modal>
    );
  if (selected)
    return (
      <CustomerDetails
        customer={selected}
        visits={visits}
        onBack={() => setSelectedId(null)}
        onEdit={() => setEditing(selected)}
        onChangeType={() => {
          const updated =
            selected.type === "Member"
              ? { ...selected, type: "Walk-in" as const, status: "None" as const, plan: undefined, endDate: undefined }
              : {
                  ...selected,
                  type: "Member" as const,
                  status: "Active" as const,
                  plan: "Monthly Membership",
                  endDate: "Nov 20, 2026",
                };
          updateCustomer(updated);
          setSelectedId(updated.id);
          onAction(
            updated.type === "Member"
              ? "Customer converted to member"
              : "Customer changed to walk-in",
          );
        }}
        onConvert={() => {
          const updated = {
            ...selected,
            type: "Member" as const,
            status: "Active" as const,
            plan: "Monthly Membership",
            endDate: "Nov 20, 2026",
          };
          updateCustomer(updated);
          onAction("Walk-in converted using the existing profile");
        }}
        onAction={onAction}
      />
    );

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">
            {isAdmin ? "All branches" : assignedBranch}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Search and manage customer profiles without duplicating records.
          </p>
        </div>
        <div className="flex gap-2">
                        <button
            onClick={() => exportCustomers(visible)}
            className="hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--bg)] sm:block"
          >
            Export
          </button>
          <button
            onClick={() =>
              setEditing({
                id: "",
                name: "",
                phone: "",
                email: "",
                type: "Walk-in",
                status: "None",
                branch: branch === "All branches" ? assignedBranch : branch,
                registered: "Today",
                lastVisit: "—",
              })
            }
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"
          >
            <Plus size={16} /> Add customer
          </button>
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total customers", scopedCustomers.length],
          [
            "Active members",
            scopedCustomers.filter((c) => c.status === "Active").length,
          ],
          [
            "Walk-in customers",
            scopedCustomers.filter((c) => c.type === "Walk-in").length,
          ],
          [
            "New this period",
            scopedCustomers.filter((c) => c.registered.includes("Oct")).length,
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
      {pendingRegistrations.length > 0 && <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Pending QR registrations</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Review submissions here before they become customer profiles.</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">{pendingRegistrations.length} pending</span></div><div className="mt-3 space-y-2">{pendingRegistrations.map((submission) => { const matches = customers.filter((customer) => submission.possibleCustomerIds.includes(customer.id)); return <div key={submission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-[var(--surface)] p-3 text-xs"><div><p className="font-semibold">{submission.name} <span className="font-normal text-[var(--text-muted)]">· {submission.branch}</span></p><p className="mt-1 text-[var(--text-muted)]">{submission.phone} · {submission.email || "No email"}{matches.length ? ` · Possible match: ${matches.map((item) => item.name).join(", ")}` : ""}</p></div><div className="flex gap-2"><button onClick={() => { const error = reviewRegistration(submission.id, "approve", isAdmin ? "Admin" : "Front Desk", matches.length === 1 ? matches[0].id : undefined); if (!error) onAction("QR registration approved"); }} className="rounded-lg bg-[var(--accent)] px-3 py-2 font-semibold text-[var(--on-accent)]">{matches.length === 1 ? "Link and approve" : "Approve"}</button><button onClick={() => { reviewRegistration(submission.id, "correction", isAdmin ? "Admin" : "Front Desk", undefined, "Please confirm your details with the front desk."); onAction("QR registration returned for correction"); }} className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold">Correction</button><button onClick={() => { reviewRegistration(submission.id, "reject", isAdmin ? "Admin" : "Front Desk"); onAction("QR registration rejected"); }} className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700">Reject</button></div></div>; })}</div></section>}
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 sm:max-w-xs">
              <Search size={16} className="text-[var(--text-muted)]" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, ID, or phone"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
              />
            </label>
            {isAdmin && (
              <Filter
                value={branch}
                onChange={setBranch}
                options={[
                  "All branches",
                  "Makati Central",
                  "BGC High Street",
                  "Cebu IT Park",
                ]}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Filter
              value={type}
              onChange={setType}
              options={["All types", "Member", "Walk-in"]}
            />
            <Filter
              value={status}
              onChange={setStatus}
              options={["All statuses", "Active", "Pending", "Expired", "None"]}
            />
            <button
              onClick={() => {
                setQuery("");
                setBranch(isAdmin ? "All branches" : assignedBranch);
                setType("All types");
                setStatus("All statuses");
              }}
              className="px-2 text-xs font-semibold text-[var(--accent)]"
            >
              Clear filters
            </button>
          </div>
        </div>
        <div className="table-viewport overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                {[
                  "Customer ID",
                  "Customer name",
                  "Contact information",
                  "Type",
                  "Membership",
                  "Branch",
                  "Last visit",
                  "",
                ].map((label) => (
                  <th key={label} className="px-5 py-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.slice((page - 1) * 5, page * 5).map((customer) => (
                <tr key={customer.id} tabIndex={0} onClick={() => setSelectedId(customer.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(customer.id); } }} className="cursor-pointer hover:bg-[var(--bg)] focus:bg-[var(--bg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]">
                  <td className="px-5 py-4 font-medium text-[var(--text-muted)]">
                    {customer.id}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={(event) => { event.stopPropagation(); setSelectedId(customer.id); }}
                      className="font-semibold hover:text-[var(--accent)]"
                    >
                      <span className="inline-flex items-center gap-2"><CustomerAvatar customer={customer} size="sm" />{customer.name}</span>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-muted)]">
                    <span className="block">{customer.phone}</span>
                    <span className="mt-0.5 block text-[11px]">
                      {customer.email}
                    </span>
                  </td>
                  <td className="px-5 py-4">{customer.type}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusClasses[customer.status]}`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-muted)]">
                    {customer.branch}
                  </td>
                  <td className="px-5 py-4 text-[var(--text-muted)]">
                    {customer.lastVisit}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(event) => { event.stopPropagation(); setSelectedId(customer.id); }}
                      className="font-semibold text-[var(--accent)]"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="p-12 text-center text-sm text-[var(--text-muted)]">
              No customers match the current filters.
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--text-muted)]">
          <span>
            {visible.length} result{visible.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              disabled={page * 5 >= visible.length}
              onClick={() => setPage(page + 1)}
              className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function exportCustomers(rows: Customer[]) {
  const csvRows = [
    ["ID", "Name", "Phone", "Email", "Type", "Status", "Branch", "Registered", "Last visit"],
    ...rows.map((customer) => [customer.id, customer.name, customer.phone, customer.email, customer.type, customer.status, customer.branch, customer.registered, customer.lastVisit]),
  ];
  const csv = csvRows.map((row) => row.map((value) => `"${String(value).replace(/["]/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "gytrak-customers.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function Filter({
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

function CustomerDetails({
  customer,
  visits: allVisits,
  onBack,
  onEdit,
  onConvert,
  onChangeType,
  onAction,
}: {
  customer: Customer;
  visits: Array<{ customerId: string; customer: string; date: string; timeIn: string; timeOut: string; id: string; branch: string; source: string; status: string }>;
  onBack: () => void;
  onEdit: () => void;
  onConvert: () => void;
  onChangeType: () => void;
  onAction: (message: string) => void;
}) {
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const visits = allVisits.filter(
    (event) =>
      event.customerId === customer.id &&
      (!visitDate || event.date.toLowerCase().includes(visitDate.toLowerCase())) &&
      (!visitTime || `${event.timeIn} ${event.timeOut}`.toLowerCase().includes(visitTime.toLowerCase())),
  );
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <ArrowLeft size={16} /> Back to customers
      </button>
      <div className="mb-6 flex flex-col gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <CustomerAvatar customer={customer} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold tracking-tight">{customer.name}</h2>
            <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{customer.id} · {customer.type} · {customer.status}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Registered {customer.registered} · {customer.branch}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--bg)]"
          >
            <Edit3 size={15} /> Edit profile
          </button>
          <button
            onClick={customer.type === "Walk-in" ? onConvert : onChangeType}
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"
          >
            {customer.type === "Walk-in"
              ? "Convert to member"
              : "Change to walk-in"}
          </button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <InfoSection title="Profile">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Detail label="Phone" value={customer.phone || "Not provided"} />
            <Detail label="Email" value={customer.email || "Not provided"} />
            <Detail label="Customer type" value={customer.type} />
            <Detail label="Branch activity" value={customer.branch} />
          </div>
        </InfoSection>
        <InfoSection title="Membership">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {customer.plan ?? "No active membership"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {customer.endDate
                  ? `Ends ${customer.endDate}`
                  : "Walk-in profile"}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${statusClasses[customer.status]}`}
            >
              {customer.status}
            </span>
          </div>
          {customer.plan && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <button onClick={() => onAction("Membership reminders opened")} className="text-xs font-semibold text-[var(--accent)]">
                Send membership reminder
              </button>
              <button
                onClick={() => onAction("Membership details opened")}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
              >
                View details <ArrowUpRight size={13} />
              </button>
            </div>
          )}
        </InfoSection>
        <InfoSection title="RFID Keyfob">
          <Detail
            label="Assigned keyfob"
            value={customer.keyfob ?? "Not assigned"}
          />
          <button
            onClick={() => onAction("Keyfob assignment opened")}
            className="mt-4 text-xs font-semibold text-[var(--accent)]"
          >
            {customer.keyfob ? "View assignment history" : "Assign keyfob"}
          </button>
        </InfoSection>
        <InfoSection title="Activity history" className="lg:col-span-3">
          <div className="grid gap-3 text-xs sm:grid-cols-3">
            <p className="border-l-2 border-[var(--accent)] pl-3">
              <span className="block font-medium">Profile created</span>
              <span className="mt-1 block text-[var(--text-muted)]">{customer.registered}</span>
            </p>
            <p className="border-l-2 border-[var(--border)] pl-3">
              <span className="block font-medium">Latest visit recorded</span>
              <span className="mt-1 block text-[var(--text-muted)]">Today</span>
            </p>
            {customer.type === "Member" && (
              <p className="border-l-2 border-[var(--border)] pl-3">
                <span className="block font-medium">Membership record linked</span>
                <span className="mt-1 block text-[var(--text-muted)]">System</span>
              </p>
            )}
          </div>
        </InfoSection>
      </div>
      <div className="mt-5">
        <InfoSection title="Visit history">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--bg)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
                <span className="text-[var(--text-muted)]">Day</span>
                <input
                  value={visitDate}
                  onChange={(event) => setVisitDate(event.target.value)}
                  placeholder="e.g. Oct 20, 2026"
                  className="w-32 bg-transparent outline-none placeholder:text-[var(--text-muted)]"
                />
              </label>
              <label className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
                <span className="text-[var(--text-muted)]">Time</span>
                <input
                  value={visitTime}
                  onChange={(event) => setVisitTime(event.target.value)}
                  placeholder="e.g. 09:42 AM"
                  className="w-28 bg-transparent outline-none placeholder:text-[var(--text-muted)]"
                />
              </label>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {visits.length > 0
                ? `${visits.length} attendance record${visits.length === 1 ? "" : "s"} found`
                : "No attendance records found"}
            </span>
          </div>
          <div className="table-viewport overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 pb-3 font-medium">Date</th>
                  <th className="px-3 pb-3 font-medium">Branch</th>
                  <th className="px-3 pb-3 font-medium">Time-in</th>
                  <th className="px-3 pb-3 font-medium">Time-out</th>
                  <th className="px-3 pb-3 font-medium">Source</th>
                  <th className="px-3 pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td className="px-3 py-3">{visit.date}</td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">{visit.branch}</td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">{visit.timeIn}</td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">{visit.timeOut}</td>
                    <td className="px-3 py-3">{visit.source}</td>
                    <td className="px-3 py-3">{visit.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visits.length && (
              <div className="border-t border-[var(--border)] px-3 py-8 text-center text-sm text-[var(--text-muted)]">
                No attendance records match the selected filters.
              </div>
            )}
          </div>
        </InfoSection>
      </div>
    </div>
  );
}

function CustomerAvatar({ customer, size = "md" }: { customer: Pick<Customer, "name" | "photo">; size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  const initials = customer.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  return <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--accent-subtle)] font-bold text-[var(--accent)] ${dimensions}`} aria-label={`${customer.name} profile photo`}>{customer.photo ? <img src={customer.photo} alt="" className="h-full w-full object-cover" /> : <span>{initials}</span>}</div>;
}

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Unable to decode image"));
      image.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function InfoSection({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`}>
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xs font-medium">{value}</p>
    </div>
  );
}

export function CustomerForm({
  customer,
  customers,
  branch,
  onCancel,
  onSave,
}: {
  customer?: Customer;
  customers: Customer[];
  branch: string;
  onCancel: () => void;
  onSave: (customer: Customer) => void;
}) {
  const [form, setForm] = useState<Customer>(
    customer ?? {
      id: "",
      name: "",
      phone: "",
      email: "",
      type: "Walk-in",
      status: "None",
      branch,
      registered: "Today",
      lastVisit: "—",
    },
  );
  const [error, setError] = useState("");
  const update = (key: keyof Customer, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = () => {
    if (!form.name.trim() || !form.phone.trim())
      return setError("Full name and phone number are required.");
    const duplicate = customers.find(
      (item) => item.phone === form.phone && item.id !== form.id,
    );
    if (duplicate)
      return setError(
        `Possible duplicate detected: this phone number is already used by ${duplicate.name}. Review the existing profile before continuing.`,
      );
    onSave({
      ...form,
      id: form.id || createMockId("CUS", 10500 + customers.length),
      registered: form.registered || "Today",
    });
  };
  const handlePhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose a JPG, PNG, or WebP image.");
    if (file.size > 5 * 1024 * 1024) return setError("Photo must be 5 MB or smaller.");
    try { setError(""); const photo = await resizePhoto(file); setForm((current) => ({ ...current, photo })); }
    catch { setError("The selected photo could not be processed. Try another image."); }
  };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="mb-1 text-sm font-medium text-[var(--accent)]">
          Customer record
        </p>
        <h2 className="text-2xl font-bold">
          {customer?.id ? "Edit customer" : "Add customer"}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Required fields are marked by the workflow, not manually assigned
          system values.
        </p>
      </div>
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <CustomerAvatar customer={form} size="lg" />
          <div className="min-w-[180px] flex-1"><p className="text-sm font-semibold">Profile photo</p><p className="mt-1 text-xs text-[var(--text-muted)]">Optional. JPG, PNG, or WebP · maximum 5 MB. Images are resized for this browser prototype.</p></div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--surface)]"><ImagePlus size={15} />{form.photo ? "Replace photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void handlePhoto(event.target.files?.[0])} /></label>
          {form.photo && <button type="button" onClick={() => setForm((current) => ({ ...current, photo: undefined }))} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"><Trash2 size={14} />Remove</button>}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Full name"
            required
            value={form.name}
            onChange={(value) => update("name", value)}
            placeholder="e.g. Jamie Lim"
          />
          <Field
            label="Phone number"
            required
            value={form.phone}
            onChange={(value) => update("phone", value)}
            placeholder="+63 917 000 0000"
          />
          <Field
            label="Email address"
            value={form.email}
            onChange={(value) => update("email", value)}
            placeholder="name@example.com"
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Branch</span>
            <select
              value={form.branch}
              onChange={(event) => update("branch", event.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option>Makati Central</option>
              <option>BGC High Street</option>
              <option>Cebu IT Park</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">
              Customer type
            </span>
            <select
              value={form.type}
              onChange={(event) => update("type", event.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option>Walk-in</option>
              <option>Member</option>
            </select>
          </label>
        </div>
        {error && (
          <p className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border)] pt-5">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
          >
            <Check size={16} /> Save customer
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
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
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
      />
    </label>
  );
}
