import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Measurement, PhotoMeta, Session } from '../lib/types';
import {
  autoSessionTitle,
  deletePhotoBlob,
  getPhotoBlob,
  loadMeasurements,
  loadPhotoMeta,
  loadSessions,
  newId,
  saveMeasurements,
  savePhotoBlob,
  savePhotoMeta,
  saveSessions,
  todayISO,
} from '../lib/storage';

export function useAppData() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [photoMeta, setPhotoMeta] = useState<PhotoMeta[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessions(loadSessions());
    setMeasurements(loadMeasurements());
    setPhotoMeta(loadPhotoMeta());
    setReady(true);
  }, []);

  const reload = useCallback(() => {
    setSessions(loadSessions());
    setMeasurements(loadMeasurements());
    setPhotoMeta(loadPhotoMeta());
  }, []);

  const upsertSession = useCallback(
    (input: { id?: string; title: string; content: string; date: string }) => {
      const now = new Date().toISOString();
      const title =
        input.title.trim() || autoSessionTitle(input.date, input.content);
      setSessions((prev) => {
        let next: Session[];
        if (input.id) {
          next = prev.map((s) =>
            s.id === input.id
              ? { ...s, title, content: input.content, date: input.date, updatedAt: now }
              : s,
          );
        } else {
          next = [
            {
              id: newId(),
              title,
              content: input.content,
              date: input.date,
              createdAt: now,
              updatedAt: now,
            },
            ...prev,
          ];
        }
        saveSessions(next);
        return next;
      });
    },
    [],
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
  }, []);

  const upsertMeasurement = useCallback(
    (input: Omit<Measurement, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const now = new Date().toISOString();
      setMeasurements((prev) => {
        let next: Measurement[];
        if (input.id) {
          next = prev.map((m) =>
            m.id === input.id ? { ...m, ...input, updatedAt: now } : m,
          );
        } else {
          const { id: _id, ...rest } = input;
          next = [
            {
              id: newId(),
              ...rest,
              createdAt: now,
              updatedAt: now,
            },
            ...prev,
          ];
        }
        next = [...next].sort((a, b) => b.date.localeCompare(a.date));
        saveMeasurements(next);
        return next;
      });
    },
    [],
  );

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveMeasurements(next);
      return next;
    });
  }, []);

  const addPhoto = useCallback(async (file: File, label: string, date: string) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const meta: PhotoMeta = {
      id: newId(),
      date: date || todayISO(),
      label: label.trim() || 'Photo',
      createdAt: new Date().toISOString(),
      mimeType: file.type || 'image/jpeg',
    };
    await savePhotoBlob(meta.id, dataUrl);
    setPhotoMeta((prev) => {
      const next = [meta, ...prev];
      savePhotoMeta(next);
      return next;
    });
    return meta;
  }, []);

  const removePhoto = useCallback(async (id: string) => {
    await deletePhotoBlob(id);
    setPhotoMeta((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePhotoMeta(next);
      return next;
    });
  }, []);

  const loadPhoto = useCallback((id: string) => getPhotoBlob(id), []);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)),
    [sessions],
  );

  const chartSeries = useMemo(() => {
    const byDate = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
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
  }, [measurements]);

  return {
    ready,
    sessions: sortedSessions,
    measurements,
    photoMeta,
    chartSeries,
    upsertSession,
    deleteSession,
    upsertMeasurement,
    deleteMeasurement,
    addPhoto,
    removePhoto,
    loadPhoto,
    reload,
  };
}

export type AppData = ReturnType<typeof useAppData>;
