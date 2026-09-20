import type {
  AppBackup,
  AppBackupV1,
  Client,
  Measurement,
  OutboxItem,
  PhotoMeta,
  Session,
  SyncMetaLocal,
} from './types';
import {
  CURRENT_SCHEMA_VERSION,
  PHOTO_DB,
  PHOTO_STORE,
  STORAGE_KEYS,
} from './types';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadClients(): Client[] {
  return readJson<Client[]>(STORAGE_KEYS.clients, []);
}

export function saveClients(clients: Client[]): void {
  writeJson(STORAGE_KEYS.clients, clients);
}

export function loadSessions(): Session[] {
  return readJson<Session[]>(STORAGE_KEYS.sessions, []);
}

export function saveSessions(sessions: Session[]): void {
  writeJson(STORAGE_KEYS.sessions, sessions);
}

export function loadMeasurements(): Measurement[] {
  return readJson<Measurement[]>(STORAGE_KEYS.measurements, []);
}

export function saveMeasurements(measurements: Measurement[]): void {
  writeJson(STORAGE_KEYS.measurements, measurements);
}

export function loadPhotoMeta(): PhotoMeta[] {
  return readJson<PhotoMeta[]>(STORAGE_KEYS.photoMeta, []);
}

export function savePhotoMeta(meta: PhotoMeta[]): void {
  writeJson(STORAGE_KEYS.photoMeta, meta);
}

export function loadActiveClientId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.activeClientId);
}

export function saveActiveClientId(id: string | null): void {
  if (id) localStorage.setItem(STORAGE_KEYS.activeClientId, id);
  else localStorage.removeItem(STORAGE_KEYS.activeClientId);
}

export function loadOutbox(): OutboxItem[] {
  return readJson<OutboxItem[]>(STORAGE_KEYS.outbox, []);
}

export function saveOutbox(items: OutboxItem[]): void {
  writeJson(STORAGE_KEYS.outbox, items);
}

export function loadSyncMeta(): SyncMetaLocal {
  return readJson<SyncMetaLocal>(STORAGE_KEYS.syncMeta, {
    lastPullAt: null,
    lastPushAt: null,
    lastFullSyncAt: null,
    lastError: null,
  });
}

