/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import {
  usePreferencesStore,
  usePreferencesStoreHydrated,
} from '@/stores/usePreferencesStore';
import { useStore } from '@/stores/store';

export const Route = createFileRoute('/zustand/')({
  component: RouteComponent,
});

function RouteComponent() {
  const admin = useStore((state) => state.admin);
  const coldStorage = useStore((state) => state.coldStorage);
  const token = useStore((state) => state.token);
  const daybookActiveTab = useStore((state) => state.daybookActiveTab);
  const isLoading = useStore((state) => state.isLoading);
  const hasHydrated = useStore((state) => state._hasHydrated);

  const preferences = usePreferencesStore((state) => state.preferences);
  const syncedColdStorageId = usePreferencesStore(
    (state) => state.syncedColdStorageId
  );
  const preferencesHydrated = usePreferencesStoreHydrated();

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm sm:p-6">
        <h1 className="font-custom text-2xl font-bold tracking-tight text-[#333]">
          Zustand Global State
        </h1>
        <p className="font-custom text-sm text-[#6f6f6f]">
          Live snapshot of values from `src/stores/store.ts` and
          `src/stores/usePreferencesStore.ts`.
        </p>

        <StateBlock
          title="admin"
          value={admin}
          emptyLabel="No admin data in store"
        />
        <StateBlock
          title="coldStorage"
          value={coldStorage}
          emptyLabel="No cold storage selected"
        />
        <StateBlock title="token" value={token} emptyLabel="No token present" />
        <StateBlock title="daybookActiveTab" value={daybookActiveTab} />
        <StateBlock title="isLoading" value={isLoading} />
        <StateBlock title="_hasHydrated" value={hasHydrated} />

        <h2 className="font-custom pt-4 text-lg font-semibold text-[#333]">
          Store admin preferences (`usePreferencesStore`)
        </h2>
        <StateBlock
          title="preferences"
          value={preferences}
          emptyLabel="No preferences synced yet"
        />
        <StateBlock
          title="syncedColdStorageId"
          value={syncedColdStorageId}
          emptyLabel="No cold storage linked for preference sync"
        />
        <StateBlock
          title="preferences persist hydrated"
          value={preferencesHydrated}
        />
      </div>
    </main>
  );
}

function StateBlock({
  title,
  value,
  emptyLabel,
}: {
  title: string;
  value: unknown;
  emptyLabel?: string;
}) {
  const isEmpty = value === null || value === undefined || value === '';

  return (
    <section className="space-y-2 rounded-lg border p-3">
      <h2 className="font-custom text-sm font-semibold tracking-wide text-[#333] uppercase">
        {title}
      </h2>
      {isEmpty && emptyLabel ? (
        <p className="font-custom text-sm text-[#6f6f6f]">{emptyLabel}</p>
      ) : (
        <pre className="overflow-auto rounded-md bg-gray-50 p-3 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </section>
  );
}
