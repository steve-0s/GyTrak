import { useMemo, useState } from "react";
import { ArchiveRestore, ChevronLeft, ChevronRight, Search } from "lucide-react";
import FilterSelect from "../../components/shared/FilterSelect";
import Modal from "../../components/shared/Modal";
import { useGymData } from "../../contexts/GymDataContext";
import { toast } from "../../components/shared/toast";

type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void };

export default function ArchivedRecordsScreen({ isAdmin, branch, onAction }: Props) {
  const { archivedRecords, restoreCustomer, restoreMembershipPlan, restoreCoach, branches, upsertBranch } = useGymData();
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState("All types");
  const [branchFilter, setBranchFilter] = useState("All branches");
  const [archivedOn, setArchivedOn] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<(typeof archivedRecords)[number] | null>(null);
  const [error, setError] = useState("");
  const [loading] = useState(false);
  const branchOptions = useMemo(() => ["All branches", ...new Set(archivedRecords.map((record) => record.branch).filter((value): value is string => Boolean(value)))], [archivedRecords]);
  const filtered = useMemo(() => archivedRecords.filter((record) =>
    (isAdmin || !record.branch || record.branch === branch) &&
    (branchFilter === "All branches" || record.branch === branchFilter) &&
    (entity === "All types" || record.entity === entity) &&
    (!archivedOn || (Number.isFinite(Date.parse(record.archivedAt)) && new Date(record.archivedAt).toISOString().slice(0, 10) === archivedOn)) &&
    `${record.name} ${record.id} ${record.branch ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  ), [archivedRecords, archivedOn, branch, branchFilter, entity, isAdmin, query]);
  const rows = filtered.slice((page - 1) * 8, page * 8);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));

  const restore = (record: (typeof rows)[number]) => {
    const confirmed = window.confirm(`Restore ${record.entity.toLowerCase()} “${record.name}”?`);
    if (!confirmed) return;
    let restoreError: string | null = null;
    if (record.entity === "Customer") restoreError = restoreCustomer(record.id);
    if (record.entity === "Coach") restoreError = restoreCoach(record.id);
    if (record.entity === "Membership plan") restoreError = restoreMembershipPlan(record.id);
    if (record.entity === "Branch") {
      const branchRecord = branches.find((item) => item.id === record.id);
      if (!branchRecord) restoreError = "The archived branch was not found.";
      else if (branchRecord.status !== "Archived") restoreError = "This branch is no longer archived.";
      else upsertBranch({ ...branchRecord, status: "Active" });
    }
    if (restoreError) { setError(restoreError); toast.error(restoreError); }
    else { setError(""); toast.success(`${record.entity} restored`); onAction(`${record.entity} restored`); }
  };

  return <div>
    <div className="page-header">
      <p className="mb-1 text-sm font-medium text-[var(--accent)]">Lifecycle management</p>
      <h2 className="text-2xl font-bold tracking-tight">Archived Records</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Review retained operational records and restore them only when their current relationships allow it.</p>
    </div>
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
          <Search size={15} className="text-[var(--text-muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search archived records" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <FilterSelect value={entity} options={["All types", "Customer", "Branch", "Membership plan", "Coach"]} onChange={setEntity} />
        <FilterSelect value={branchFilter} options={branchOptions} onChange={(value) => { setBranchFilter(value); setPage(1); }} />
        <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"><span className="text-xs text-[var(--text-muted)]">Archived on</span><input type="date" value={archivedOn} onChange={(event) => { setArchivedOn(event.target.value); setPage(1); }} className="bg-transparent outline-none" /></label>
      </div>
      {error && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto">
        <table className="data-table min-w-[760px]">
          <thead><tr><th>Record</th><th>Type</th><th>Branch</th><th>Archived</th><th /></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">Loading archived records…</td></tr>}
            {!loading && rows.map((record) => <tr key={`${record.entity}-${record.id}`}>
              <td><button onClick={() => setSelected(record)} className="text-left"><p className="font-semibold hover:text-[var(--accent)]">{record.name}</p><p className="text-xs text-[var(--text-muted)]">{record.id}</p></button></td>
              <td>{record.entity}</td><td>{record.branch ?? "All branches"}</td><td>{record.archivedAt}</td>
              <td className="text-right"><div className="flex justify-end gap-2"><button onClick={() => setSelected(record)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--bg)]">Details</button><button onClick={() => restore(record)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--bg)]"><ArchiveRestore size={15} /> Restore</button></div></td>
            </tr>)}
            {!loading && !rows.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">No archived records match the current filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-sm"><span className="text-[var(--text-muted)]">{filtered.length} record{filtered.length === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[var(--border)] p-2 disabled:opacity-40"><ChevronLeft size={15} /></button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[var(--border)] p-2 disabled:opacity-40"><ChevronRight size={15} /></button></div></div>
    </section>
    {selected && <Modal label={`${selected.entity} details`} onClose={() => setSelected(null)}><h3 className="pr-8 text-xl font-bold">{selected.name}</h3><dl className="mt-5 space-y-3 text-sm"><div><dt className="text-[var(--text-muted)]">Record ID</dt><dd className="font-medium">{selected.id}</dd></div><div><dt className="text-[var(--text-muted)]">Type</dt><dd className="font-medium">{selected.entity}</dd></div><div><dt className="text-[var(--text-muted)]">Branch</dt><dd className="font-medium">{selected.branch ?? "All branches"}</dd></div><div><dt className="text-[var(--text-muted)]">Archived</dt><dd className="font-medium">{selected.archivedAt}</dd></div></dl><button onClick={() => { setSelected(null); restore(selected); }} className="mt-6 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)]">Restore record</button></Modal>}
  </div>;
}
