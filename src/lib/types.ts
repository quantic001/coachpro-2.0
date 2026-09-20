export interface Client {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Session {
  id: string;
  clientId: string;
  title: string;
  content: string;
  date: string; // ISO date YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Measurement {
  id: string;
  clientId: string;
  date: string; // ISO date YYYY-MM-DD
  weightLb?: number;
  bodyFatPct?: number;
  neck?: number;
  shoulders?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  thighL?: number;
  thighR?: number;
  armL?: number;
  armR?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PhotoMeta {
  id: string;
  clientId: string;
  date: string;
  label: string;
  createdAt: string;
  mimeType: string;
}

export type OutboxEntity = 'client' | 'session' | 'measurement';
export type OutboxOp = 'upsert' | 'delete';

export interface OutboxItem {
  id: string;
  entity: OutboxEntity;
  entityId: string;
  op: OutboxOp;
  payload: unknown;
  updatedAt: string;
  createdAt: string;
}

export interface SyncMetaLocal {
  lastPullAt: string | null;
  lastPushAt: string | null;
  lastFullSyncAt: string | null;
  lastError: string | null;
}

export interface AppBackup {
  version: 2;
  exportedAt: string;
  activeClientId: string | null;
  clients: Client[];
  sessions: Session[];
  measurements: Measurement[];
  photos: Array<PhotoMeta & { dataUrl: string }>;
}

/** Legacy v1 backup (pre multi-client) */
export interface AppBackupV1 {
  version: 1;
  exportedAt: string;
  sessions: Array<Omit<Session, 'clientId'> & { clientId?: string }>;
  measurements: Array<Omit<Measurement, 'clientId'> & { clientId?: string }>;
  photos: Array<(Omit<PhotoMeta, 'clientId'> & { clientId?: string }) & { dataUrl: string }>;
}

export const STORAGE_KEYS = {
  clients: 'coachpro2_clients',
  sessions: 'coachpro2_sessions',
  measurements: 'coachpro2_measurements',
  photoMeta: 'coachpro2_photo_meta',
  activeClientId: 'coachpro2_active_client',
  outbox: 'coachpro2_outbox',
  syncMeta: 'coachpro2_sync_meta',
  schemaVersion: 'coachpro2_schema_version',
} as const;

export const PHOTO_DB = 'coachpro2_photos';
export const PHOTO_STORE = 'photos';
export const CURRENT_SCHEMA_VERSION = 2;
