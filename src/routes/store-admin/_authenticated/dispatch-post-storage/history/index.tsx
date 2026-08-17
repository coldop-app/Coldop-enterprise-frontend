/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router';
import { History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useStore } from '@/stores/store';

export const Route = createFileRoute(
  '/store-admin/_authenticated/dispatch-post-storage/history/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const setDaybookTab = useStore((state) => state.setDaybookActiveTab);

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Dispatch (Post Storage) History
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

      <Empty className="bg-muted/10 rounded-xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <History />
          </EmptyMedia>
          <EmptyTitle className="font-custom">No edit history yet</EmptyTitle>
          <EmptyDescription className="font-custom">
            Dispatch (Post Storage) history will appear here once edit tracking
            is connected.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
}
