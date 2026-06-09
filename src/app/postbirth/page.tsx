"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Plus, Trash2, X, ClipboardList, ExternalLink } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";

const STORAGE_KEY = "postbirth_tasks";

interface PostBirthTask {
  id: string;
  label: string;
  category: TaskCategory;
  done: boolean;
  notes?: string;
  link?: string;
  dueLabel?: string;
}

type TaskCategory = "Admin" | "Medical" | "Family" | "Financial" | "Other";

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  Admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Medical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Family: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  Financial: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Other: "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
};

const DEFAULT_TASKS: PostBirthTask[] = [
  { id: "pb1", label: "Request birth certificate", category: "Admin", done: false, dueLabel: "Within 30 days", notes: "Vital Statistics Agency (BC)" },
  { id: "pb2", label: "Apply for SIN (Social Insurance Number)", category: "Admin", done: false, dueLabel: "When ready", notes: "Service Canada — can apply online or in person" },
  { id: "pb3", label: "Register for BC MSP (Medical Services Plan)", category: "Medical", done: false, dueLabel: "First 3 months", notes: "Newborns need to be added to provincial health coverage" },
  { id: "pb4", label: "Tsawwassen Clinic — register with a family doctor", category: "Medical", done: false, notes: "Email or call to get baby registered with a GP" },
  { id: "pb5", label: "Jane consent form", category: "Medical", done: false, notes: "Complete the Jane consent form for the clinic" },
  { id: "pb6", label: "Apply for Canada Child Benefit (CCB)", category: "Financial", done: false, dueLabel: "Within 60 days", notes: "CRA — apply online via My Account or mail" },
  { id: "pb7", label: "Apply for BC Family Benefit", category: "Financial", done: false, notes: "Automatic once CCB is set up — verify with CRA" },
  { id: "pb8", label: "Notify employer — parental leave paperwork", category: "Admin", done: false, notes: "EI Maternity/Parental Leave — Service Canada" },
  { id: "pb9", label: "Add baby to extended health insurance", category: "Financial", done: false, dueLabel: "Within 31 days", notes: "Contact your plan provider to add dependent" },
  { id: "pb10", label: "Update will / beneficiaries", category: "Legal", done: false, notes: "Add baby as beneficiary on life insurance, RRSP, etc." },
  { id: "pb11", label: "Baby photos — send to Jana", category: "Family", done: false, notes: "Share first photos with Jana" },
  { id: "pb12", label: "Newborn hearing screening", category: "Medical", done: false, dueLabel: "Before hospital discharge or shortly after", notes: "Usually done at hospital; if missed, book separately" },
  { id: "pb13", label: "First paediatrician visit", category: "Medical", done: false, dueLabel: "3–5 days after birth", notes: "Weight check, jaundice assessment, feeding check" },
  { id: "pb14", label: "2-week well-baby check", category: "Medical", done: false, dueLabel: "2 weeks", notes: "Growth check with GP or paediatrician" },
  { id: "pb15", label: "1-month well-baby check", category: "Medical", done: false, dueLabel: "1 month" },
  { id: "pb16", label: "2-month immunisations", category: "Medical", done: false, dueLabel: "2 months", notes: "DTaP, IPV, Hib, PCV, Men-C-ACYW, Rotavirus" },
] as PostBirthTask[];

type LegalCategory = "Legal";
const ALL_CATEGORIES: (TaskCategory | LegalCategory)[] = ["Admin", "Medical", "Family", "Financial", "Other"];
const CATEGORY_LIST: TaskCategory[] = ["Admin", "Medical", "Family", "Financial", "Other"];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load(): PostBirthTask[] {
  if (typeof window === "undefined") return DEFAULT_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_TASKS;
  } catch {
    return DEFAULT_TASKS;
  }
}

