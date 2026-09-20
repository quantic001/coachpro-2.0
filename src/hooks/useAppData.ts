import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Client, Measurement, PhotoMeta, Session, SyncMetaLocal } from '../lib/types';
import {
  autoSessionTitle,
  deletePhotoBlob,
  enqueueOutbox,
  ensureSchemaMigrated,
  getPhotoBlob,
  loadActiveClientId,
  loadClients,
  loadMeasurements,
  loadOutbox,
  loadPhotoMeta,
  loadSessions,
  loadSyncMeta,
  newId,
  saveActiveClientId,
  saveClients,
  saveMeasurements,
  savePhotoBlob,
  savePhotoMeta,
  saveSessions,
  todayISO,
} from '../lib/storage';
import { isCloudConfigured } from '../lib/supabase';
import {
  enqueueAllLocalForPush,
  fullSync,
  needsDailySafetySync,
  pushOutbox,
} from '../lib/sync';

function persistClients(all: Client[]) {
  saveClients(all);
  return all.filter((c) => !c.deletedAt);
}

function persistSessions(all: Session[]) {
  saveSessions(all);
  return all.filter((s) => !s.deletedAt);
}

function persistMeasurements(all: Measurement[]) {
  saveMeasurements(all);
  return all.filter((m) => !m.deletedAt);
}

