import { Sprout } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const SeedTab = () => {
  return (
    <Empty className="bg-muted/10 rounded-xl border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Sprout />
        </EmptyMedia>
        <EmptyTitle className="font-custom">No Seed Entries yet</EmptyTitle>
        <EmptyDescription className="font-custom">
          Seed stock and movement records will appear here once entries are
          added.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
};

export default SeedTab;
