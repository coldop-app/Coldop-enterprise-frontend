import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import IncomingGatePassSelectionStep from './-Incoming-gate-pass-selection-step';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import GradingDetailsStep from './-grading-detail-filling-step';

const STEPS = ['basic-info', 'grading-details'] as const;
type Step = (typeof STEPS)[number];

// ─── Component ───────────────────────────────────────────────────────────────
type GradingEditFormProps = {
  gradingGatePass?: GradingGatePass;
};

const GradingEditForm = ({ gradingGatePass }: GradingEditFormProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('basic-info');
  const currentStepIndex = STEPS.indexOf(currentStep);

  return (
    <main className="font-custom mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-12">
      <Card className="w-full">
        <CardHeader className="space-y-3">
          <CardTitle>Grading Edit Form</CardTitle>
          <CardDescription>
            Step {currentStepIndex + 1} of {STEPS.length}
          </CardDescription>

          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{
                width: `${((currentStepIndex + 1) / STEPS.length) * 100}%`,
              }}
            />
          </div>
        </CardHeader>

        <Tabs
          value={currentStep}
          onValueChange={(v) => setCurrentStep(v as Step)}
          className="space-y-0"
        >
          <TabsList className="mx-6 grid w-auto grid-cols-2">
            <TabsTrigger value="basic-info">1 · Basic Info</TabsTrigger>
            <TabsTrigger value="grading-details">
              2 · Grading Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic-info">
            <CardContent className="pt-6">
              <IncomingGatePassSelectionStep
                gradingGatePass={gradingGatePass}
              />
            </CardContent>
          </TabsContent>

          <TabsContent value="grading-details">
            <CardContent className="pt-6">
              <GradingDetailsStep />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </main>
  );
};

export default GradingEditForm;
