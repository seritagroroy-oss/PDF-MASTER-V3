/**
 * useUserStorage — Gestion de la persistance des données utilisateur.
 * Toutes les activités sont stockées par userEmail dans localStorage,
 * afin que chaque compte retrouve son propre historique.
 */

export interface RecentFile {
  id: string;
  name: string;
  size: number;
  type: 'merge' | 'edit' | 'compress' | 'watermark' | 'convert';
  date: string; // ISO string
  pagesCount?: number;
}

export interface UserActivity {
  recentFiles: RecentFile[];
  totalFiles: number;
  totalSaved: number; // Bytes saved via compression
  lastSeen: string; // ISO string
}

const DEFAULT_ACTIVITY: UserActivity = {
  recentFiles: [],
  totalFiles: 0,
  totalSaved: 0,
  lastSeen: new Date().toISOString(),
};

const getKey = (email: string) => `pdfmaster_activity_${email}`;

export function getUserActivity(email: string): UserActivity {
  try {
    const raw = localStorage.getItem(getKey(email));
    return raw ? JSON.parse(raw) : DEFAULT_ACTIVITY;
  } catch {
    return DEFAULT_ACTIVITY;
  }
}

export function saveUserActivity(email: string, activity: UserActivity): void {
  try {
    localStorage.setItem(getKey(email), JSON.stringify(activity));
  } catch {
    // Silently fail if localStorage is full
  }
}

export function addRecentFile(email: string, file: Omit<RecentFile, 'id' | 'date'>): void {
  const activity = getUserActivity(email);
  const newFile: RecentFile = {
    ...file,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
  };
  // Keep max 20 recent files, newest first
  const recentFiles = [newFile, ...activity.recentFiles.filter(f => f.name !== file.name)].slice(0, 20);
  saveUserActivity(email, {
    ...activity,
    recentFiles,
    totalFiles: activity.totalFiles + 1,
    lastSeen: new Date().toISOString(),
  });
}

export function updateLastSeen(email: string): void {
  const activity = getUserActivity(email);
  saveUserActivity(email, { ...activity, lastSeen: new Date().toISOString() });
}

export function clearUserActivity(email: string): void {
  localStorage.removeItem(getKey(email));
}
