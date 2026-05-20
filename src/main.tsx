import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { useStore } from '@/stores/store';
import './index.css';
import { router } from './router';

// Inner component that provides auth context to the router
export function InnerApp() {
  const { admin, token } = useStore();
  const isAuthenticated = !!(admin && token);

  return (
    <RouterProvider
      router={router}
      context={{
        auth: {
          isAuthenticated,
          admin,
          token,
        },
      }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InnerApp />
  </StrictMode>
);
