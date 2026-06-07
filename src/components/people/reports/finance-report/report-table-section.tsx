import { memo, type ReactNode } from 'react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface ReportTableSectionProps {
  title: string;
  description: string;
  isLoading: boolean;
  isError: boolean;
  errorTitle: string;
  errorDescription: string;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
}

function ReportTableSection({
  title,
  description,
  isLoading,
  isError,
  errorTitle,
  errorDescription,
  isEmpty,
  emptyTitle,
  emptyDescription,
  children,
}: ReportTableSectionProps) {
  return (
    <section className="border-border/40 overflow-hidden rounded-xl border">
      <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
        <CardTitle className="font-custom text-foreground text-lg font-semibold sm:text-xl">
          {title}
        </CardTitle>
        <CardDescription className="font-custom text-muted-foreground leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <div className="p-0">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="font-custom text-muted-foreground h-[280px] w-full rounded-2xl" />
          </div>
        ) : isError ? (
          <div className="p-4">
            <Empty className="border-border/50 rounded-xl border py-12">
              <EmptyHeader>
                <EmptyTitle className="font-custom">{errorTitle}</EmptyTitle>
                <EmptyDescription className="font-custom">
                  {errorDescription}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : isEmpty ? (
          <div className="p-4">
            <Empty className="border-border/50 rounded-xl border py-12">
              <EmptyHeader>
                <EmptyTitle className="font-custom">{emptyTitle}</EmptyTitle>
                <EmptyDescription className="font-custom">
                  {emptyDescription}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="w-full">{children}</div>
        )}
      </div>
    </section>
  );
}

export default memo(ReportTableSection);
