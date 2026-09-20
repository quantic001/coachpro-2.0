export interface Session {
  id: string;
  title: string;
  content: string;
  date: string; // ISO date YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface Measurement {
  id: string;
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
}

export interface PhotoMeta {
  id: string;
  date: string;
  label: string;
  createdAt: string;
  mimeType: string;
}

export interface AppBackup {
  version: 1;
  exportedAt: string;
  sessions: Session[];
  measurements: Measurement[];
  photos: Array<PhotoMeta & { dataUrl: string }>;
}

export const STORAGE_KEYS = {
  sessions: 'coachpro2_sessions',
  measurements: 'coachpro2_measurements',
  photoMeta: 'coachpro2_photo_meta',
} as const;

export const PHOTO_DB = 'coachpro2_photos';
export const PHOTO_STORE = 'photos';
