import type { ReactNode } from 'react';

import type { PermissionAction } from '@/types/store-admin';
import { usePermissionsStore } from '@/stores/usePermissionsStore';

interface CanProps {
  resource: string;
  action: PermissionAction | string;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function Can({
  resource,
  action,
  fallback = null,
  children,
}: CanProps) {
  const hasPermission = usePermissionsStore((state) => state.hasPermission);

  return hasPermission(resource, action) ? <>{children}</> : <>{fallback}</>;
}
