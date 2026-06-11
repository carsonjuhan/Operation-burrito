import type { AppStore, NewbornLogEvent } from "@/types";

type WithId = { id: string };

/** Tombstones older than this are purged during merge. */
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
 * Union two tombstone maps (newest deletedAt wins per id), purging entries
 * older than TOMBSTONE_TTL_MS.
 */
function mergeTombstones(
  local: Record<string, string> = {},
  remote: Record<string, string> = {}
): Record<string, string> {
  const merged: Record<string, string> = {};
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  for (const src of [remote, local]) {
    for (const [id, deletedAt] of Object.entries(src)) {
      const t = new Date(deletedAt).getTime();
      if (isNaN(t) || t < cutoff) continue;
      if (!merged[id] || new Date(merged[id]).getTime() < t) merged[id] = deletedAt;
    }
  }
  return merged;
}

function dropTombstoned<T extends WithId>(arr: T[], tombstones: Record<string, string>): T[] {
  return arr.filter((item) => !tombstones[item.id]);
}

/**
 * Merge two AppStore snapshots.
 * - All ID-keyed arrays: union (local wins on conflict), minus tombstoned ids
 * - deletedIds: union of both sides' tombstones — deletes propagate
 * - birthPlan: newest updatedAt wins (not blanket local-wins)
 * - checklistSkipped, checklistAlreadyHave, etc.: union of string arrays
 */
export function mergeStores(local: AppStore, remote: AppStore): AppStore {
  const deletedIds = mergeTombstones(local.deletedIds, remote.deletedIds);

  const localBpTime = new Date(local.birthPlan?.updatedAt ?? 0).getTime() || 0;
  const remoteBpTime = new Date(remote.birthPlan?.updatedAt ?? 0).getTime() || 0;

  return {
    ...local,
    items: dropTombstoned(mergeById(local.items, remote.items ?? []), deletedIds),
    classes: dropTombstoned(mergeById(local.classes, remote.classes ?? []), deletedIds),
    materials: dropTombstoned(mergeById(local.materials, remote.materials ?? []), deletedIds),
    notes: dropTombstoned(mergeById(local.notes, remote.notes ?? []), deletedIds),
    appointments: dropTombstoned(mergeById(local.appointments, remote.appointments ?? []), deletedIds),
    contacts: dropTombstoned(mergeById(local.contacts, remote.contacts ?? []), deletedIds),
    hospitalBag: dropTombstoned(mergeById(local.hospitalBag, remote.hospitalBag ?? []), deletedIds),
    deletedIds,
    // Newborn events: append-only union (tracker has its own delete semantics
    // via tombstones too — a deleted log event's id lands in deletedIds)
    newbornEvents: dropTombstoned(
      mergeNewbornEvents(local.newbornEvents ?? [], remote.newbornEvents ?? []),
      deletedIds
    ),
    newbornBabyName:
      local.newbornBabyName && local.newbornBabyName !== "Baby"
        ? local.newbornBabyName
        : remote.newbornBabyName ?? local.newbornBabyName,
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
    postBirthChecked: Array.from(new Set([
      ...(local.postBirthChecked ?? []),
      ...(remote.postBirthChecked ?? []),
    ])),
    // Contractions: transient, keep local
    contractions: local.contractions,
    // Birth plan: newest edit wins
    birthPlan: localBpTime >= remoteBpTime ? local.birthPlan : remote.birthPlan,
    registryUrl: local.registryUrl || remote.registryUrl || "",
  };
}
