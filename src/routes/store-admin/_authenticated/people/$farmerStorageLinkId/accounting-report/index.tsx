/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import AccountingReportTable from '@/components/people/reports/accounting-report/accounting-report-table';
import AccountingReportTopBar from '@/components/people/reports/accounting-report/accounting-report-top-bar';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/accounting-report/'
)({
  component: AccountingReportPage,
});

function AccountingReportPage() {
  const { farmerStorageLinkId } = Route.useParams();

  return (
    <main className="from-background via-muted/20 to-background mx-auto min-h-[calc(100dvh-4rem)] max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <div className="space-y-4">
        <header className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="font-custom text-muted-foreground hover:text-foreground -ml-2 h-9 gap-1.5 px-2"
            asChild
          >
            <Link
              to="/store-admin/people/$farmerStorageLinkId"
              params={{ farmerStorageLinkId }}
              className="focus-visible:ring-primary rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to farmer profile
            </Link>
          </Button>
          <div className="space-y-2">
            <h1 className="font-custom text-2xl font-bold tracking-tight text-[#333] sm:text-3xl">
              Accounting report
            </h1>
            <p className="font-custom max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
              Incoming, grading, summary, and seed dispatch figures for this
              farmer. Each section is grouped so you can scan or print one block
              at a time.
            </p>
          </div>
        </header>

        <AccountingReportTopBar />

        <AccountingReportTable />
      </div>
    </main>
  );
}
