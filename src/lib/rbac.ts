import { useStore } from '@/stores/store';
import type { PermissionAction } from '@/types/store-admin';

export function canAccess(resource: string, action: PermissionAction): boolean {
  return useStore.getState().can(resource, action);
}

export function canAccessAny(
  resource: string,
  actions: PermissionAction[]
): boolean {
  return useStore.getState().hasAny(resource, actions);
}
