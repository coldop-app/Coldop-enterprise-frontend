import { useMutation } from '@tanstack/react-query';
import type {
  StoreAdminLoginInput,
  StoreAdminLoginApiResponse,
} from '@/types/store-admin';
import queryClient from '@/lib/queryClient';
import storeAdminAxiosClient from '@/lib/axios';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { useStore } from '@/stores/store';
import type { ColdStorage } from '@/types/cold-storage';
import type { PermissionLookup, RolePermissionItem } from '@/types/store-admin';
import { usePermissionsStore } from '@/stores/usePermissionsStore';

const buildPermissionLookup = (
  permissionEntries: RolePermissionItem[]
): PermissionLookup => {
  return permissionEntries.reduce<PermissionLookup>((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = {};
    }

    permission.actions.forEach((action) => {
      acc[permission.resource][action] = true;
    });

    return acc;
  }, {});
};

export const useStoreAdminLogin = () => {
  const navigate = useNavigate();
  const router = useRouter();
  const search = useSearch({ from: '/store-admin/login/' });
  const { setAdminData, setLoading } = useStore();
  const { setPermissions } = usePermissionsStore();

  return useMutation<
    StoreAdminLoginApiResponse,
    AxiosError<{ message?: string }>,
    StoreAdminLoginInput
  >({
    mutationKey: ['store-admin', 'login'],

    mutationFn: async (payload) => {
      setLoading(true);

      const { data } =
        await storeAdminAxiosClient.post<StoreAdminLoginApiResponse>(
          '/store-admin/login',
          payload
        );

      return data;
    },

    onSuccess: (data) => {
      setLoading(false);

      if (!data.success || !data.data) {
        toast.error(data.message || 'Login failed: No data received');
        return;
      }

      const { storeAdmin, token, rolePermission } = data.data;

      // Transform the API response to match our StoreAdmin type
      // The API returns coldStorageId as an object, but our type expects it as a string
      const coldStorage: ColdStorage = {
        _id: storeAdmin.coldStorageId._id,
        name: storeAdmin.coldStorageId.name,
        address: storeAdmin.coldStorageId.address,
        mobileNumber: storeAdmin.coldStorageId.mobileNumber,
        capacity: storeAdmin.coldStorageId.capacity,
        imageUrl: storeAdmin.coldStorageId.imageUrl || '',
        isPaid: storeAdmin.coldStorageId.isPaid,
        isActive: storeAdmin.coldStorageId.isActive,
        plan: storeAdmin.coldStorageId.plan as ColdStorage['plan'],
        admins: storeAdmin.coldStorageId.admins,
        links: storeAdmin.coldStorageId.links,
        incomingOrders: storeAdmin.coldStorageId.incomingOrders,
        outgoingOrders: storeAdmin.coldStorageId.outgoingOrders,
        createdAt: storeAdmin.coldStorageId.createdAt,
        updatedAt: storeAdmin.coldStorageId.updatedAt,
      };

      // Create StoreAdmin with coldStorageId as string
      const admin = {
        _id: storeAdmin._id,
        coldStorageId: storeAdmin.coldStorageId._id,
        name: storeAdmin.name,
        mobileNumber: storeAdmin.mobileNumber,
        role: storeAdmin.role,
        isVerified: storeAdmin.isVerified,
        failedLoginAttempts: storeAdmin.failedLoginAttempts,
        lockedUntil: storeAdmin.lockedUntil,
        createdAt: storeAdmin.createdAt,
        updatedAt: storeAdmin.updatedAt,
      };

      const permissions = buildPermissionLookup(rolePermission.permissions);

      // Store auth + cold storage in auth store
      setAdminData(admin, coldStorage, token);
      // Store permissions in dedicated store for easier access
      setPermissions(permissions);

      toast.success(data.message || 'Logged in successfully!');

      queryClient.invalidateQueries({ queryKey: ['store-admin', 'profile'] });

      // ✅ TanStack Router navigation - redirect to original destination or default
      const redirectTo =
        (search as { redirect?: string })?.redirect || '/store-admin/daybook';

      // Use router history for login redirects to preserve full target URL.
      try {
        if (redirectTo.startsWith('http')) {
          const redirectUrl = new URL(redirectTo);
          const currentOrigin = window.location.origin;

          if (redirectUrl.origin === currentOrigin) {
            router.history.push(
              `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
            );
          } else {
            navigate({
              href: redirectTo,
              replace: true,
            });
          }
        } else {
          router.history.push(redirectTo);
        }
      } catch {
        navigate({
          to: '/store-admin/daybook',
          replace: true,
        });
      }
    },

    onError: (error) => {
      setLoading(false);

      const errMsg =
        error.response?.data?.message || error.message || 'Login failed';

      toast.error(errMsg);
    },
  });
};
