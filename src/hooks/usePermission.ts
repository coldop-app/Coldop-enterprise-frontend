import { useStore } from '@/stores/store';
import type { PermissionAction } from '@/types/store-admin';

export function usePermission() {
  const role = useStore((state) => state.rolePermission?.role ?? null);
  const can = useStore((state) => state.can);
  const hasAny = useStore((state) => state.hasAny);

  return {
    role,
    canDo: (resource: string, action: PermissionAction) =>
      can(resource, action),
    hasAny: (resource: string, actions: PermissionAction[]) =>
      hasAny(resource, actions),
  };
}
