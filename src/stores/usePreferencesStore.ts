import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  normalizePreferences,
  type PreferencesData,
} from '@/services/store-admin/preferences/useGetPreferences';

/** Persist slice only — actions are not persisted */
type PreferencesPersistSlice = Pick<
  PreferencesStore,
  'preferences' | 'syncedColdStorageId'
>;

interface PreferencesStore {
  preferences: PreferencesData | null;
  /** Last cold storage tenant we synced; mismatch forces server baseline */
  syncedColdStorageId: string | null;

  syncFromServerIfNeeded: (server: PreferencesData) => void;
  resetToServer: (server: PreferencesData) => void;
  updatePreferences: (
    updater: (prev: PreferencesData) => PreferencesData
  ) => void;
  /** Wipe persisted prefs (call on logout so next user starts clean). */
  clear: () => void;
}

function clonePreferences(server: PreferencesData): PreferencesData {
  return normalizePreferences(structuredClone(server));
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      preferences: null,
      syncedColdStorageId: null,

      syncFromServerIfNeeded: (server) => {
        const { preferences, syncedColdStorageId } = get();
        if (!preferences || syncedColdStorageId !== server.coldStorageId) {
          set({
            preferences: clonePreferences(server),
            syncedColdStorageId: server.coldStorageId,
          });
          return;
        }

        set({
          preferences: normalizePreferences(
            structuredClone(preferences),
            server
          ),
        });
      },

      resetToServer: (server) =>
        set({
          preferences: clonePreferences(server),
          syncedColdStorageId: server.coldStorageId,
        }),

      updatePreferences: (updater) => {
        const prev = get().preferences;
        if (!prev) return;
        set({
          preferences: normalizePreferences(updater(clonePreferences(prev))),
        });
      },

      clear: () => set({ preferences: null, syncedColdStorageId: null }),
    }),
    {
      name: 'bhatti-store-admin-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PreferencesPersistSlice => ({
        preferences: state.preferences,
        syncedColdStorageId: state.syncedColdStorageId,
      }),
      version: 3,
      migrate: (persisted) => {
        const state = persisted as PreferencesPersistSlice;

        return {
          ...state,
          preferences: state.preferences
            ? normalizePreferences(state.preferences)
            : null,
        };
      },
    }
  )
);

/** Wait for localStorage rehydration before merging server baseline (avoids races). */
export function usePreferencesStoreHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) =>
      usePreferencesStore.persist.onFinishHydration(() => onStoreChange()),
    () => usePreferencesStore.persist.hasHydrated(),
    () => false
  );
}
