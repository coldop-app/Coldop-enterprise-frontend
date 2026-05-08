import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type { RolePermissionData } from './useGetRolePermissions';
import { rolePermissionsKeys } from './useGetRolePermissions';

type RolePermissionApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to update role permission';

function getEditRolePermissionErrorMessage(
  data: RolePermissionApiError | undefined
): string {
  return data?.error?.message ?? data?.message ?? DEFAULT_ERROR_MESSAGE;
}

export interface EditResourcePermissionInput {
  resource: string;
  actions: string[];
}

export interface EditRolePermissionsInput {
  role?: string;
  permissions?: EditResourcePermissionInput[];
  isActive?: boolean;
}

export type EditRolePermissionsParams = EditRolePermissionsInput & {
  id: string;
};

export interface EditRolePermissionsApiResponse {
  success: boolean;
  message?: string;
  data?: RolePermissionData | null;
}

function normalizeEditRolePermissionsPayload(
  payload: EditRolePermissionsInput
): EditRolePermissionsInput {
  return {
    ...(payload.role !== undefined && { role: payload.role.trim() }),
    ...(payload.permissions !== undefined && {
      permissions: payload.permissions.map((permission) => ({
        resource: permission.resource.trim(),
        actions: Array.isArray(permission.actions)
          ? permission.actions.filter((action) => action && action !== 'null')
          : [],
      })),
    }),
    ...(payload.isActive !== undefined && { isActive: payload.isActive }),
  };
}

/** PUT /role-permission/:id */
export function useEditRolePermissions() {
  return useMutation<
    EditRolePermissionsApiResponse,
    AxiosError<RolePermissionApiError>,
    EditRolePermissionsParams
  >({
    mutationKey: [...rolePermissionsKeys.all, 'edit'],
    mutationFn: async ({ id, ...payload }) => {
      const safeId = encodeURIComponent(id);
      const normalizedPayload = normalizeEditRolePermissionsPayload(payload);

      const { data } =
        await storeAdminAxiosClient.put<EditRolePermissionsApiResponse>(
          `/role-permission/${safeId}`,
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(data.message ?? 'Role permissions updated successfully');
      await queryClient.invalidateQueries({
        queryKey: rolePermissionsKeys.all,
      });
    },
    onError: (error) => {
      const errMsg = error.response?.data
        ? getEditRolePermissionErrorMessage(error.response.data)
        : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
