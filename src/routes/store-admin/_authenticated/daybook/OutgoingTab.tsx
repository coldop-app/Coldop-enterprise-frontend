import { Truck } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const OutgoingTab = () => {
  return (
    <Empty className="bg-muted/10 rounded-xl border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Truck />
        </EmptyMedia>
        <EmptyTitle className="font-custom">
          No Outgoing Gate Passes yet
        </EmptyTitle>
        <EmptyDescription className="font-custom">
          Outgoing dispatch entries will appear here once gate passes are
          issued.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
};

export default OutgoingTab;
