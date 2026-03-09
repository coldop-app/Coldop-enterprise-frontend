import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/store-admin/_authenticated/area-breakdown/'
)({
  validateSearch: (
    search: Record<string, unknown>
  ): { area?: string; size?: string; variety?: string } => ({
    area: typeof search.area === 'string' ? search.area : undefined,
    size: typeof search.size === 'string' ? search.size : undefined,
    variety: typeof search.variety === 'string' ? search.variety : undefined,
  }),
  component: AreaBreakdownPage,
});

function AreaBreakdownPage() {
  const { area, size, variety } = Route.useSearch();
  return (
    <main className="font-custom mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="font-custom text-2xl font-bold tracking-tight sm:text-3xl">
        Area breakdown
      </h1>
      <p className="font-custom text-muted-foreground mt-2 text-sm">
        {area != null && (
          <span>
            Area: <span className="text-foreground font-medium">{area}</span>
            {' · '}
          </span>
        )}
        {size != null && (
          <span>
            Size: <span className="text-foreground font-medium">{size}</span>
            {' · '}
          </span>
        )}
        {variety != null && (
          <span>
            Variety:{' '}
            <span className="text-foreground font-medium">{variety}</span>
          </span>
        )}
        {area == null && size == null && variety == null && (
          <span>
            No filters selected. Navigate from Analytics → Grading → Area-wise
            table.
          </span>
        )}
      </p>
    </main>
  );
}
