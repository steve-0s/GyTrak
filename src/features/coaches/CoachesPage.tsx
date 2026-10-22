import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import Modal from "../../components/shared/Modal";
import { useGymData } from "../../contexts/GymDataContext";
import type { Coach } from "../../types";

type Props = { isAdmin: boolean; branch?: string; onAction: (message: string) => void };

const emptyForm = { name: "", specialty: "", phone: "" };

export default function CoachesPage({ isAdmin, branch: assignedBranch = "Makati Central", onAction }: Props) {
  const { coaches, upsertCoach, removeCoach } = useGymData();
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState(isAdmin ? "All branches" : assignedBranch);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coach | null>(null);
  const [form, setForm] = useState(emptyForm);

  const rows = useMemo(
    () =>
      coaches.filter(
        (coach) =>
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
          branch: branch === "All branches" ? assignedBranch : branch,
          status: "Active",
          phone: form.phone.trim() || "—",
        });
      onAction("Coach created");
    }
    setFormOpen(false);
    setForm(emptyForm);
  };

  const remove = (coach: Coach) => {
    if (!window.confirm(`Delete ${coach.name}? This prototype action cannot be undone.`)) return;
    removeCoach(coach.id);
    onAction("Coach deleted");
  };

  const toggleStatus = (coach: Coach) => {
    upsertCoach({ ...coach, status: coach.status === "Active" ? "Inactive" : "Active" });
    onAction(`Coach ${coach.status === "Active" ? "deactivated" : "activated"}`);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--accent)]">{isAdmin ? "All branches" : assignedBranch}</p>
          <h2 className="text-2xl font-bold">Coaches</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Manage coach records and branch assignments.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)]">
          <Plus size={16} /> Add coach
        </button>
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

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
            <Search size={15} className="text-[var(--text-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search coaches" className="bg-transparent text-sm outline-none" />
          </label>
          {isAdmin && <select value={branch} onChange={(event) => setBranch(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-xs"><option>All branches</option><option>Makati Central</option><option>BGC High Street</option><option>Cebu IT Park</option></select>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-[var(--bg)] uppercase tracking-wide text-[var(--text-muted)]"><tr>{["Coach ID", "Name", "Specialty", "Branch", "Contact", "Status", "Actions"].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((coach) => <tr key={coach.id}>
                <td className="px-5 py-4 font-mono text-[var(--text-muted)]">{coach.id}</td>
                <td className="px-5 py-4 font-semibold">{coach.name}</td>
                <td className="px-5 py-4">{coach.specialty}</td>
                <td className="px-5 py-4 text-[var(--text-muted)]">{coach.branch}</td>
                <td className="px-5 py-4 text-[var(--text-muted)]">{coach.phone}</td>
                <td className="px-5 py-4"><button onClick={() => toggleStatus(coach)} className="font-medium text-[var(--accent)]">{coach.status}</button></td>
                <td className="px-5 py-4 text-right"><div className="group relative inline-block"><button aria-label={`Actions for ${coach.name}`} className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg)]"><MoreHorizontal size={17} /></button><div className="invisible absolute right-0 z-10 mt-1 w-32 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-left shadow-lg group-focus-within:visible group-hover:visible"><button onClick={() => openEdit(coach)} className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-[var(--bg)]">Edit</button><button onClick={() => remove(coach)} className="block w-full rounded px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">Delete</button></div></div></td>
              </tr>)}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-10 text-center text-sm text-[var(--text-muted)]">No coaches match the current filters.</p>}
        </div>
      </section>
    </div>
  );
}
