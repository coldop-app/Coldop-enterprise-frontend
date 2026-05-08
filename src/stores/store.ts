// src/store/useStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildPermissionMap, canDo, hasAnyAction } from '@/lib/permissions';
import type { ColdStorage } from '@/types/cold-storage';
import type {
  RolePermission,
  StoreAdmin,
  PermissionAction,
} from '@/types/store-admin';
import type { PermissionMap } from '@/lib/permissions';

interface StoreState {
  admin: Omit<StoreAdmin, 'password'> | null;
  coldStorage: ColdStorage | null;
  token: string | null;
  rolePermission: RolePermission | null;
  permissionMap: PermissionMap;
  daybookActiveTab:
    | 'seed'
    | 'incoming'
    | 'grading'
    | 'storage'
    | 'dispatch-pre-outgoing'
    | 'dispatch-outgoing';
  analyticsActiveTab:
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
    token: string,
    rolePermission: RolePermission | null
  ) => void;
  setRolePermission: (rolePermission: RolePermission | null) => void;
  can: (resource: string, action: PermissionAction) => boolean;
  hasAny: (resource: string, actions: PermissionAction[]) => boolean;

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
  setAnalyticsActiveTab: (
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
  | 'admin'
  | 'coldStorage'
  | 'token'
  | 'rolePermission'
  | 'permissionMap'
  | 'daybookActiveTab'
  | 'analyticsActiveTab'
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
      rolePermission: null,
      permissionMap: {},
      daybookActiveTab: 'seed',
      analyticsActiveTab: 'seed',
      isLoading: false,
      _hasHydrated: false,

      setAdminData: (admin, coldStorage, token, rolePermission) => {
        set({
          admin,
          coldStorage,
          token,
          rolePermission,
          permissionMap: buildPermissionMap(rolePermission?.permissions),
          isLoading: false,
        });
      },
      setRolePermission: (rolePermission) =>
        set({
          rolePermission,
          permissionMap: buildPermissionMap(rolePermission?.permissions),
        }),
      can: (resource, action) =>
        canDo(useStore.getState().permissionMap, resource, action),
      hasAny: (resource, actions) =>
        hasAnyAction(useStore.getState().permissionMap, resource, actions),

      clearAdminData: () =>
        set({
          admin: null,
          coldStorage: null,
          token: null,
          rolePermission: null,
          permissionMap: {},
        }),

      setDaybookActiveTab: (tab) => set({ daybookActiveTab: tab }),
      setAnalyticsActiveTab: (tab) => set({ analyticsActiveTab: tab }),

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
        rolePermission: state.rolePermission,
        permissionMap: state.permissionMap,
        daybookActiveTab: state.daybookActiveTab,
        analyticsActiveTab: state.analyticsActiveTab,
      }),

      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHasHydrated(true);
      },
    }
  )
);

/** Cold storage prefs (`localStorage`, no TTL) — see `./usePreferencesStore` */
export {
  usePreferencesStore,
  usePreferencesStoreHydrated,
} from './usePreferencesStore';
