import type { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import type { PermissionAction } from '@/types/store-admin';

interface CanProps {
  resource: string;
  action: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function Can({
  resource,
  action,
  fallback = null,
  children,
}: CanProps) {
  const { canDo } = usePermission();
  return canDo(resource, action) ? <>{children}</> : <>{fallback}</>;
}
