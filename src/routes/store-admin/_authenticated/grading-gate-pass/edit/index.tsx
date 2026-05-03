/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';

import { GradingEditForm } from './-GradingEditForm';
import { IncomingSelectionStep } from './-IncomingSelectionStep';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/stores/store';
import type {
  GradingGatePass,
  GradingGatePassEditRouterState,
} from '@/types/grading-gate-pass';
import { useGetGradingGatePassById } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePassById';

export const Route = createFileRoute(
  '/store-admin/_authenticated/grading-gate-pass/edit/'
)({
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: search.id ? String(search.id) : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useSearch();
  const location = useLocation();
  const setDaybookTab = useStore((s) => s.setDaybookActiveTab);

  const passFromState = isGradingGatePassEditRouterState(location.state)
    ? location.state.gradingGatePass
    : undefined;
  const idTrimmed = id?.trim() ?? '';

  /** Voucher hydrated from pencil navigation (TanStack Router `location.state`). */
  const hasHydratedPassFromNavigation =
    idTrimmed !== '' && passFromState?._id === idTrimmed;

  /** Fetch only when router state did not supply a matching voucher (e.g. refresh or deep link). */
  const fetchEnabled = idTrimmed !== '' && !hasHydratedPassFromNavigation;

  const {
    data: fetchedPass,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetGradingGatePassById(fetchEnabled ? id : undefined, {
    enabled: fetchEnabled,
  });

  const resolvedPass =
    hasHydratedPassFromNavigation && passFromState
      ? passFromState
      : fetchedPass;

  if (!idTrimmed) {
    return (
      <main className="font-custom mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-custom text-xl font-bold">
              Missing grading pass
            </CardTitle>
            <CardDescription className="font-custom text-base leading-relaxed">
              Include a grading pass id in the URL (e.g. open edit via the
              pencil on the daybook card).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              variant="default"
              className="font-custom font-semibold"
            >
              <Link
                to="/store-admin/daybook"
                className="focus-visible:ring-primary focus-visible:ring-offset-background inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                onClick={() => setDaybookTab('grading')}
              >
                Go to daybook
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (fetchEnabled && (isLoading || (isFetching && !fetchedPass))) {
    return (
      <main className="font-custom mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8 space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-9 w-[min(100%,320px)]" />
          <Skeleton className="h-6 max-w-xl" />
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (fetchEnabled && (isError || !fetchedPass)) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not load this grading gate pass.';
    return (
      <main className="font-custom mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Card className="border-destructive/30 shadow-md">
          <CardHeader>
            <CardTitle className="font-custom text-destructive text-xl font-bold">
              Unable to load voucher
            </CardTitle>
            <CardDescription className="font-custom text-foreground/90 text-sm leading-relaxed">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="font-custom focus-visible:ring-primary"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
            <Button
              asChild
              variant="default"
              className="font-custom font-semibold"
            >
              <Link
                to="/store-admin/daybook"
                className="focus-visible:ring-primary focus-visible:ring-offset-background inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                onClick={() => setDaybookTab('grading')}
              >
                Back to daybook
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!resolvedPass) {
    return (
      <main className="font-custom mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-custom text-xl font-bold">
              Nothing to edit
            </CardTitle>
            <CardDescription className="font-custom text-base leading-relaxed">
              Link is missing voucher data. Return to the daybook and use the
              pencil action, or refresh if you opened this URL directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              variant="default"
              className="font-custom font-semibold"
            >
              <Link
                to="/store-admin/daybook"
                className="focus-visible:ring-primary focus-visible:ring-offset-background inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                onClick={() => setDaybookTab('grading')}
              >
                Go to daybook
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <GradingEditPage key={resolvedPass._id} pass={resolvedPass} />;
}

function GradingEditPage({ pass }: { pass: GradingGatePass }) {
  const [selection, setSelection] = useState<{
    selectedIncomingGatePassIds: string[];
    selectedVariety: string;
  } | null>(null);

  if (!selection) {
    return (
      <main className="font-custom mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <IncomingSelectionStep
          pass={pass}
          onNext={({ selectedIds, variety }) =>
            setSelection({
              selectedIncomingGatePassIds: selectedIds,
              selectedVariety: variety,
            })
          }
        />
      </main>
    );
  }

  return (
    <GradingEditForm
      key={`${pass._id}-${selection.selectedIncomingGatePassIds.join(',')}-${selection.selectedVariety}`}
      pass={pass}
      selectedIncomingGatePassIds={selection.selectedIncomingGatePassIds}
      selectedVariety={selection.selectedVariety}
    />
  );
}

function isGradingGatePassEditRouterState(
  state: unknown
): state is GradingGatePassEditRouterState {
  if (!state || typeof state !== 'object') return false;
  if (!('gradingGatePass' in state)) return false;

  const maybePass = (state as { gradingGatePass?: { _id?: unknown } })
    .gradingGatePass;
  return Boolean(
    maybePass &&
    typeof maybePass === 'object' &&
    typeof maybePass._id === 'string'
  );
}
