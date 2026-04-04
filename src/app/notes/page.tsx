"use client";

import { useState, useMemo } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { Note, NoteCategory } from "@/types";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Pencil, Trash2, Pin, Search } from "lucide-react";
import clsx from "clsx";

const CATEGORIES: NoteCategory[] = [
  "Appointment", "Milestone", "Question for Doctor", "Hospital Bag", "Postpartum Plan", "General",
];

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  "Appointment": "bg-sky-100 text-sky-700",
  "Milestone": "bg-violet-100 text-violet-700",
  "Question for Doctor": "bg-amber-100 text-amber-700",
  "Hospital Bag": "bg-rose-100 text-rose-700",
  "Postpartum Plan": "bg-emerald-100 text-emerald-700",
  "General": "bg-stone-100 text-stone-600",
};

const DEFAULT_FORM = {
  title: "",
  content: "",
  category: "General" as NoteCategory,
  pinned: false,
};

export default function NotesPage() {
  const { store, loaded, addNote, updateNote, deleteNote } = useStoreContext();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<NoteCategory | "All">("All");

  const filtered = useMemo(() => {
    return store.notes.filter((n) => {
      if (filterCategory !== "All" && n.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      }
      return true;
    });
  }, [store.notes, search, filterCategory]);

  if (!loaded) return null;

  const { notes } = store;

  const pinned = filtered.filter((n) => n.pinned);
  const unpinned = filtered
    .filter((n) => !n.pinned)
    .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setForm({
      title: note.title,
      content: note.content,
      category: note.category,
      pinned: note.pinned,
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      pinned: form.pinned,
    };
    if (editing) {
      updateNote(editing.id, payload);
    } else {
      addNote(payload);
    }
    setShowModal(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Notes</h1>
          <p className="text-sm text-stone-400 mt-1">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Note
        </button>
      </div>

      {/* Search + filter */}
      {notes.length > 0 && (
        <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Search size={14} className="text-stone-400 shrink-0" />
            <input
              className="text-sm bg-transparent focus:outline-none w-full"
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Category</span>
            <select
              className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-white focus:outline-none"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as NoteCategory | "All")}
            >
              <option value="All">All</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No notes yet"
          description="Jot down appointments, questions for your doctor, hospital bag lists, milestones, and more."
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={16} /> Add your first note
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No notes match your search.</div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <Section title="Pinned">
              {pinned.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onTogglePin={() => updateNote(note.id, { pinned: !note.pinned })}
                  onEdit={() => openEdit(note)}
                  onDelete={() => deleteNote(note.id)}
                />
              ))}
            </Section>
          )}
          {unpinned.length > 0 && (
            <Section title={pinned.length > 0 ? "Other Notes" : "Notes"}>
              {unpinned.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onTogglePin={() => updateNote(note.id, { pinned: !note.pinned })}
                  onEdit={() => openEdit(note)}
                  onDelete={() => deleteNote(note.id)}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editing ? "Edit Note" : "Add Note"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                className="input"
                required
                placeholder="e.g. Questions for 36-week appointment"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as NoteCategory })}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Content</label>
              <textarea
                className="textarea"
                rows={6}
                placeholder="Write your note here…"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                className="rounded border-stone-300 text-sage-600 focus:ring-sage-400"
              />
              <span className="text-sm text-stone-600">Pin this note</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 justify-center">
                {editing ? "Save Changes" : "Add Note"}
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
      <div className="grid grid-cols-1 gap-3">{children}</div>
    </div>
  );
}

function NoteCard({
  note,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  note: Note;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={clsx("card p-4 group", note.pinned && "border-amber-200 bg-amber-50/30")}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-stone-700">{note.title}</span>
            <span className={`badge ${CATEGORY_COLORS[note.category]}`}>{note.category}</span>
            {note.pinned && <span className="badge bg-amber-100 text-amber-600">Pinned</span>}
          </div>
          {note.content && (
            <p className="text-sm text-stone-500 whitespace-pre-wrap">{note.content}</p>
          )}
          <p className="text-xs text-stone-300 mt-2">
            {new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onTogglePin}
            className={clsx(
              "p-1.5 rounded transition-colors",
              note.pinned
                ? "text-amber-500 hover:bg-amber-100"
                : "text-stone-400 hover:bg-stone-100"
            )}
            title={note.pinned ? "Unpin" : "Pin"}
          >
            <Pin size={14} />
          </button>
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
