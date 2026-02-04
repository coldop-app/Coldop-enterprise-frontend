import { useMutation } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '@/stores/store';
import queryClient from '@/lib/queryClient';

// API response type for logout
export interface StoreAdminLogoutApiResponse {
  success: boolean;
  message: string;
}

export const useStoreAdminLogout = () => {
  const navigate = useNavigate();
  const { clearAdminData, setLoading } = useStore();

  return useMutation<
    StoreAdminLogoutApiResponse,
    AxiosError<{ message?: string }>,
    void
  >({
    mutationKey: ['store-admin', 'logout'],

    mutationFn: async () => {
      setLoading(true);

      const { data } =
        await storeAdminAxiosClient.post<StoreAdminLogoutApiResponse>(
          '/store-admin/logout'
        );

      return data;
    },

    onSuccess: (data) => {
      setLoading(false);

      // Signal to _authenticated: redirect to login without adding ?redirect=
      sessionStorage.setItem('store-admin-logout', '1');

      clearAdminData();
      queryClient.clear();

      toast.success(data.message || 'Logged out successfully!');

      navigate({
        to: '/store-admin/login',
        replace: true,
        search: {},
      });
    },

    onError: (error) => {
      setLoading(false);

      const errMsg =
        error.response?.data?.message || error.message || 'Logout failed';

      toast.error(errMsg);

      sessionStorage.setItem('store-admin-logout', '1');

      clearAdminData();
      queryClient.clear();

      navigate({
        to: '/store-admin/login',
        replace: true,
        search: {},
      });
    },
  });
};
