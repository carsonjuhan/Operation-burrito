"use client";

import { useState } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { BabyClass, ClassType } from "@/types";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Plus, CheckCircle2, Clock, Pencil, Trash2, MapPin, DollarSign } from "lucide-react";
import clsx from "clsx";

const CLASS_TYPES: ClassType[] = [
  "Childbirth", "Breastfeeding", "Newborn Care", "CPR / First Aid",
  "Parenting", "Prenatal Fitness", "Other",
];

const TYPE_COLORS: Record<ClassType, string> = {
  "Childbirth": "bg-rose-100 text-rose-700",
  "Breastfeeding": "bg-pink-100 text-pink-700",
  "Newborn Care": "bg-amber-100 text-amber-700",
  "CPR / First Aid": "bg-red-100 text-red-700",
  "Parenting": "bg-violet-100 text-violet-700",
  "Prenatal Fitness": "bg-emerald-100 text-emerald-700",
  "Other": "bg-stone-100 text-stone-600",
};

const DEFAULT_FORM = {
  name: "",
  type: "Childbirth" as ClassType,
  provider: "",
  date: "",
  completed: false,
  notes: "",
  location: "",
  cost: "",
};

export default function ClassesPage() {
  const { store, loaded, addClass, updateClass, deleteClass } = useStoreContext();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BabyClass | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  if (!loaded) return null;

  const { classes } = store;
  const completed = classes.filter((c) => c.completed).length;

  const upcoming = classes.filter((c) => !c.completed).sort((a, b) => (a.date > b.date ? 1 : -1));
  const done = classes.filter((c) => c.completed).sort((a, b) => (a.date > b.date ? -1 : 1));

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  }

  function openEdit(cls: BabyClass) {
    setEditing(cls);
    setForm({
      name: cls.name,
      type: cls.type,
      provider: cls.provider,
      date: cls.date,
      completed: cls.completed,
      notes: cls.notes,
      location: cls.location ?? "",
      cost: cls.cost != null ? String(cls.cost) : "",
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      type: form.type,
      provider: form.provider.trim(),
      date: form.date,
      completed: form.completed,
      notes: form.notes.trim(),
      location: form.location.trim() || undefined,
      cost: form.cost ? parseFloat(form.cost) : undefined,
    };
    if (editing) {
      updateClass(editing.id, payload);
    } else {
      addClass(payload);
    }
    setShowModal(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Classes</h1>
          <p className="text-sm text-stone-400 mt-1">
            {completed} of {classes.length} completed
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Class
        </button>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon="🎓"
          title="No classes yet"
          description="Track childbirth education, breastfeeding, CPR, and other prenatal classes."
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={16} /> Add your first class
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <Section title="Upcoming / Registered">
              {upcoming.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  onToggle={() => updateClass(cls.id, { completed: !cls.completed })}
                  onEdit={() => openEdit(cls)}
                  onDelete={() => deleteClass(cls.id)}
                />
              ))}
            </Section>
          )}
          {done.length > 0 && (
            <Section title="Completed">
              {done.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  onToggle={() => updateClass(cls.id, { completed: !cls.completed })}
                  onEdit={() => openEdit(cls)}
                  onDelete={() => deleteClass(cls.id)}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? "Edit Class" : "Add Class"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Class Name *</label>
              <input
                className="input"
                required
                placeholder="e.g. Bradley Method Childbirth"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Type</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ClassType })}
                >
                  {CLASS_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Provider / Instructor</label>
              <input
                className="input"
                placeholder="e.g. Hospital, doula name…"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                placeholder="Address or 'Online'"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cost ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="What did you learn? Takeaways, follow-up questions…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.completed}
                onChange={(e) => setForm({ ...form, completed: e.target.checked })}
                className="rounded border-stone-300 text-sage-600 focus:ring-sage-400"
              />
              <span className="text-sm text-stone-600">Completed</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 justify-center">
                {editing ? "Save Changes" : "Add Class"}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2 px-1">{title}</h2>
      <div className="card divide-y divide-stone-100">{children}</div>
    </div>
  );
}

function ClassCard({
  cls,
  onToggle,
  onEdit,
  onDelete,
}: {
  cls: BabyClass;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={clsx("p-4 group", cls.completed && "opacity-70")}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 shrink-0 text-stone-400 hover:text-emerald-500 transition-colors">
          {cls.completed ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : (
            <Clock size={20} />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx("text-sm font-semibold text-stone-700", cls.completed && "line-through text-stone-400")}>
              {cls.name}
            </span>
            <span className={`badge ${TYPE_COLORS[cls.type]}`}>{cls.type}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5">
            {cls.provider && (
              <span className="text-xs text-stone-400">{cls.provider}</span>
            )}
            {cls.date && (
              <span className="text-xs text-stone-400">
                {new Date(cls.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            {cls.location && (
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <MapPin size={11} /> {cls.location}
              </span>
            )}
            {cls.cost != null && (
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <DollarSign size={11} /> {cls.cost}
              </span>
            )}
          </div>
          {cls.notes && (
            <p className="text-xs text-stone-500 mt-2 whitespace-pre-wrap">{cls.notes}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-stone-100 text-stone-400">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
