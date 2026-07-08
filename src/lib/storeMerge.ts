import type { AppStore, Medication, NewbornLogEvent } from "@/types";

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
 * When an id exists on both sides (e.g. one phone starts a sleep session and
 * another phone later ends it), the copy with the newer `updatedAt` wins so a
 * remote edit isn't clobbered by a stale local copy. Events without
 * `updatedAt` (pre-migration data) fall back to local-wins.
 */
export function mergeNewbornEvents(
  local: NewbornLogEvent[],
  remote: NewbornLogEvent[]
): NewbornLogEvent[] {
  const map = new Map<string, NewbornLogEvent>();
  for (const e of remote) map.set(e.id, e);
  for (const e of local) {
    const existing = map.get(e.id);
    if (existing && existing.updatedAt && e.updatedAt) {
      map.set(e.id, new Date(e.updatedAt) >= new Date(existing.updatedAt) ? e : existing);
    } else {
      map.set(e.id, e);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = "timestamp" in a ? a.timestamp : "startTime" in a ? a.startTime : "";
    const tb = "timestamp" in b ? b.timestamp : "startTime" in b ? b.startTime : "";
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
}

/**
 * Merge medications by id: newest `updatedAt` wins per entry, so e.g.
 * changing a medication's hours on one phone reliably propagates to the
 * other instead of being silently kept-stale by whichever device merges
 * last (unlike plain mergeById's blanket local-wins). Entries without
 * `updatedAt` on either side (pre-migration data) fall back to local-wins.
 */
function mergeMedications(local: Medication[], remote: Medication[]): Medication[] {
  const map = new Map<string, Medication>();
  for (const m of remote) map.set(m.id, m);
  for (const m of local) {
    const existing = map.get(m.id);
    if (existing && existing.updatedAt && m.updatedAt) {
      map.set(m.id, new Date(m.updatedAt) >= new Date(existing.updatedAt) ? m : existing);
    } else {
      map.set(m.id, m);
    }
  }
  return Array.from(map.values());
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

  const localRemTime = new Date(local.reminderSettings?.updatedAt ?? 0).getTime() || 0;
  const remoteRemTime = new Date(remote.reminderSettings?.updatedAt ?? 0).getTime() || 0;

  const localNursingTime = new Date(local.newbornActiveNursingUpdatedAt ?? 0).getTime() || 0;
  const remoteNursingTime = new Date(remote.newbornActiveNursingUpdatedAt ?? 0).getTime() || 0;
  const nursingRemoteWins = remoteNursingTime > localNursingTime;

  const localBirthDateTime = new Date(local.newbornBabyBirthDateUpdatedAt ?? 0).getTime() || 0;
  const remoteBirthDateTime = new Date(remote.newbornBabyBirthDateUpdatedAt ?? 0).getTime() || 0;
  // On a tie (neither side has re-saved since this field started being
  // timestamped, e.g. right after this fix ships) prefer whichever side has
  // a value set, so a set birth date still propagates to an unset device.
  const birthDateRemoteWins = remoteBirthDateTime !== localBirthDateTime
    ? remoteBirthDateTime > localBirthDateTime
    : !local.newbornBabyBirthDate && !!remote.newbornBabyBirthDate;

  return {
    ...local,
    items: dropTombstoned(mergeById(local.items, remote.items ?? []), deletedIds),
    classes: dropTombstoned(mergeById(local.classes, remote.classes ?? []), deletedIds),
    materials: dropTombstoned(mergeById(local.materials, remote.materials ?? []), deletedIds),
    notes: dropTombstoned(mergeById(local.notes, remote.notes ?? []), deletedIds),
    appointments: dropTombstoned(mergeById(local.appointments, remote.appointments ?? []), deletedIds),
    contacts: dropTombstoned(mergeById(local.contacts, remote.contacts ?? []), deletedIds),
    hospitalBag: dropTombstoned(mergeById(local.hospitalBag, remote.hospitalBag ?? []), deletedIds),
    postBirthTasks: dropTombstoned(mergeById(local.postBirthTasks ?? [], remote.postBirthTasks ?? []), deletedIds),
    medications: dropTombstoned(mergeMedications(local.medications ?? [], remote.medications ?? []), deletedIds),
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
    // Birth date: newest edit wins, same rule as the nursing timer — otherwise
    // whichever device set it first "wins" forever and corrections on other
    // devices never propagate.
    newbornBabyBirthDate: birthDateRemoteWins
      ? remote.newbornBabyBirthDate
      : local.newbornBabyBirthDate,
    newbornBabyBirthDateUpdatedAt: birthDateRemoteWins
      ? remote.newbornBabyBirthDateUpdatedAt
      : local.newbornBabyBirthDateUpdatedAt,
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
    // Contractions: union by id, minus tombstones — same as any other entity
    // list (previously "local wins" here silently discarded remote contraction
    // history on every pull).
    contractions: dropTombstoned(mergeById(local.contractions ?? [], remote.contractions ?? []), deletedIds),
    // Birth plan: newest edit wins
    birthPlan: localBpTime >= remoteBpTime ? local.birthPlan : remote.birthPlan,
    // Reminder settings (e.g. med interval): newest edit wins, same as birth plan
    reminderSettings: remote.reminderSettings && remoteRemTime > localRemTime
      ? remote.reminderSettings
      : local.reminderSettings,
    // Active nursing timer: newest start/finish/cancel wins so it shows live
    // on other devices, and a finish/cancel isn't clobbered by a stale copy.
    newbornActiveNursing: nursingRemoteWins
      ? (remote.newbornActiveNursing ?? null)
      : (local.newbornActiveNursing ?? null),
    newbornActiveNursingUpdatedAt: nursingRemoteWins
      ? remote.newbornActiveNursingUpdatedAt
      : local.newbornActiveNursingUpdatedAt,
    registryUrl: local.registryUrl || remote.registryUrl || "",
  };
}