export function useAppData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [photoMeta, setPhotoMeta] = useState<PhotoMeta[]>([]);
  const [syncMeta, setSyncMeta] = useState<SyncMetaLocal>(loadSyncMeta());
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const syncingRef = useRef(false);
  const activeRef = useRef<string | null>(null);

  const reload = useCallback(() => {
    ensureSchemaMigrated();
    setClients(loadClients().filter((c) => !c.deletedAt));
    const aid = loadActiveClientId();
    setActiveClientIdState(aid);
    activeRef.current = aid;
    setSessions(loadSessions().filter((s) => !s.deletedAt));
    setMeasurements(loadMeasurements().filter((m) => !m.deletedAt));
    setPhotoMeta(loadPhotoMeta());
    setSyncMeta(loadSyncMeta());
  }, []);

  const runSync = useCallback(
    async (reason: 'manual' | 'online' | 'daily' | 'change' = 'manual') => {
      if (!isCloudConfigured || !navigator.onLine || syncingRef.current) return;
      syncingRef.current = true;
      try {
        if (reason === 'manual' || reason === 'daily' || reason === 'online') {
          const res = await fullSync();
          setSyncStatus(res.message);
          reload();
        } else {
          await pushOutbox();
          setSyncMeta(loadSyncMeta());
        }
      } finally {
        syncingRef.current = false;
      }
    },
    [reload],
  );

  useEffect(() => {
    ensureSchemaMigrated();
    reload();
    setReady(true);

    if (isCloudConfigured && navigator.onLine) {
      if (needsDailySafetySync()) {
        enqueueAllLocalForPush();
        void runSync('daily');
      } else if (loadOutbox().length > 0) {
        void runSync('change');
      }
    }

    const onOnline = () => {
      void runSync('online');
    };
    window.addEventListener('online', onOnline);

    const dailyTimer = window.setInterval(
      () => {
        if (needsDailySafetySync()) {
          enqueueAllLocalForPush();
          void runSync('daily');
        }
      },
      60 * 60 * 1000,
    );

    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(dailyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveClientId = useCallback((id: string) => {
    saveActiveClientId(id);
    setActiveClientIdState(id);
    activeRef.current = id;
  }, []);

  const createClient = useCallback(
    (name: string, notes = '') => {
      const now = new Date().toISOString();
      const client: Client = {
        id: newId(),
        name: name.trim() || 'Nouveau client',
        notes,
        createdAt: now,
        updatedAt: now,
      };
      const all = [...loadClients().filter((c) => c.id !== client.id), client];
      setClients(persistClients(all));
      enqueueOutbox('client', client.id, 'upsert', client);
      saveActiveClientId(client.id);
      setActiveClientIdState(client.id);
      activeRef.current = client.id;
      void runSync('change');
      return client;
    },
    [runSync],
  );

  const renameClient = useCallback(
    (id: string, name: string) => {
      const now = new Date().toISOString();
      const all = loadClients().map((c) =>
        c.id === id ? { ...c, name: name.trim() || c.name, updatedAt: now } : c,
      );
      setClients(persistClients(all));
      const updated = all.find((c) => c.id === id);
      if (updated) enqueueOutbox('client', id, 'upsert', updated);
      void runSync('change');
    },
    [runSync],
  );

  const deleteClient = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      const allClients = loadClients().map((c) =>
        c.id === id ? { ...c, deletedAt: now, updatedAt: now } : c,
      );
      setClients(persistClients(allClients));
      const deleted = allClients.find((c) => c.id === id);
      if (deleted) enqueueOutbox('client', id, 'delete', deleted);

      const allSessions = loadSessions().map((s) =>
        s.clientId === id ? { ...s, deletedAt: now, updatedAt: now } : s,
      );
      setSessions(persistSessions(allSessions));
      for (const s of allSessions.filter((x) => x.clientId === id)) {
        enqueueOutbox('session', s.id, 'delete', s);
      }

      const allMeas = loadMeasurements().map((m) =>
        m.clientId === id ? { ...m, deletedAt: now, updatedAt: now } : m,
      );
      setMeasurements(persistMeasurements(allMeas));
      for (const m of allMeas.filter((x) => x.clientId === id)) {
        enqueueOutbox('measurement', m.id, 'delete', m);
      }

      const photos = loadPhotoMeta();
      const keep = photos.filter((p) => p.clientId !== id);
      const remove = photos.filter((p) => p.clientId === id);
      savePhotoMeta(keep);
      setPhotoMeta(keep);
      void Promise.all(remove.map((p) => deletePhotoBlob(p.id)));

      const remaining = allClients.filter((c) => !c.deletedAt);
      if (activeRef.current === id) {
        const nextId = remaining[0]?.id ?? null;
        saveActiveClientId(nextId);
        setActiveClientIdState(nextId);
        activeRef.current = nextId;
      }
      void runSync('change');
    },
    [runSync],
  );

  const requireClientId = useCallback((): string => {
    if (activeRef.current) return activeRef.current;
    const id = loadActiveClientId();
    if (id) {
      activeRef.current = id;
      return id;
    }
    const c = createClient('Client principal');
    return c.id;
  }, [createClient]);

  const upsertSession = useCallback(
    (input: {
      id?: string;
      title: string;
      content: string;
      date: string;
      clientId?: string;
    }): Session => {
      const now = new Date().toISOString();
      const clientId = input.clientId || requireClientId();
      const title =
        input.title.trim() || autoSessionTitle(input.date, input.content);
      const byId = new Map(loadSessions().map((s) => [s.id, s]));
      let saved: Session;
      if (input.id && byId.has(input.id)) {
        const prev = byId.get(input.id)!;
        saved = {
          ...prev,
          title,
          content: input.content,
          date: input.date,
          clientId,
          updatedAt: now,
          deletedAt: null,
        };
      } else {
        saved = {
          id: input.id || newId(),
          clientId,
          title,
          content: input.content,
          date: input.date,
          createdAt: now,
          updatedAt: now,
        };
      }
      byId.set(saved.id, saved);
      setSessions(persistSessions([...byId.values()]));
      enqueueOutbox('session', saved.id, 'upsert', saved);
      void runSync('change');
      return saved;
    },
    [requireClientId, runSync],
  );

  const deleteSession = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      const all = loadSessions().map((s) =>
        s.id === id ? { ...s, deletedAt: now, updatedAt: now } : s,
      );
      setSessions(persistSessions(all));
      const deleted = all.find((s) => s.id === id);
      if (deleted) enqueueOutbox('session', id, 'delete', deleted);
      void runSync('change');
    },
    [runSync],
  );

  const upsertMeasurement = useCallback(
    (
      input: Omit<Measurement, 'id' | 'createdAt' | 'updatedAt' | 'clientId'> & {
        id?: string;
        clientId?: string;
      },
    ): Measurement => {
      const now = new Date().toISOString();
      const clientId = input.clientId || requireClientId();
      const byId = new Map(loadMeasurements().map((m) => [m.id, m]));
      let saved: Measurement;
      if (input.id && byId.has(input.id)) {
        const prev = byId.get(input.id)!;
        saved = {
          ...prev,
          ...input,
          clientId,
          updatedAt: now,
          deletedAt: null,
        };
      } else {
        const { id: _id, ...rest } = input;
        saved = {
          id: input.id || newId(),
          clientId,
          ...rest,
          createdAt: now,
          updatedAt: now,
        };
      }
      byId.set(saved.id, saved);
      const all = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
      setMeasurements(persistMeasurements(all));
      enqueueOutbox('measurement', saved.id, 'upsert', saved);
      void runSync('change');
      return saved;
    },
    [requireClientId, runSync],
  );

  const deleteMeasurement = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      const all = loadMeasurements().map((m) =>
        m.id === id ? { ...m, deletedAt: now, updatedAt: now } : m,
      );
      setMeasurements(persistMeasurements(all));
      const deleted = all.find((m) => m.id === id);
      if (deleted) enqueueOutbox('measurement', id, 'delete', deleted);
      void runSync('change');
    },
    [runSync],
  );

  const addPhoto = useCallback(
    async (file: File, label: string, date: string, clientId?: string) => {
      const cid = clientId || requireClientId();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const meta: PhotoMeta = {
        id: newId(),
        clientId: cid,
        date: date || todayISO(),
        label: label.trim() || 'Photo',
        createdAt: new Date().toISOString(),
        mimeType: file.type || 'image/jpeg',
      };
      await savePhotoBlob(meta.id, dataUrl);
      const next = [meta, ...loadPhotoMeta().filter((p) => p.id !== meta.id)];
      savePhotoMeta(next);
      setPhotoMeta(next);
      return meta;
    },
    [requireClientId],
  );

  const removePhoto = useCallback(async (id: string) => {
    await deletePhotoBlob(id);
    const next = loadPhotoMeta().filter((p) => p.id !== id);
    savePhotoMeta(next);
    setPhotoMeta(next);
  }, []);

  const loadPhoto = useCallback((id: string) => getPhotoBlob(id), []);

  const activeClient = useMemo(
    () => clients.find((c) => c.id === activeClientId) ?? clients[0] ?? null,
    [clients, activeClientId],
  );

  const scopedSessions = useMemo(() => {
    const cid = activeClient?.id;
    if (!cid) return [];
    return [...sessions]
      .filter((s) => s.clientId === cid)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
      );
  }, [sessions, activeClient]);

  const scopedMeasurements = useMemo(() => {
    const cid = activeClient?.id;
    if (!cid) return [];
    return [...measurements]
      .filter((m) => m.clientId === cid)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [measurements, activeClient]);

  const scopedPhotos = useMemo(() => {
    const cid = activeClient?.id;
    if (!cid) return [];
    return photoMeta.filter((p) => p.clientId === cid);
  }, [photoMeta, activeClient]);

  const chartSeries = useMemo(() => {
    const byDate = [...scopedMeasurements].sort((a, b) => a.date.localeCompare(b.date));
    return {
      weight: byDate
        .filter((m) => m.weightLb != null)
        .map((m) => ({ date: m.date, value: m.weightLb as number })),
      bodyFat: byDate
        .filter((m) => m.bodyFatPct != null)
        .map((m) => ({ date: m.date, value: m.bodyFatPct as number })),
      waist: byDate
        .filter((m) => m.waist != null)
        .map((m) => ({ date: m.date, value: m.waist as number })),
    };
  }, [scopedMeasurements]);

  const syncNow = useCallback(async () => {
    enqueueAllLocalForPush();
    await runSync('manual');
  }, [runSync]);

  return {
    ready,
    cloudConfigured: isCloudConfigured,
    clients,
    activeClient,
    activeClientId: activeClient?.id ?? null,
    setActiveClientId,
    createClient,
    renameClient,
    deleteClient,
    sessions: scopedSessions,
    measurements: scopedMeasurements,
    photoMeta: scopedPhotos,
    chartSeries,
    syncMeta,
    syncStatus,
    upsertSession,
    deleteSession,
    upsertMeasurement,
    deleteMeasurement,
    addPhoto,
    removePhoto,
    loadPhoto,
    reload,
    syncNow,
  };
}

export type AppData = ReturnType<typeof useAppData>;
