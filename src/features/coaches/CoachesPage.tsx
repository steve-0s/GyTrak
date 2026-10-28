import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import Modal from "../../components/shared/Modal";
import OverlayDropdown from "../../components/shared/OverlayDropdown";
import { useGymData } from "../../contexts/GymDataContext";
import type { Coach } from "../../types";

type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void };

const emptyForm = { name: "", specialty: "", phone: "" };

export default function CoachesPage({ isAdmin, branch: assignedBranch = "Makati Central", onAction }: Props) {
  const { coaches, branches, upsertCoach, archiveCoach } = useGymData();
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState(isAdmin ? "All branches" : assignedBranch);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coach | null>(null);
  const [form, setForm] = useState(emptyForm);
  const activeBranches = branches.filter((item) => item.status === "Active");
  const operationBranch = isAdmin
    ? activeBranches.find((item) => item.name === branch)?.name ?? activeBranches[0]?.name
    : activeBranches.find((item) => item.name === assignedBranch)?.name;

  const rows = useMemo(
    () =>
      coaches.filter(
        (coach) =>
          coach.status !== "Archived" &&
          (branch === "All branches" || coach.branch === branch) &&
          `${coach.name} ${coach.specialty} ${coach.phone}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [coaches, branch, query],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (coach: Coach) => {
    setEditing(coach);
    setForm({ name: coach.name, specialty: coach.specialty, phone: coach.phone });
    setFormOpen(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.specialty.trim()) {
      onAction("Coach name and specialty are required");
      return;
    }
    if (editing) {
      upsertCoach({ ...editing, name: form.name.trim(), specialty: form.specialty.trim(), phone: form.phone.trim() || "—" });
      onAction("Coach updated");
    } else {
      upsertCoach({
          id: `COA-${String(Date.now()).slice(-3)}`,
          name: form.name.trim(),
          specialty: form.specialty.trim(),
          branch: operationBranch ?? "",
          status: "Active",
          phone: form.phone.trim() || "—",
        });
      onAction("Coach created");
    }
    setFormOpen(false);
    setForm(emptyForm);
  };

  const archive = (coach: Coach) => {
    if (!window.confirm(`Archive ${coach.name}? Historical assignments will be retained.`)) return;
    const error = archiveCoach(coach.id);
    if (error) onAction(error);
    else onAction("Coach archived");
  };

  const toggleStatus = (coach: Coach) => {
    upsertCoach({ ...coach, status: coach.status === "Active" ? "Inactive" : "Active" });
    onAction(`Coach ${coach.status === "Active" ? "deactivated" : "activated"}`);
  };

  return (
    <div>
      <div className="page-header page-header--actions">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">{isAdmin ? "All branches" : assignedBranch}</p>
          <h2 className="text-2xl font-bold">Coaches</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Manage coach records and branch assignments.</p>
        </div>
        <div className="page-header-actions">
        <button onClick={openCreate} disabled={!operationBranch} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">
          <Plus size={16} /> Add coach
        </button>
        </div>
      </div>

      {formOpen && (
        <Modal label={editing ? "Edit coach" : "Add coach"} onClose={() => setFormOpen(false)}>
          <section className="p-1">
            <h2 className="pr-8 text-xl font-bold">{editing ? "Edit coach" : "Add coach"}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Keep the coach record current for staff and customers.</p>
            <div className="mt-5 grid gap-4">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Coach name" className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" />
              <input value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} placeholder="Specialty" className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" />
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone (optional)" className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm" />
              <button onClick={save} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)]">{editing ? "Save changes" : "Create coach"}</button>
            </div>
          </section>
        </Modal>
      )}

      <section className="data-table-section">
        <div className="data-table-toolbar flex flex-wrap items-center gap-2">
          <label className="flex min-w-[210px] flex-1 items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
            <Search size={15} className="text-[var(--text-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search coaches" className="w-full bg-transparent text-sm outline-none" />
          </label>
          {isAdmin && <select value={branch} onChange={(event) => setBranch(event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"><option>All branches</option>{activeBranches.map((item) => <option key={item.id}>{item.name}</option>)}</select>}
        </div>
        <div className="table-viewport overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead><tr>{["Coach ID", "Name", "Specialty", "Branch", "Contact", "Status", "Actions"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((coach) => <tr key={coach.id} className="hover:bg-[var(--bg)]">
                <td className="font-mono text-[var(--text-muted)]">{coach.id}</td>
                <td className="font-semibold">{coach.name}</td>
                <td>{coach.specialty}</td>
                <td className="text-[var(--text-muted)]">{coach.branch}</td>
                <td className="text-[var(--text-muted)]">{coach.phone}</td>
                <td><button onClick={() => toggleStatus(coach)} className="font-medium text-[var(--accent)]">{coach.status}</button></td>
                <td className="text-right"><OverlayDropdown label={`Actions for ${coach.name}`} className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg)]" menuClassName="min-w-32"><button role="menuitem" onClick={() => openEdit(coach)} className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-[var(--bg)]">Edit</button><button role="menuitem" onClick={() => archive(coach)} className="block w-full rounded px-3 py-2 text-left text-xs text-amber-700 hover:bg-amber-50">Archive</button></OverlayDropdown></td>
              </tr>)}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-10 text-center text-sm text-[var(--text-muted)]">No coaches match the current filters.</p>}
        </div>
      </section>
    </div>
  );
}
