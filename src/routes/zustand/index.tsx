import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/zustand/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [bears, setBears] = useState(0);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-6 shadow-md">
        <h2 className="text-center text-xl font-semibold text-gray-800">
          Hello "/zustand/"!
        </h2>

        <BearCounter bears={bears} />
        <Controls
          onIncrease={() => setBears((count) => count + 1)}
          onReset={() => setBears(0)}
        />
      </div>
    </div>
  );
}

// --------------------
// Components
// --------------------

function BearCounter({ bears }: { bears: number }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900">{bears}</h1>
      <p className="text-sm text-gray-500">bears around here...</p>
    </div>
  );
}

function Controls({
  onIncrease,
  onReset,
}: {
  onIncrease: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onIncrease}
        className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
      >
        Add bear
      </button>

      <button
        onClick={onReset}
        className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
      >
        Remove all
      </button>
    </div>
  );
}
