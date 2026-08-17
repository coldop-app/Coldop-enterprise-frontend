/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { useStore } from '@/stores/store';
import { CreateDispatchPostStorageForm } from './-CreateDispatchPostStorageForm';

export const Route = createFileRoute(
  '/store-admin/_authenticated/dispatch-post-storage/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const setDaybookTab = useStore((state) => state.setDaybookActiveTab);

  return (
    <main className="font-custom mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Create Dispatch (Post Storage)
        </h1>
        <Button
          variant="outline"
          className="font-custom focus-visible:ring-primary shrink-0"
          asChild
        >
          <Link
            to="/store-admin/daybook"
            className="focus-visible:ring-primary focus-visible:ring-offset-background rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={() => setDaybookTab('dispatch-outgoing')}
          >
            Back to daybook
          </Link>
        </Button>
      </div>
      <CreateDispatchPostStorageForm />
    </main>
  );
}