function save(tasks: PostBirthTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export default function PostBirthPage() {
  const [tasks, setTasks] = useState<PostBirthTask[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<TaskCategory | "All">("All");

  // New task form
  const [newLabel, setNewLabel] = useState("");
  const [newCat, setNewCat] = useState<TaskCategory>("Other");
  const [newNotes, setNewNotes] = useState("");
  const [newDue, setNewDue] = useState("");

  useEffect(() => { setTasks(load()); }, []);

  const toggle = useCallback((id: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, done: !t.done } : t);
      save(next);
      return next;
    });
  }, []);

  const addTask = useCallback(() => {
    if (!newLabel.trim()) return;
    const task: PostBirthTask = {
      id: uid(),
      label: newLabel.trim(),
      category: newCat,
      done: false,
      notes: newNotes.trim() || undefined,
      dueLabel: newDue.trim() || undefined,
    };
    setTasks(prev => {
      const next = [...prev, task];
      save(next);
      return next;
    });
    setNewLabel(""); setNewNotes(""); setNewDue(""); setNewCat("Other");
    setShowAdd(false);
  }, [newLabel, newCat, newNotes, newDue]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      save(next);
      return next;
    });
    setDeleteId(null);
  }, []);

  const resetAll = useCallback(() => {
    setTasks(DEFAULT_TASKS);
    save(DEFAULT_TASKS);
  }, []);

  const visibleTasks = filterCat === "All" ? tasks : tasks.filter(t => t.category === filterCat);
  const totalDone = tasks.filter(t => t.done).length;
  const visibleDone = visibleTasks.filter(t => t.done).length;

  const pendingTasks = visibleTasks.filter(t => !t.done);
  const doneTasks = visibleTasks.filter(t => t.done);

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <ClipboardList size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Post-Birth Tasks</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {totalDone} of {tasks.length} done · admin, medical &amp; more
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 dark:bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${tasks.length > 0 ? (totalDone / tasks.length) * 100 : 0}%` }}
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {(["All", ...CATEGORY_LIST] as (TaskCategory | "All")[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                filterCat === cat
                  ? cat === "All"
                    ? "bg-blue-600 text-white border-blue-600"
                    : CATEGORY_COLORS[cat as TaskCategory] + " border-current"
                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">New Task</h2>
              <button onClick={() => setShowAdd(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Task *</label>
              <input
                type="text"
                placeholder="What needs to get done?"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTask()}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-[16px]"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Category</label>
                <select
                  value={newCat}
                  onChange={e => setNewCat(e.target.value as TaskCategory)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-[16px]"
                >
                  {CATEGORY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">When / Due</label>
                <input
                  type="text"
                  placeholder="e.g. Within 30 days"
                  value={newDue}
                  onChange={e => setNewDue(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-[16px]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Notes (optional)</label>
              <input
                type="text"
                placeholder="Contact, link, reminder…"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-[16px]"
              />
            </div>
            <button
              onClick={addTask}
              disabled={!newLabel.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            >
              Add Task
            </button>
          </div>
        )}

        {/* Pending tasks */}
        {pendingTasks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-1">
              To Do · {pendingTasks.length}
            </p>
            <div className="space-y-1.5">
              {pendingTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggle}
                  onDelete={id => setDeleteId(deleteId === id ? null : id)}
                  onConfirmDelete={deleteTask}
                  deleteId={deleteId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Done tasks */}
        {doneTasks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-1">
              Done · {doneTasks.length}
            </p>
            <div className="space-y-1.5 opacity-60">
              {doneTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggle}
                  onDelete={id => setDeleteId(deleteId === id ? null : id)}
                  onConfirmDelete={deleteTask}
                  deleteId={deleteId}
                />
              ))}
            </div>
          </div>
        )}

        {visibleTasks.length === 0 && (
          <div className="text-center py-12 text-neutral-400">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No tasks in this category</p>
          </div>
        )}

        {/* Reset */}
        <div className="flex justify-center pb-4">
          <button
            onClick={resetAll}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </PageTransition>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onConfirmDelete,
  deleteId,
}: {
  task: PostBirthTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  deleteId: string | null;
}) {
  return (
    <div
      className={clsx(
        "bg-white dark:bg-neutral-800 rounded-xl border transition-all",
        task.done
          ? "border-neutral-100 dark:border-neutral-700"
          : "border-neutral-200 dark:border-neutral-700"
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          onClick={() => onToggle(task.id)}
          className={clsx(
            "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
            task.done
              ? "bg-blue-400 border-blue-400"
              : "border-neutral-300 dark:border-neutral-600 hover:border-blue-400"
          )}
          aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        >
          {task.done && <span className="text-white text-[10px] font-bold">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={clsx("text-sm font-medium", task.done ? "line-through text-neutral-400 dark:text-neutral-500" : "text-neutral-800 dark:text-neutral-200")}>
            {task.label}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={clsx("text-xs px-1.5 py-0.5 rounded-full font-medium", CATEGORY_COLORS[task.category as TaskCategory] ?? CATEGORY_COLORS.Other)}>
              {task.category}
            </span>
            {task.dueLabel && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">{task.dueLabel}</span>
            )}
          </div>
          {task.notes && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{task.notes}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="p-2.5 text-neutral-300 hover:text-red-500 dark:text-neutral-600 dark:hover:text-red-400 transition-colors rounded-lg shrink-0"
          aria-label="Delete task"
        >
          <Trash2 size={15} />
        </button>
      </div>
      {deleteId === task.id && (
        <div className="flex gap-2 px-4 pb-3 pt-0">
          <button
            onClick={() => onConfirmDelete(task.id)}
            className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="px-3 py-1.5 text-neutral-500 text-xs hover:text-neutral-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
