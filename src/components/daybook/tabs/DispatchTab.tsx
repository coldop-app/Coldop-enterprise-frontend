import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { Truck } from 'lucide-react';
import { TabSummaryBar, TabToolbarSimple } from './shared';

const DispatchTab = memo(function DispatchTab() {
  return (
    <>
      <TabSummaryBar
        count={0}
        icon={<Truck className="text-primary h-5 w-5" />}
      />
      <div className="space-y-4">
        <TabToolbarSimple
          addButtonLabel="Add Dispatch"
          addButtonTo="/store-admin/nikasi"
          addButtonIcon={<Truck className="h-4 w-4 shrink-0" />}
        />
        <Card>
          <CardContent className="py-8 pt-6">
            <Empty className="font-custom">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Truck className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No dispatch vouchers yet</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                  asChild
                >
                  <Link to="/store-admin/nikasi">Add Dispatch voucher</Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      </div>
    </>
  );
});

export default DispatchTab;
