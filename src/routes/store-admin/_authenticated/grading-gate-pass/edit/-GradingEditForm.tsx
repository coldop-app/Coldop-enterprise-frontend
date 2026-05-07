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
import type { EditGradingGatePassInput } from '@/types/grading-gate-pass';

const STEPS = ['basic-info', 'grading-details'] as const;
type Step = (typeof STEPS)[number];

// ─── Component ───────────────────────────────────────────────────────────────
type GradingEditFormProps = {
  gradingGatePass?: GradingGatePass;
};

const GradingEditForm = ({ gradingGatePass }: GradingEditFormProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('basic-info');
  const currentStepIndex = STEPS.indexOf(currentStep);
  const [payloadDraft, setPayloadDraft] = useState<
    Partial<EditGradingGatePassInput> & { farmerStorageLinkId?: string }
  >({});

  const mergePayloadDraft = (
    patch: Partial<EditGradingGatePassInput> & { farmerStorageLinkId?: string }
  ) => {
    setPayloadDraft((prev) => {
      const next = { ...prev, ...patch };

      Object.keys(patch).forEach((key) => {
        const typedKey = key as keyof typeof next;
        if (patch[typedKey] === undefined) {
          delete next[typedKey];
        }
      });

      return next;
    });
  };

  const handleReviewCreate = (
    detailsPatch: Partial<EditGradingGatePassInput>
  ) => {
    const finalPayload = {
      ...payloadDraft,
      ...detailsPatch,
    };

    console.log('Grading gate pass edit payload:', finalPayload);
  };

  return (
    <main className="font-custom mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-12">
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
                onPayloadChange={mergePayloadDraft}
              />
            </CardContent>
          </TabsContent>

          <TabsContent value="grading-details">
            <CardContent className="pt-6">
              <GradingDetailsStep
                key={gradingGatePass?._id ?? 'no-grading-gate-pass'}
                gradingGatePass={gradingGatePass}
                onReviewCreate={handleReviewCreate}
              />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </main>
  );
};

export default GradingEditForm;
