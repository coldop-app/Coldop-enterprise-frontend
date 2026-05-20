import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { cn } from '@/lib/utils';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card
      className={cn(
        'font-custom border-border min-h-[340px] w-full shadow-sm',
        className
      )}
    >
      <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        {subtitle ? (
          <p className="font-custom mt-0.5 text-xs text-gray-400">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="p-4 pt-3 sm:p-6 sm:pt-4">{children}</CardContent>
    </Card>
  );
}
