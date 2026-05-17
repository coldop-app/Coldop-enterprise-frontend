import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { plantingColumns } from './columns';
import { DataTable } from './data-table';

export interface FinanceReportProps {
  farmerStorageLinkId: string;
}

const reportLinkClassName =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded';

function FinanceReport({ farmerStorageLinkId }: FinanceReportProps) {
  void farmerStorageLinkId;

  return (
    <section className="font-custom space-y-8 px-4 py-6 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-custom text-2xl font-bold tracking-tight text-[#333] lg:text-3xl">
            Finance report
          </h1>
          <p className="font-custom text-sm text-gray-600">
            Planting breakdown for this farmer.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link
            to="/store-admin/people/$farmerStorageLinkId"
            params={{ farmerStorageLinkId }}
            preload="intent"
            className={reportLinkClassName}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to profile
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="font-custom text-lg font-semibold text-[#333]">
          Planting
        </h2>
        <DataTable columns={plantingColumns} data={[]} />
      </div>
    </section>
  );
}

export default memo(FinanceReport);
