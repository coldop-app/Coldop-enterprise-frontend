import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import AppTopbar from '@/components/app-topbar';
import AppBottomNav from '@/components/app-bottom-nav';

export const Route = createFileRoute('/store-admin/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    // Check if user is authenticated
    if (!context.auth.isAuthenticated) {
      // On explicit logout we redirect to login without ?redirect= so URL stays /store-admin/login
      const isLogout =
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem('store-admin-logout');
      if (isLogout) {
        sessionStorage.removeItem('store-admin-logout');
      }
      throw redirect({
        to: '/store-admin/login',
        search: isLogout ? {} : { redirect: location.href },
      });
    }
  },
  component: () => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar />
        <div className="pb-16 md:pb-0">
          <Outlet />
        </div>
        <AppBottomNav />
      </SidebarInset>
    </SidebarProvider>
  ),
});
