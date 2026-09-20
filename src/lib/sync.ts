import type { Client, Measurement, OutboxItem, Session } from './types';
import {
  enqueueOutbox,
  loadActiveClientId,
  loadClients,
  loadMeasurements,
  loadOutbox,
  loadPhotoMeta,
  loadSessions,
  loadSyncMeta,
  saveActiveClientId,
  saveClients,
  saveMeasurements,
  saveOutbox,
  savePhotoMeta,
  saveSessions,
  saveSyncMeta,
} from './storage';
import { getSupabase, isCloudConfigured } from './supabase';

type RemoteClient = {
  id: string;
  name: string;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type RemoteSession = {
  id: string;
  client_id: string;
  title: string;
  content: string;
  date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type RemoteMeasurement = {
  id: string;
  client_id: string;
  date: string;
  weight_lb: number | null;
  body_fat_pct: number | null;
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  thigh_l: number | null;
  thigh_r: number | null;
  arm_l: number | null;
  arm_r: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function clientToRemote(c: Client): RemoteClient {
  return {
    id: c.id,
    name: c.name,
    notes: c.notes ?? '',
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted_at: c.deletedAt ?? null,
  };
}

function clientFromRemote(r: RemoteClient): Client {
  return {
    id: r.id,
    name: r.name,
    notes: r.notes ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

function sessionToRemote(s: Session): RemoteSession {
  return {
    id: s.id,
    client_id: s.clientId,
    title: s.title,
    content: s.content,
    date: s.date,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
    deleted_at: s.deletedAt ?? null,
  };
}

function sessionFromRemote(r: RemoteSession): Session {
  return {
    id: r.id,
    clientId: r.client_id,
    title: r.title,
    content: r.content,
    date: r.date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

function measurementToRemote(m: Measurement): RemoteMeasurement {
  return {
    id: m.id,
    client_id: m.clientId,
    date: m.date,
    weight_lb: m.weightLb ?? null,
    body_fat_pct: m.bodyFatPct ?? null,
    neck: m.neck ?? null,
    shoulders: m.shoulders ?? null,
    chest: m.chest ?? null,
    waist: m.waist ?? null,
    hips: m.hips ?? null,
    thigh_l: m.thighL ?? null,
    thigh_r: m.thighR ?? null,
    arm_l: m.armL ?? null,
    arm_r: m.armR ?? null,
    notes: m.notes ?? '',
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    deleted_at: m.deletedAt ?? null,
  };
}

function measurementFromRemote(r: RemoteMeasurement): Measurement {
  return {
    id: r.id,
    clientId: r.client_id,
    date: r.date,
    weightLb: r.weight_lb ?? undefined,
    bodyFatPct: r.body_fat_pct ?? undefined,
    neck: r.neck ?? undefined,
    shoulders: r.shoulders ?? undefined,
    chest: r.chest ?? undefined,
    waist: r.waist ?? undefined,
    hips: r.hips ?? undefined,
    thighL: r.thigh_l ?? undefined,
    thighR: r.thigh_r ?? undefined,
    armL: r.arm_l ?? undefined,
    armR: r.arm_r ?? undefined,
    notes: r.notes ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

function lwwMerge<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const prev = map.get(item.id);
    if (!prev || item.updatedAt > prev.updatedAt) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
}

async function pushOutboxItem(item: OutboxItem): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Cloud non configuré');

  if (item.entity === 'client') {
    const row = clientToRemote(item.payload as Client);
    if (item.op === 'delete') {
      const { error } = await sb.from('clients').upsert({
        ...row,
        deleted_at: row.deleted_at || new Date().toISOString(),
      });
      if (error) throw error;
    } else {
      const { error } = await sb.from('clients').upsert(row);
      if (error) throw error;
    }
    return;
  }

  if (item.entity === 'session') {
    const row = sessionToRemote(item.payload as Session);
    if (item.op === 'delete') {
      const { error } = await sb.from('sessions').upsert({
        ...row,
        deleted_at: row.deleted_at || new Date().toISOString(),
      });
      if (error) throw error;
    } else {
      const { error } = await sb.from('sessions').upsert(row);
      if (error) throw error;
    }
    return;
  }

  if (item.entity === 'measurement') {
    const row = measurementToRemote(item.payload as Measurement);
    if (item.op === 'delete') {
      const { error } = await sb.from('measurements').upsert({
        ...row,
        deleted_at: row.deleted_at || new Date().toISOString(),
      });
      if (error) throw error;
    } else {
      const { error } = await sb.from('measurements').upsert(row);
      if (error) throw error;
    }
  }
}

export async function pushOutbox(): Promise<{ pushed: number }> {
  if (!isCloudConfigured || !navigator.onLine) return { pushed: 0 };
  const sb = getSupabase();
  if (!sb) return { pushed: 0 };

  const box = loadOutbox();
  if (box.length === 0) return { pushed: 0 };

  const order = (e: OutboxItem['entity']) =>
    e === 'client' ? 0 : e === 'session' ? 1 : 2;
  const sorted = [...box].sort((a, b) => order(a.entity) - order(b.entity));

  const remaining: OutboxItem[] = [];
  let pushed = 0;
  for (const item of sorted) {
    try {
      await pushOutboxItem(item);
      pushed += 1;
    } catch {
      remaining.push(item);
    }
  }
  saveOutbox(remaining);
  const meta = loadSyncMeta();
  saveSyncMeta({
    ...meta,
    lastPushAt: new Date().toISOString(),
    lastError: remaining.length ? meta.lastError : null,
  });
  return { pushed };
}


function normalizeClientName(name: string): string {
  return name.trim().toLowerCase();
}

function countNonDeleted(
  items: Array<{ clientId: string; deletedAt?: string | null }>,
  clientId: string,
): number {
  return items.filter((x) => x.clientId === clientId && !x.deletedAt).length;
}

/**
 * Merge clients that share the same normalized name after a pull.
 * Winner = most measurements, then sessions, then newest updatedAt.
 * Remaps sessions/measurements/photos; soft-deletes losers; enqueues outbox.
 * Also collapses empty duplicate « Client principal » entries (keep one).
 */
export function consolidateDuplicateClients(): {
  merged: number;
  newActiveId: string | null;
} {
  const clients = loadClients();
  const sessions = loadSessions();
  const measurements = loadMeasurements();
  const photos = loadPhotoMeta();
  const activeId = loadActiveClientId();
  const now = new Date().toISOString();

  const alive = clients.filter((c) => !c.deletedAt);
  const byName = new Map<string, Client[]>();
  for (const c of alive) {
    const key = normalizeClientName(c.name);
    const list = byName.get(key) ?? [];
    list.push(c);
    byName.set(key, list);
  }

  const idMap = new Map<string, string>(); // loser → winner
  let merged = 0;

  for (const [, group] of byName) {
    if (group.length < 2) continue;

    const ranked = [...group].sort((a, b) => {
      const mA = countNonDeleted(measurements, a.id);
      const mB = countNonDeleted(measurements, b.id);
      if (mB !== mA) return mB - mA;
      const sA = countNonDeleted(sessions, a.id);
      const sB = countNonDeleted(sessions, b.id);
      if (sB !== sA) return sB - sA;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    const winner = ranked[0]!;
    for (const loser of ranked.slice(1)) {
      idMap.set(loser.id, winner.id);
      merged += 1;
    }
  }

  if (idMap.size === 0) {
    return { merged: 0, newActiveId: activeId };
  }

  // Remap sessions
  const nextSessions = sessions.map((s) => {
    const winnerId = idMap.get(s.clientId);
    if (!winnerId || s.deletedAt) return s;
    const updated = { ...s, clientId: winnerId, updatedAt: now };
    enqueueOutbox('session', updated.id, 'upsert', updated);
    return updated;
  });

  // Remap measurements
  const nextMeasurements = measurements.map((m) => {
    const winnerId = idMap.get(m.clientId);
    if (!winnerId || m.deletedAt) return m;
    const updated = { ...m, clientId: winnerId, updatedAt: now };
    enqueueOutbox('measurement', updated.id, 'upsert', updated);
    return updated;
  });

  // Remap photos (local only)
  const nextPhotos = photos.map((p) => {
    const winnerId = idMap.get(p.clientId);
    if (!winnerId) return p;
    return { ...p, clientId: winnerId };
  });

  // Soft-delete losers
  const nextClients = clients.map((c) => {
    if (!idMap.has(c.id) || c.deletedAt) return c;
    const deleted = { ...c, deletedAt: now, updatedAt: now };
    enqueueOutbox('client', deleted.id, 'delete', deleted);
    return deleted;
  });

  saveClients(nextClients);
  saveSessions(nextSessions);
  saveMeasurements(nextMeasurements);
  savePhotoMeta(nextPhotos);

  let newActiveId = activeId;
  if (activeId && idMap.has(activeId)) {
    newActiveId = idMap.get(activeId)!;
    saveActiveClientId(newActiveId);
  }

  return { merged, newActiveId };
}

export async function pullRemote(): Promise<{ pulled: boolean }> {
  if (!isCloudConfigured || !navigator.onLine) return { pulled: false };
  const sb = getSupabase();
  if (!sb) return { pulled: false };

  const [cRes, sRes, mRes] = await Promise.all([
    sb.from('clients').select('*'),
    sb.from('sessions').select('*'),
    sb.from('measurements').select('*'),
  ]);

  if (cRes.error) throw cRes.error;
  if (sRes.error) throw sRes.error;
  if (mRes.error) throw mRes.error;

  const remoteClients = ((cRes.data ?? []) as RemoteClient[]).map(clientFromRemote);
  const remoteSessions = ((sRes.data ?? []) as RemoteSession[]).map(sessionFromRemote);
  const remoteMeasurements = ((mRes.data ?? []) as RemoteMeasurement[]).map(
    measurementFromRemote,
  );

  saveClients(lwwMerge(loadClients(), remoteClients));
  saveSessions(lwwMerge(loadSessions(), remoteSessions));
  saveMeasurements(lwwMerge(loadMeasurements(), remoteMeasurements));

  const meta = loadSyncMeta();
  saveSyncMeta({
    ...meta,
    lastPullAt: new Date().toISOString(),
    lastError: null,
  });

  // Merge same-name clients (local empty vs cloud with data) after pull.
  consolidateDuplicateClients();

  return { pulled: true };
}

/** Full sync: push outbox then pull (LWW). Photos stay local. */
export async function fullSync(): Promise<{
  ok: boolean;
  message: string;
  pushed: number;
}> {
  if (!isCloudConfigured) {
    return { ok: false, message: 'Cloud non configuré — données locales seules', pushed: 0 };
  }
  if (!navigator.onLine) {
    return { ok: false, message: 'Hors ligne — sync reportée', pushed: 0 };
  }

  try {
    const { pushed: pushed1 } = await pushOutbox();
    await pullRemote();
    // Flush remaps / soft-deletes from duplicate consolidation.
    const { pushed: pushed2 } = await pushOutbox();
    const pushed = pushed1 + pushed2;
    const meta = loadSyncMeta();
    saveSyncMeta({
      ...meta,
      lastFullSyncAt: new Date().toISOString(),
      lastError: null,
    });
    const sb = getSupabase();
    if (sb) {
      await sb.from('sync_meta').upsert({
        id: 'app',
        last_full_sync_at: new Date().toISOString(),
        note: 'coachpro-2.0',
        updated_at: new Date().toISOString(),
      });
    }
    return {
      ok: true,
      message: pushed ? `Sync OK (${pushed} envoi(s))` : 'Sync OK',
      pushed,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur de sync';
    const meta = loadSyncMeta();
    saveSyncMeta({ ...meta, lastError: msg });
    return { ok: false, message: msg, pushed: 0 };
  }
}

/** Seed outbox with all local structured data (first cloud connect / safety net). */
export function enqueueAllLocalForPush(): void {
  for (const c of loadClients()) {
    enqueueOutbox('client', c.id, c.deletedAt ? 'delete' : 'upsert', c);
  }
  for (const s of loadSessions()) {
    enqueueOutbox('session', s.id, s.deletedAt ? 'delete' : 'upsert', s);
  }
  for (const m of loadMeasurements()) {
    enqueueOutbox('measurement', m.id, m.deletedAt ? 'delete' : 'upsert', m);
  }
}

export function needsDailySafetySync(): boolean {
  const meta = loadSyncMeta();
  if (!meta.lastFullSyncAt) return true;
  const last = new Date(meta.lastFullSyncAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Date.now() - last >= dayMs;
}
