import { memo } from 'react';
import FarmerSeedTable from '@/components/people/reports/farmer-seed-table';
import GradingTable from '@/components/people/reports/grading-table';
import IncomingTable from '@/components/people/reports/incoming-table';
import SummaryTable from '@/components/people/reports/summary-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const AccountingReportTable = () => {
  return (
    <div className="space-y-4">
      <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
        <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-5 py-4 sm:px-6 sm:py-5">
          <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
            Incoming
          </CardTitle>
          <CardDescription className="font-custom leading-relaxed text-gray-600">
            Manual gate passes, store, truck, variety, bags, weight slip, gross,
            tare, net, bardana, and actual weight.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0 pb-0">
          <div className="p-3 sm:p-4 lg:p-6">
            <IncomingTable />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
        <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-5 py-4 sm:px-6 sm:py-5">
          <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
            Grading
          </CardTitle>
          <CardDescription className="font-custom leading-relaxed text-gray-600">
            Grading gate passes by incoming reference, variety, date, and size
            splits (below 30 and 30-40) with weights and bag types.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0 pb-0">
          <div className="p-3 sm:p-4 lg:p-6">
            <GradingTable />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
        <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-5 py-4 sm:px-6 sm:py-5">
          <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
            Summary
          </CardTitle>
          <CardDescription className="font-custom leading-relaxed text-gray-600">
            Rolled-up line by type: size columns, weight per bag, received and
            bardana weights, actual weight, rate, amount payable, and
            graded-size share.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0 pb-0">
          <div className="p-3 sm:p-4 lg:p-6">
            <SummaryTable />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
        <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-5 py-4 sm:px-6 sm:py-5">
          <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
            Farmer seed
          </CardTitle>
          <CardDescription className="font-custom leading-relaxed text-gray-600">
            Seed dispatch dates, size issued, bags per acre, rate per bag, and
            total seed amount.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0 pb-0">
          <div className="p-3 sm:p-4 lg:p-6">
            <FarmerSeedTable />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(AccountingReportTable);
