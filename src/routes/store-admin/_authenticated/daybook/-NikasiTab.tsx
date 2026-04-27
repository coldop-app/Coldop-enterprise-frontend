import { ArrowLeftRight } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const NikasiTab = () => {
  return (
    <Empty className="bg-muted/10 rounded-xl border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ArrowLeftRight />
        </EmptyMedia>
        <EmptyTitle className="font-custom">No Nikasi Records yet</EmptyTitle>
        <EmptyDescription className="font-custom">
          Nikasi movements will appear here once dispatch activity is recorded.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
};

export default NikasiTab;
