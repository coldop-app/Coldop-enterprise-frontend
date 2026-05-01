/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ShieldCheck, Settings2, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const Route = createFileRoute('/store-admin/_authenticated/settings/')({
  component: RouteComponent,
});

const settingsCards = [
  {
    title: 'RBAC',
    description:
      'Manage roles, permissions, and access levels for admins, managers, and staff.',
    icon: ShieldCheck,
    href: '/store-admin/settings/rbac',
  },
  {
    title: 'Preferences',
    description: 'Configure system defaults, operational preferences',
    icon: Settings2,
    href: '/store-admin/settings/preferences',
  },
];

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      {/* Page Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage system controls and configuration options.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {settingsCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              type="button"
              key={card.title}
              onClick={() => navigate({ href: card.href })}
              className="group focus-visible:ring-primary rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <Card className="border-border/40 bg-card hover:border-border/70 relative overflow-hidden rounded-2xl border px-5 py-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                {/* Top Accent */}
                <div className="bg-primary absolute inset-x-0 top-0 h-[3px] rounded-t-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                <CardContent className="p-0">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-full">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="bg-muted group-hover:bg-primary/10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <ArrowUpRight className="text-primary h-4 w-4" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-foreground text-lg font-semibold tracking-tight">
                    {card.title}
                  </h3>

                  {/* Divider */}
                  <hr className="border-border/40 my-4" />

                  {/* Description */}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </main>
  );
}
