import { useState } from "react";
import { Plus, Search } from "lucide-react";
import Modal from "../../components/shared/Modal";
import FilterSelect from "../../components/shared/FilterSelect";
import CustomerCombobox from "../../components/shared/CustomerCombobox";
import { useGymData } from "../../contexts/GymDataContext";

type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void };
const badge = (value: string) => value === "Assigned" ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : value === "Unassigned" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";

export default function RFIDKeyfobsPage({ isAdmin, branch: assignedBranch = "Makati Central", onAction }: Props) {
  const { keyfobs, customers, assignKeyfob, deactivateKeyfob } = useGymData();
  const [query, setQuery] = useState("");
  const [customerFilterId, setCustomerFilterId] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [assigning, setAssigning] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [branch, setBranch] = useState(isAdmin ? "All branches" : assignedBranch);
  const assignedCustomer = customers.find((customer) => customer.id === customerFilterId);
  const rows = keyfobs.filter((keyfob) => (branch === "All branches" || keyfob.branch === branch) && (!customerFilterId || keyfob.customer === assignedCustomer?.name) && `${keyfob.id} ${keyfob.uid}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || keyfob.status === status));
  const available = rows.find((keyfob) => keyfob.status === "Unassigned");
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const close = () => { setAssigning(false); setCustomerId(""); };
  const confirmAssignment = () => { if (!available || !selectedCustomer) return; assignKeyfob(available.id, selectedCustomer.name, available.branch); close(); onAction("Keyfob assigned"); };
  return <div>
    <div className="page-header page-header--actions"><div><p className="mb-1 text-sm font-medium text-[var(--accent)]">{branch}</p><h2 className="text-2xl font-bold tracking-tight">RFID Keyfobs</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Assign, replace, and deactivate branch keyfobs.</p></div><div className="page-header-actions"><button onClick={() => setAssigning(true)} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]"><Plus size={16} /> Assign keyfob</button></div></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Total keyfobs", rows.length], ["Assigned", rows.filter((row) => row.status === "Assigned").length], ["Unassigned", rows.filter((row) => row.status === "Unassigned").length], ["Deactivated", rows.filter((row) => row.status === "Deactivated").length]].map(([label, value]) => <div key={label} className="summary-card"><p className="summary-card-label">{label}</p><p className="summary-card-value">{value}</p></div>)}</div>
    <section className="data-table-section">
      <div className="data-table-toolbar flex flex-wrap items-center gap-2">
        <label className="flex min-w-[210px] flex-1 items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
          <Search size={14} className="text-[var(--text-muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search keyfob ID or RFID" className="w-full bg-transparent text-xs outline-none" />
        </label>
        <div className="min-w-[220px] flex-1"><CustomerCombobox customers={customers} value={customerFilterId} onChange={setCustomerFilterId} placeholder="Filter by customer" aria-label="Filter keyfobs by customer" /></div>
        {isAdmin && <FilterSelect value={branch} onChange={(value) => { setBranch(value); setCustomerFilterId(""); }} options={["All branches", "Makati Central", "BGC High Street", "Cebu IT Park", "Quezon Avenue"]} />}
        <FilterSelect value={status} onChange={setStatus} options={["All statuses", "Assigned", "Unassigned", "Deactivated"]} />
      </div>
      <div className="table-viewport overflow-x-auto">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>{["Keyfob ID", "RFID identifier", "Assigned customer", "Branch", "Status", "Assigned date", ""].map((label) => <th key={label}>{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => <tr key={row.id}>
              <td className="font-medium">{row.id}</td>
              <td className="font-mono text-[var(--text-muted)]">{row.uid}</td>
              <td>{row.customer}</td>
              <td className="text-[var(--text-muted)]">{row.branch}</td>
              <td><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badge(row.status)}`}>{row.status}</span></td>
              <td className="text-[var(--text-muted)]">{row.date}</td>
              <td className="text-right">{row.status === "Assigned" ? <button onClick={() => { deactivateKeyfob(row.id); onAction("Keyfob deactivated"); }} className="font-semibold text-red-600">Deactivate</button> : row.status === "Unassigned" ? <button onClick={() => setAssigning(true)} className="font-semibold text-[var(--accent)]">Assign</button> : <span className="text-[var(--text-muted)]">History</span>}</td>
            </tr>)}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-10 text-center text-sm text-[var(--text-muted)]">No keyfobs match the current filters.</p>}
      </div>
    </section>
    {assigning && <Modal label="Assign RFID keyfob" onClose={close}><div className="pr-8"><h2 className="text-xl font-bold">Assign keyfob</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Available reader: {available?.id ?? "None available"}</p></div><div className="mt-5"><label className="block text-xs font-medium"><span className="mb-1.5 block">Customer</span><CustomerCombobox customers={customers.filter((item) => item.branch === available?.branch)} value={customerId} onChange={setCustomerId} placeholder="Search by name, phone, or customer ID" /></label><button disabled={!selectedCustomer || !available} onClick={confirmAssignment} className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40">Confirm assignment</button></div></Modal>}
  </div>;
}
