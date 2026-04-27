import { Package } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const StorageTab = () => {
  return (
    <Empty className="bg-muted/10 rounded-xl border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Package />
        </EmptyMedia>
        <EmptyTitle className="font-custom">No Storage Records yet</EmptyTitle>
        <EmptyDescription className="font-custom">
          Storage entries will appear here once inventory is logged in the
          daybook.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
};

export default StorageTab;