export function saveSyncMeta(meta: SyncMetaLocal): void {
  writeJson(STORAGE_KEYS.syncMeta, meta);
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePhotoBlob(id: string, dataUrl: string): Promise<void> {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).put({ id, dataUrl });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getPhotoBlob(id: string): Promise<string | null> {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readonly');
    const req = tx.objectStore(PHOTO_STORE).get(id);
    req.onsuccess = () => {
      db.close();
      resolve(req.result?.dataUrl ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function deletePhotoBlob(id: string): Promise<void> {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getAllPhotoBlobs(): Promise<Record<string, string>> {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readonly');
    const req = tx.objectStore(PHOTO_STORE).getAll();
    req.onsuccess = () => {
      db.close();
      const map: Record<string, string> = {};
      for (const row of req.result as Array<{ id: string; dataUrl: string }>) {
        map[row.id] = row.dataUrl;
      }
      resolve(map);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function clearAllPhotoBlobs(): Promise<void> {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('fr-CA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function autoSessionTitle(date: string, content: string): string {
  const excerpt = content.trim().replace(/\s+/g, ' ').slice(0, 48);
  const dateLabel = formatDateFr(date);
  if (excerpt) {
    return `${dateLabel} — ${excerpt}${content.trim().length > 48 ? '…' : ''}`;
  }
  return `Séance du ${dateLabel}`;
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Migrate v1 (single implicit client) → v2 multi-client */
export function ensureSchemaMigrated(): void {
  const ver = Number(localStorage.getItem(STORAGE_KEYS.schemaVersion) || '0');
  if (ver >= CURRENT_SCHEMA_VERSION) {
    // Ensure at least one active client exists
    const clients = loadClients().filter((c) => !c.deletedAt);
    if (clients.length === 0) {
      const now = new Date().toISOString();
      const c: Client = {
        id: newId(),
        name: 'Client principal',
        notes: '',
        createdAt: now,
        updatedAt: now,
      };
      saveClients([c]);
      saveActiveClientId(c.id);
    } else if (!loadActiveClientId()) {
      saveActiveClientId(clients[0].id);
    }
    return;
  }

  const now = new Date().toISOString();
  let clients = loadClients();
  let defaultId = loadActiveClientId();

  if (clients.length === 0) {
    const c: Client = {
      id: newId(),
      name: 'Client principal',
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    clients = [c];
    defaultId = c.id;
    saveClients(clients);
  } else if (!defaultId) {
    defaultId = clients[0].id;
  }

  const sessions = loadSessions().map((s) => ({
    ...s,
    clientId: s.clientId || defaultId!,
  }));
  const measurements = loadMeasurements().map((m) => ({
    ...m,
    clientId: m.clientId || defaultId!,
  }));
  const photos = loadPhotoMeta().map((p) => ({
    ...p,
    clientId: p.clientId || defaultId!,
  }));

  saveSessions(sessions);
  saveMeasurements(measurements);
  savePhotoMeta(photos);
  saveActiveClientId(defaultId);
  localStorage.setItem(STORAGE_KEYS.schemaVersion, String(CURRENT_SCHEMA_VERSION));
}

export function enqueueOutbox(
  entity: OutboxItem['entity'],
  entityId: string,
  op: OutboxItem['op'],
  payload: unknown,
): void {
  const now = new Date().toISOString();
  const box = loadOutbox();
  // Coalesce: keep only latest op per entity+id
  const filtered = box.filter((i) => !(i.entity === entity && i.entityId === entityId));
  filtered.push({
    id: newId(),
    entity,
    entityId,
    op,
    payload,
    updatedAt: now,
    createdAt: now,
  });
  saveOutbox(filtered);
}

export async function buildBackup(clientId?: string | null): Promise<AppBackup> {
  const blobs = await getAllPhotoBlobs();
  const clients = loadClients().filter((c) => !c.deletedAt);
  const sessions = loadSessions().filter((s) => !s.deletedAt);
  const measurements = loadMeasurements().filter((m) => !m.deletedAt);
  const meta = loadPhotoMeta();

  const filterId = clientId || null;
  const scopedClients = filterId ? clients.filter((c) => c.id === filterId) : clients;
  const scopedSessions = filterId
    ? sessions.filter((s) => s.clientId === filterId)
    : sessions;
  const scopedMeasurements = filterId
    ? measurements.filter((m) => m.clientId === filterId)
    : measurements;
  const scopedPhotos = filterId ? meta.filter((p) => p.clientId === filterId) : meta;

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    activeClientId: loadActiveClientId(),
    clients: scopedClients,
    sessions: scopedSessions,
    measurements: scopedMeasurements,
    photos: scopedPhotos.map((m) => ({
      ...m,
      dataUrl: blobs[m.id] ?? '',
    })),
  };
}

export async function restoreBackup(
  backup: AppBackup | AppBackupV1,
  mode: 'replace' | 'merge' = 'replace',
): Promise<void> {
  if (!backup || (backup.version !== 1 && backup.version !== 2)) {
    throw new Error('Format de sauvegarde non reconnu');
  }

  const now = new Date().toISOString();
  let clients: Client[];
  let sessions: Session[];
  let measurements: Measurement[];
  let photos: Array<PhotoMeta & { dataUrl: string }>;
  let activeId: string | null = null;

  if (backup.version === 1) {
    const defaultClient: Client = {
      id: newId(),
      name: 'Client importé',
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    clients = [defaultClient];
    activeId = defaultClient.id;
    sessions = (backup.sessions ?? []).map((s) => ({
      ...s,
      clientId: defaultClient.id,
    }));
    measurements = (backup.measurements ?? []).map((m) => ({
      ...m,
      clientId: defaultClient.id,
    }));
    photos = (backup.photos ?? []).map((p) => ({
      ...p,
      clientId: defaultClient.id,
    }));
  } else {
    clients = backup.clients ?? [];
    sessions = backup.sessions ?? [];
    measurements = backup.measurements ?? [];
    photos = backup.photos ?? [];
    activeId = backup.activeClientId;
  }

  if (mode === 'replace') {
    saveClients(clients);
    saveSessions(sessions);
    saveMeasurements(measurements);
    const meta = photos.map(({ dataUrl: _d, ...m }) => m);
    savePhotoMeta(meta);
    await clearAllPhotoBlobs();
    for (const photo of photos) {
      if (photo.dataUrl) await savePhotoBlob(photo.id, photo.dataUrl);
    }
    if (activeId) saveActiveClientId(activeId);
    else if (clients[0]) saveActiveClientId(clients[0].id);
  } else {
    const byId = <T extends { id: string }>(arr: T[]) => {
      const m = new Map(arr.map((x) => [x.id, x]));
      return m;
    };
    const cMap = byId(loadClients());
    for (const c of clients) cMap.set(c.id, c);
    const sMap = byId(loadSessions());
    for (const s of sessions) sMap.set(s.id, s);
    const mMap = byId(loadMeasurements());
    for (const m of measurements) mMap.set(m.id, m);
    const pMeta = loadPhotoMeta();
    const pMap = byId(pMeta);
    for (const p of photos) {
      const { dataUrl, ...meta } = p;
      pMap.set(meta.id, meta);
      if (dataUrl) await savePhotoBlob(meta.id, dataUrl);
    }
    saveClients([...cMap.values()]);
    saveSessions([...sMap.values()]);
    saveMeasurements([...mMap.values()]);
    savePhotoMeta([...pMap.values()]);
    if (activeId) saveActiveClientId(activeId);
  }

  localStorage.setItem(STORAGE_KEYS.schemaVersion, String(CURRENT_SCHEMA_VERSION));
  // Queue full push after restore
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
