"use client";

import { useState, useCallback } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { BirthPlanSection } from "@/types";
import { Save, CheckCircle2, Heart, Plus, Trash2, GripVertical } from "lucide-react";

const SECTION_PROMPTS: Record<string, string> = {
  "Labor Environment": "e.g. Dim lights, soft music, minimal interruptions. I'd like freedom to move around. Please knock before entering.",
  "Pain Management": "e.g. I plan to use an epidural / I want to try without medication first. I'm open to IV pain relief if needed.",
  "Labor & Delivery Preferences": "e.g. I'd like to push in whatever position feels natural. Please tell me before any procedures. Delayed cord clamping if possible.",
  "Immediately After Birth": "e.g. Skin-to-skin contact right away. Partner to cut the cord. Please delay newborn procedures for the first hour.",
  "Newborn Care": "e.g. No pacifiers. Room-in with baby. We decline the Hepatitis B vaccine at birth.",
  "Feeding Preferences": "e.g. I plan to exclusively breastfeed. Please do not offer formula without asking. Lactation consultant visit requested.",
  "Support People": "e.g. My partner [Name] and doula [Name] will be present. Only they should be in the room during pushing.",
  "Special Circumstances / Other Wishes": "e.g. In case of C-section, I'd like [Name] present. Please explain all interventions before performing them.",
};

export default function BirthPlanPage() {
  const { store, loaded, updateBirthPlan } = useStoreContext();
  const [saved, setSaved] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);

  const plan = store.birthPlan;

  const handleSectionChange = useCallback(
    (id: string, content: string) => {
      const updated = {
        ...plan,
        sections: plan.sections.map((s) => (s.id === id ? { ...s, content } : s)),
      };
      updateBirthPlan(updated);
    },
    [plan, updateBirthPlan]
  );

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const updated = {
      ...plan,
      sections: [
        ...plan.sections,
        {
          id: crypto.randomUUID(),
          title: newSectionTitle.trim(),
          content: "",
          order: plan.sections.length + 1,
        },
      ],
    };
    updateBirthPlan(updated);
    setNewSectionTitle("");
    setShowAddSection(false);
  };

  const handleDeleteSection = (id: string) => {
    const updated = {
      ...plan,
      sections: plan.sections.filter((s) => s.id !== id),
    };
    updateBirthPlan(updated);
  };

  const handleSave = () => {
    updateBirthPlan(plan);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const filledCount = plan.sections.filter((s) => s.content.trim().length > 0).length;

  if (!loaded) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Birth Plan</h1>
          <p className="text-sm text-stone-400 mt-1">
            {filledCount} of {plan.sections.length} sections filled
            {plan.updatedAt && (
              <> · Last updated {new Date(plan.updatedAt).toLocaleDateString()}</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddSection(!showAddSection)} className="btn-secondary">
            <Plus size={16} /> Add Section
          </button>
          <button onClick={handleSave} className="btn-primary">
            {saved ? (
              <><CheckCircle2 size={16} /> Saved!</>
            ) : (
              <><Save size={16} /> Save</>
            )}
          </button>
        </div>
      </div>

      {/* Intro card */}
      <div className="card p-4 mb-6 flex items-start gap-3 bg-rose-50 border-rose-100">
        <Heart size={18} className="text-rose-400 mt-0.5 shrink-0" />
        <p className="text-sm text-rose-700">
          Your birth plan communicates your wishes to your care team. Fill in as much or as little as you like —
          it's a living document. Share a printed copy with your provider and bring it to the hospital.
        </p>
      </div>

      {/* Add section form */}
      {showAddSection && (
        <div className="card p-4 mb-6 flex gap-2">
          <input
            className="input flex-1"
            placeholder="New section title…"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
            autoFocus
          />
          <button onClick={handleAddSection} className="btn-primary">Add</button>
          <button onClick={() => setShowAddSection(false)} className="btn-secondary">Cancel</button>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {plan.sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            prompt={SECTION_PROMPTS[section.title]}
            onChange={(content) => handleSectionChange(section.id, content)}
            onDelete={() => handleDeleteSection(section.id)}
          />
        ))}
      </div>

      {/* Print hint */}
      {filledCount > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => window.print()}
            className="btn-secondary"
          >
            Print / Save as PDF
          </button>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  section,
  prompt,
  onChange,
  onDelete,
}: {
  section: BirthPlanSection;
  prompt?: string;
  onChange: (content: string) => void;
  onDelete: () => void;
}) {
  const filled = section.content.trim().length > 0;

  return (
    <div className="card p-5 group">
      <div className="flex items-center gap-2 mb-3">
        <GripVertical size={14} className="text-stone-300 cursor-grab" />
        <h3 className="text-sm font-semibold text-stone-700 flex-1">{section.title}</h3>
        {filled && (
          <span className="badge bg-emerald-100 text-emerald-700">Filled</span>
        )}
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-50 text-stone-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <textarea
        className="textarea"
        rows={4}
        placeholder={prompt ?? `Your preferences for ${section.title.toLowerCase()}…`}
        value={section.content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
