import type { AppStore, NewbornLogEvent } from "@/types";

type WithId = { id: string };

/**
 * Merge two arrays by ID: all items from both sides, no duplicates.
 * Local version wins for items that exist in both (local changes are authoritative).
 */
function mergeById<T extends WithId>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  // Add remote first (lower priority)
  for (const item of remote) map.set(item.id, item);
  // Overwrite with local (higher priority)
  for (const item of local) map.set(item.id, item);
  return Array.from(map.values());
}

/**
 * Merge newborn events: union by id, sorted by timestamp.
 */
export function mergeNewbornEvents(
  local: NewbornLogEvent[],
  remote: NewbornLogEvent[]
): NewbornLogEvent[] {
  const map = new Map<string, NewbornLogEvent>();
  for (const e of remote) map.set(e.id, e);
  for (const e of local) map.set(e.id, e);
  return Array.from(map.values()).sort((a, b) => {
    const ta = "timestamp" in a ? a.timestamp : "startTime" in a ? a.startTime : "";
    const tb = "timestamp" in b ? b.timestamp : "startTime" in b ? b.startTime : "";
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
}

/**
 * Merge two AppStore snapshots.
 * - All ID-keyed arrays: union (local wins on conflict)
 * - birthPlan, registryUrl: take local (user's current intent)
 * - checklistSkipped, checklistAlreadyHave, etc.: union of string arrays
 */
export function mergeStores(local: AppStore, remote: AppStore): AppStore {
  return {
    ...local,
    items: mergeById(local.items, remote.items ?? []),
    classes: mergeById(local.classes, remote.classes ?? []),
    materials: mergeById(local.materials, remote.materials ?? []),
    notes: mergeById(local.notes, remote.notes ?? []),
    appointments: mergeById(local.appointments, remote.appointments ?? []),
    contacts: mergeById(local.contacts, remote.contacts ?? []),
    hospitalBag: mergeById(local.hospitalBag, remote.hospitalBag ?? []),
    // Newborn events (if present in store)
    newbornEvents: mergeNewbornEvents(
      local.newbornEvents ?? [],
      remote.newbornEvents ?? []
    ),
    // Checklist boolean ID lists: union
    checklistSkipped: Array.from(new Set([
      ...(local.checklistSkipped ?? []),
      ...(remote.checklistSkipped ?? []),
    ])),
    checklistAlreadyHave: Array.from(new Set([
      ...(local.checklistAlreadyHave ?? []),
      ...(remote.checklistAlreadyHave ?? []),
    ])),
    hospitalChecklistPacked: Array.from(new Set([
      ...(local.hospitalChecklistPacked ?? []),
      ...(remote.hospitalChecklistPacked ?? []),
    ])),
    hospitalChecklistSkipped: Array.from(new Set([
      ...(local.hospitalChecklistSkipped ?? []),
      ...(remote.hospitalChecklistSkipped ?? []),
    ])),
    // Contractions: transient, keep local
    contractions: local.contractions,
    // Birth plan and scalar: local wins
    birthPlan: local.birthPlan,
    registryUrl: local.registryUrl,
  };
}
