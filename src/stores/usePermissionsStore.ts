import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { PermissionAction, PermissionLookup } from '@/types/store-admin';

interface PermissionsState {
  permissions: PermissionLookup;
  setPermissions: (permissions: PermissionLookup) => void;
  clearPermissions: () => void;
  hasPermission: (
    resource: string,
    action: PermissionAction | string
  ) => boolean;
}

// Keep permissions persisted for 1 week, same as auth store.
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

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

export const usePermissionsStore = create(
  persist<PermissionsState, [], [], Pick<PermissionsState, 'permissions'>>(
    (set, get) => ({
      permissions: {},

      setPermissions: (permissions) => set({ permissions }),
      clearPermissions: () => set({ permissions: {} }),
      hasPermission: (resource, action) =>
        !!get().permissions[resource]?.[action],
    }),
    {
      name: 'store-permissions-storage',
      storage: expiringStorage,
      partialize: (state) => ({
        permissions: state.permissions,
      }),
    }
  )
);
