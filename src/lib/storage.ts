import type { AppBackup, Measurement, PhotoMeta, Session } from './types';
import { PHOTO_DB, PHOTO_STORE, STORAGE_KEYS } from './types';

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

export async function buildBackup(): Promise<AppBackup> {
  const blobs = await getAllPhotoBlobs();
  const meta = loadPhotoMeta();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: loadSessions(),
    measurements: loadMeasurements(),
    photos: meta.map((m) => ({
      ...m,
      dataUrl: blobs[m.id] ?? '',
    })),
  };
}

export async function restoreBackup(backup: AppBackup): Promise<void> {
  if (!backup || backup.version !== 1) {
    throw new Error('Format de sauvegarde non reconnu');
  }
  saveSessions(backup.sessions ?? []);
  saveMeasurements(backup.measurements ?? []);
  const meta = (backup.photos ?? []).map(({ dataUrl: _d, ...m }) => m);
  savePhotoMeta(meta);
  await clearAllPhotoBlobs();
  for (const photo of backup.photos ?? []) {
    if (photo.dataUrl) {
      await savePhotoBlob(photo.id, photo.dataUrl);
    }
  }
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
