"use client";

import { useState, useMemo } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { Material, MaterialType } from "@/types";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { Plus, Pencil, Trash2, ExternalLink, FileText, Video, Globe, BookOpen, Smartphone, Tag, Search } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

const MATERIAL_TYPES: MaterialType[] = [
  "PDF / Document", "Video", "Article", "Book", "App", "Other",
];

const TYPE_ICONS: Record<MaterialType, React.ReactNode> = {
  "PDF / Document": <FileText size={16} className="text-red-500" />,
  "Video": <Video size={16} className="text-rose-500" />,
  "Article": <Globe size={16} className="text-sky-500" />,
  "Book": <BookOpen size={16} className="text-amber-600" />,
  "App": <Smartphone size={16} className="text-violet-500" />,
  "Other": <Tag size={16} className="text-stone-400" />,
};

const TYPE_COLORS: Record<MaterialType, string> = {
  "PDF / Document": "bg-red-50 text-red-700",
  "Video": "bg-rose-50 text-rose-700",
  "Article": "bg-sky-50 text-sky-700",
  "Book": "bg-amber-50 text-amber-700",
  "App": "bg-violet-50 text-violet-700",
  "Other": "bg-stone-100 text-stone-600",
};

const DEFAULT_FORM = {
  title: "",
  type: "PDF / Document" as MaterialType,
  topic: "",
  url: "",
  notes: "",
  savedAt: new Date().toISOString().split("T")[0],
};

export default function MaterialsPage() {
  const { store, loaded, addMaterial, updateMaterial, deleteMaterial, restoreMaterial } = useStoreContext();
  const { handleDelete: handleUndoDelete } = useUndoDelete<Material>(deleteMaterial, restoreMaterial, (m) => m.title);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<MaterialType | "All">("All");

  const filtered = useMemo(() => {
    return store.materials.filter((m) => {
      if (filterType !== "All" && m.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.topic.toLowerCase().includes(q) ||
          m.notes.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [store.materials, filterType, search]);

  const topicGroups = useMemo(() => {
    const g: Record<string, Material[]> = {};
    for (const m of filtered) {
      const key = m.topic || "General";
      if (!g[key]) g[key] = [];
      g[key].push(m);
    }
    return g;
  }, [filtered]);

  if (!loaded) return null;

  const { materials } = store;

  function openAdd() {
    setEditing(null);
    setForm({ ...DEFAULT_FORM, savedAt: new Date().toISOString().split("T")[0] });
    setShowModal(true);
  }

  function openEdit(mat: Material) {
    setEditing(mat);
    setForm({
      title: mat.title,
      type: mat.type,
      topic: mat.topic,
      url: mat.url ?? "",
      notes: mat.notes,
      savedAt: mat.savedAt,
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      type: form.type,
      topic: form.topic.trim(),
      url: form.url.trim() || undefined,
      notes: form.notes.trim(),
      savedAt: form.savedAt,
    };
    if (editing) {
      updateMaterial(editing.id, payload);
    } else {
      addMaterial(payload);
    }
    setShowModal(false);
  }

  return (
    <PageTransition className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Materials</h1>
          <p className="text-sm text-stone-400 mt-1">{materials.length} saved resources</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Material
        </button>
      </div>

      {/* Search + Filter */}
      {materials.length > 0 && (
        <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Search size={14} className="text-stone-400 shrink-0" aria-hidden="true" />
            <input
              className="text-sm bg-transparent focus:outline-none w-full"
              placeholder="Search materials…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search materials"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Type</span>
            <select
              className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-white focus:outline-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as MaterialType | "All")}
              aria-label="Filter by type"
            >
              <option value="All">All</option>
              {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {materials.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No materials saved"
          description="Save PDFs, videos, articles, books, and apps related to your pregnancy and baby prep."
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={16} /> Add your first material
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No materials match your search.</div>
      ) : (
        <div className="space-y-6">
          {Object.keys(topicGroups).sort().map((topic) => (
            <div key={topic}>
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2 px-1">{topic}</h2>
              <div className="card divide-y divide-stone-100">
                {topicGroups[topic].map((mat) => (
                  <MaterialRow
                    key={mat.id}
                    mat={mat}
                    onEdit={() => openEdit(mat)}
                    onDelete={() => handleUndoDelete(mat)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editing ? "Edit Material" : "Add Material"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                className="input"
                required
                placeholder="e.g. The Fourth Trimester"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Type</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as MaterialType })}
                >
                  {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date Saved</label>
                <input
                  className="input"
                  type="date"
                  value={form.savedAt}
                  onChange={(e) => setForm({ ...form, savedAt: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Topic / Subject</label>
              <input
                className="input"
                placeholder="e.g. Breastfeeding, Sleep, Labor…"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>
            <div>
              <label className="label">URL / Link</label>
              <input
                className="input"
                type="url"
                placeholder="https://"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Key takeaways, where to find it, page numbers…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 justify-center">
                {editing ? "Save Changes" : "Add Material"}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageTransition>
  );
}

function MaterialRow({
  mat,
  onEdit,
  onDelete,
}: {
  mat: Material;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 group">
      <div className="shrink-0">{TYPE_ICONS[mat.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-stone-700">{mat.title}</span>
          <span className={`badge ${TYPE_COLORS[mat.type]}`}>{mat.type}</span>
        </div>
        {mat.notes && <p className="text-xs text-stone-500 mt-0.5 truncate">{mat.notes}</p>}
        {mat.savedAt && (
          <p className="text-xs text-stone-500 mt-0.5">
            Saved {new Date(mat.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
      {mat.url && (
        <a
          href={mat.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-500 hover:text-sage-600 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open link for ${mat.title} (opens in new tab)`}
        >
          <ExternalLink size={14} />
        </a>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-stone-100 text-stone-400" aria-label={`Edit ${mat.title}`}>
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-red-50 text-stone-400 hover:text-red-500" aria-label={`Delete ${mat.title}`}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
