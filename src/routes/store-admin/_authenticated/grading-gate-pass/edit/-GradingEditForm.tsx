import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo, useState } from 'react';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import { Button } from '@/components/ui/button';
import IncomingGatePassSelectionStep from './-Incoming-gate-pass-selection-step';
import GradingDetailsStep from './-grading-detail-filling-step';

type GradingEditFormProps = {
  gradingGatePass?: GradingGatePass;
};

const GradingEditForm = ({ gradingGatePass }: GradingEditFormProps) => {
  const [activeTab, setActiveTab] = useState<
    'incoming-selection' | 'grading-details'
  >('incoming-selection');
  const [isMarkedAsNull, setIsMarkedAsNull] = useState(false);
  const [remarksFocusTrigger, setRemarksFocusTrigger] = useState(0);
  const selectedFarmerStorageLinkId =
    typeof gradingGatePass?.farmerStorageLinkId === 'string'
      ? gradingGatePass.farmerStorageLinkId
      : (gradingGatePass?.farmerStorageLinkId?._id ?? '');
  const initialFarmerName = useMemo(() => {
    if (
      gradingGatePass &&
      typeof gradingGatePass.farmerStorageLinkId === 'object' &&
      gradingGatePass.farmerStorageLinkId !== null
    ) {
      return gradingGatePass.farmerStorageLinkId.farmerId.name ?? '';
    }
    return '';
  }, [gradingGatePass]);
  const [selectedSummary, setSelectedSummary] = useState({
    farmerStorageLinkId: selectedFarmerStorageLinkId,
    farmerName: initialFarmerName,
    variety: gradingGatePass?.variety ?? '',
  });

  const handleMarkAsNull = () => {
    setIsMarkedAsNull(true);
    setActiveTab('grading-details');
    setRemarksFocusTrigger((prev) => prev + 1);
  };

  return (
    <main className="font-custom mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-3xl font-bold text-[#333] sm:text-4xl dark:text-white">
          Edit Grading Gate Pass
        </h1>
        <div className="bg-primary/20 block w-fit rounded-full px-4 py-1.5">
          <span className="font-custom text-primary text-sm font-medium">
            VOUCHER NO: {gradingGatePass?.gatePassNo}
          </span>
        </div>
        <Button
          type="button"
          variant="destructive"
          className="font-custom block w-fit"
          onClick={handleMarkAsNull}
          disabled={isMarkedAsNull}
        >
          {isMarkedAsNull ? 'Marked as Null' : 'Mark as Null'}
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as 'incoming-selection' | 'grading-details')
        }
        className="max-w-4xl"
      >
        <TabsList>
          <TabsTrigger value="incoming-selection">
            Incoming Selection
          </TabsTrigger>
          <TabsTrigger value="grading-details">Grading Details</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming-selection">
          <IncomingGatePassSelectionStep
            gradingGatePassId={gradingGatePass?._id ?? ''}
            incomingGatePasses={gradingGatePass?.incomingGatePassIds ?? []}
            initialFarmerStorageLinkId={selectedFarmerStorageLinkId}
            initialVariety={gradingGatePass?.variety}
            onSelectionChange={setSelectedSummary}
          />
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              className="font-custom"
              onClick={() => setActiveTab('grading-details')}
            >
              Next
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="grading-details">
          <GradingDetailsStep
            gradingGatePass={gradingGatePass}
            selectedFarmerName={selectedSummary.farmerName}
            selectedVariety={selectedSummary.variety}
            selectedFarmerStorageLinkId={selectedSummary.farmerStorageLinkId}
            isMarkedAsNull={isMarkedAsNull}
            remarksFocusTrigger={remarksFocusTrigger}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default GradingEditForm;
