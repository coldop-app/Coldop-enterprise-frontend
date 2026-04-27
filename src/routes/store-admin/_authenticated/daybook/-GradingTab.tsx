import { Scale } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const GradingTab = () => {
  return (
    <Empty className="bg-muted/10 rounded-xl border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Scale />
        </EmptyMedia>
        <EmptyTitle className="font-custom">No Grading Records yet</EmptyTitle>
        <EmptyDescription className="font-custom">
          Grading updates will appear here once incoming lots are graded.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
};

export default GradingTab;
