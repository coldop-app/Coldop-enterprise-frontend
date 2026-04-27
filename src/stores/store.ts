// src/store/useStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { StoreAdmin } from '@/types/store-admin';
import type { ColdStorage } from '@/types/cold-storage';

interface StoreState {
  admin: Omit<StoreAdmin, 'password'> | null;
  coldStorage: ColdStorage | null;
  token: string | null;
  daybookActiveTab:
    | 'seed'
    | 'incoming'
    | 'grading'
    | 'storage'
    | 'dispatch-pre-outgoing'
    | 'dispatch-outgoing';
  isLoading: boolean;
  _hasHydrated: boolean;

  setAdminData: (
    admin: Omit<StoreAdmin, 'password'>,
    coldStorage: ColdStorage,
    token: string
  ) => void;

  clearAdminData: () => void;
  setDaybookActiveTab: (
    tab:
      | 'seed'
      | 'incoming'
      | 'grading'
      | 'storage'
      | 'dispatch-pre-outgoing'
      | 'dispatch-outgoing'
  ) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

type PersistedState = Pick<
  StoreState,
  'admin' | 'coldStorage' | 'token' | 'daybookActiveTab'
>;

// ⏳ 1 week expiry in milliseconds
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

// ⭐ Custom storage wrapper with expiry
const expiringStorage = {
  getItem: (name: string) => {
    const raw = localStorage.getItem(name);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const { timestamp, value } = parsed;

      if (Date.now() - timestamp > ONE_WEEK) {
        localStorage.removeItem(name);
        return null;
      }

      return value;
    } catch {
      return null;
    }
  },

  setItem: (name: string, value: unknown) => {
    localStorage.setItem(
      name,
      JSON.stringify({
        timestamp: Date.now(),
        value,
      })
    );
  },

  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useStore = create(
  persist<StoreState, [], [], PersistedState>(
    (set) => ({
      admin: null,
      coldStorage: null,
      token: null,
      daybookActiveTab: 'seed',
      isLoading: false,
      _hasHydrated: false,

      setAdminData: (admin, coldStorage, token) => {
        set({
          admin,
          coldStorage,
          token,
          isLoading: false,
        });
      },

      clearAdminData: () =>
        set({
          admin: null,
          coldStorage: null,
          token: null,
        }),

      setDaybookActiveTab: (tab) => set({ daybookActiveTab: tab }),

      setLoading: (loading) => set({ isLoading: loading }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),

    {
      name: 'store-storage',
      storage: expiringStorage,

      partialize: (state): PersistedState => ({
        admin: state.admin,
        coldStorage: state.coldStorage,
        token: state.token,
        daybookActiveTab: state.daybookActiveTab,
      }),

      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHasHydrated(true);
      },
    }
  )
);
