import { queryOptions, useQuery } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

export interface ResourcePermission {
  resource: string;
  actions: string[];
}

export interface RolePermissionData {
  _id: string;
  coldStorageId: string;
  role: string;
  permissions: ResourcePermission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GetRolePermissionsApiResponse {
  success: boolean;
  data: RolePermissionData[] | null;
  message?: string;
}

function normalizeRolePermission(
  rolePermission: RolePermissionData
): RolePermissionData {
  return {
    ...rolePermission,
    permissions: Array.isArray(rolePermission.permissions)
      ? rolePermission.permissions.map((permission) => ({
          resource: permission.resource,
          actions: Array.isArray(permission.actions)
            ? permission.actions.filter((action) => action && action !== 'null')
            : [],
        }))
      : [],
  };
}

/** Query key factory - use for invalidation and consistent cache keys */
export const rolePermissionsKeys = {
  all: ['store-admin', 'role-permissions'] as const,
  list: () => [...rolePermissionsKeys.all, 'list'] as const,
};

/** Fetcher used by queryOptions and prefetch */
async function fetchRolePermissions(): Promise<RolePermissionData[]> {
  const { data } =
    await storeAdminAxiosClient.get<GetRolePermissionsApiResponse>(
      '/role-permission'
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch role permissions');
  }

  return data.data.map(normalizeRolePermission);
}

/** Query options - use with useQuery, prefetchQuery, or in loaders */
export const rolePermissionsQueryOptions = () =>
  queryOptions({
    queryKey: rolePermissionsKeys.list(),
    queryFn: fetchRolePermissions,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

/** GET /role-permission */
export function useGetRolePermissions() {
  return useQuery(rolePermissionsQueryOptions());
}

/** Prefetch role permissions - e.g. on route hover or before navigation */
export function prefetchRolePermissions() {
  return queryClient.prefetchQuery(rolePermissionsQueryOptions());
}
