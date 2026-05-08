import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import IncomingGatePassSelectionStep from './-Incoming-gate-pass-selection-step';

type GradingEditFormProps = {
  gradingGatePass?: GradingGatePass;
};

const GradingEditForm = ({ gradingGatePass }: GradingEditFormProps) => {
  const selectedFarmerStorageLinkId =
    typeof gradingGatePass?.farmerStorageLinkId === 'string'
      ? gradingGatePass.farmerStorageLinkId
      : (gradingGatePass?.farmerStorageLinkId?._id ?? '');

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
      </div>

      <Tabs defaultValue="incoming-selection" className="max-w-4xl">
        <TabsList>
          <TabsTrigger value="incoming-selection">
            Incoming Selection
          </TabsTrigger>
          <TabsTrigger value="grading-details">Grading Details</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming-selection">
          <IncomingGatePassSelectionStep
            incomingGatePasses={gradingGatePass?.incomingGatePassIds ?? []}
            initialFarmerStorageLinkId={selectedFarmerStorageLinkId}
            initialVariety={gradingGatePass?.variety}
          />
        </TabsContent>
        <TabsContent value="grading-details">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Track performance and user engagement metrics. Monitor trends
                and identify growth opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Page views are up 25% compared to last month.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default GradingEditForm;
