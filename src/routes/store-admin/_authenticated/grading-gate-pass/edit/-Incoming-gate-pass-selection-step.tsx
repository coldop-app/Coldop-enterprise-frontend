import { useMemo } from 'react';
import { format } from 'date-fns';
import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useUnlinkIncomingGatePasses } from '@/services/store-admin/general/useUnlinkIncomingGatePasses';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import LinkIncomingGatePassDialog from './-Link-incoming-gate-pass-dialog';

type IncomingGatePassSelectionStepProps = {
  gradingGatePass?: GradingGatePass;
  onPayloadChange?: (payload: {
    farmerStorageLinkId?: string;
    variety?: string;
  }) => void;
};

const IncomingGatePassSelectionStep = ({
  gradingGatePass,
  onPayloadChange,
}: IncomingGatePassSelectionStepProps) => {
  const incomingGatePasses = gradingGatePass?.incomingGatePassIds ?? [];
  const { data: farmerLinks = [] } = useGetAllFarmers();
  const { mutate: unlinkIncomingGatePasses, isPending: isUnlinking } =
    useUnlinkIncomingGatePasses();

  const onDelinkGatePass = (incomingGatePassId: string) => {
    unlinkIncomingGatePasses({
      incomingGatePassIds: [incomingGatePassId],
    });
  };

  const initialFarmerStorageLinkId =
    typeof gradingGatePass?.farmerStorageLinkId === 'string'
      ? gradingGatePass.farmerStorageLinkId
      : gradingGatePass?.farmerStorageLinkId?._id;

  const initialVariety = gradingGatePass?.variety;
  const selectedVarietyLabel = gradingGatePass?.variety || '';
  const selectedGatePassNo =
    gradingGatePass?.manualGatePassNumber ||
    gradingGatePass?.gatePassNo ||
    '--';

  const farmerOptions = useMemo<Option<string>[]>(() => {
    return farmerLinks.map((link) => ({
      label: `${link.farmerId.name} (Account #${link.accountNumber})`,
      value: link._id,
      searchableText:
        `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber}`.trim(),
    }));
  }, [farmerLinks]);

  const varietyOptions = useMemo<Option<string>[]>(() => {
    if (!selectedVarietyLabel) return [];
    return [
      {
        label: selectedVarietyLabel,
        value: selectedVarietyLabel,
      },
    ];
  }, [selectedVarietyLabel]);

  const onIncomingGatePassLinked = ({
    farmerStorageLinkId,
    variety,
  }: {
    farmerStorageLinkId?: string;
    variety?: string;
  }) => {
    if (!onPayloadChange) return;

    onPayloadChange({
      farmerStorageLinkId:
        farmerStorageLinkId &&
        farmerStorageLinkId !== initialFarmerStorageLinkId
          ? farmerStorageLinkId
          : undefined,
      variety: variety && variety !== initialVariety ? variety : undefined,
    });
  };

  const selectedMetaSection = (
    <div className="space-y-6">
      <div>
        <p className="font-custom mb-2 text-sm font-medium text-[#6f6f6f]">
          Gate Pass No.
        </p>
        <span className="font-custom inline-flex rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium text-green-700">
          VOUCHER NO: #{selectedGatePassNo}
        </span>
      </div>

      <div>
        <p className="font-custom mb-2 text-base font-semibold text-[#111]">
          Enter Account Name (search and select)
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <SearchSelector
              id="selected-farmer"
              options={farmerOptions}
              placeholder="Search or Create Farmer"
              searchPlaceholder="Search by name, account number, or mobile..."
              className="w-full"
              buttonClassName="w-full justify-between bg-white"
              value={initialFarmerStorageLinkId || ''}
              onSelect={() => {}}
            />
          </div>
          <AddFarmerModal links={farmerLinks} onFarmerAdded={() => {}} />
        </div>
      </div>

      <div className="border-primary/30 bg-primary/5 rounded-xl border p-4">
        <p className="font-custom text-base font-semibold text-[#111]">
          Select Variety
        </p>
        <p className="font-custom mt-1 text-sm text-[#6f6f6f]">
          Choose the potato variety for this order
        </p>
        <div className="mt-3">
          <SearchSelector
            id="selected-variety"
            options={varietyOptions}
            placeholder="Select a variety"
            searchPlaceholder="Search variety..."
            className="w-full"
            buttonClassName="w-full justify-between bg-white"
            value={selectedVarietyLabel}
            onSelect={() => {}}
          />
        </div>
      </div>
    </div>
  );

  if (!incomingGatePasses.length) {
    return (
      <div className="space-y-4">
        {selectedMetaSection}
        <div className="flex justify-end">
          <LinkIncomingGatePassDialog
            gradingGatePassId={gradingGatePass?._id}
            onIncomingGatePassLinked={onIncomingGatePassLinked}
          />
        </div>
        <div className="text-muted-foreground rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm">
          No linked incoming gate passes found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedMetaSection}
      <div className="flex justify-end">
        <LinkIncomingGatePassDialog
          gradingGatePassId={gradingGatePass?._id}
          onIncomingGatePassLinked={onIncomingGatePassLinked}
        />
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[60px_1.2fr_1.2fr_1fr_1.5fr_100px_130px_120px] items-center gap-4 border-b bg-gray-50 px-4 py-4 text-sm font-semibold text-gray-600 sm:px-6">
              <div />
              <div>Gate Pass #</div>
              <div>Date</div>
              <div>Variety</div>
              <div>Truck</div>
              <div>Bags</div>
              <div>Status</div>
              <div>Action</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
              {incomingGatePasses.map((gatePass) => (
                <div
                  key={gatePass._id}
                  className="grid grid-cols-[60px_1.2fr_1.2fr_1fr_1.5fr_100px_130px_120px] items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 sm:px-6"
                >
                  {/* Checkbox */}
                  <div className="flex justify-center">
                    <Checkbox className="h-5 w-5 rounded-md" />
                  </div>

                  {/* Gate Pass Number */}
                  <div className="text-base font-semibold text-gray-900">
                    {gatePass.manualGatePassNumber ||
                      gatePass.gatePassNo ||
                      '--'}
                  </div>

                  {/* Date */}
                  <div className="text-sm font-medium text-gray-600">
                    {gatePass.date
                      ? format(new Date(gatePass.date), 'd MMM yyyy')
                      : '--'}
                  </div>

                  {/* Variety */}
                  <div className="text-base font-semibold text-gray-900">
                    {gatePass.variety || '--'}
                  </div>

                  {/* Truck */}
                  <div className="text-sm font-semibold tracking-wide text-gray-600">
                    {gatePass.truckNumber || '--'}
                  </div>

                  {/* Bags */}
                  <div className="text-base font-semibold text-gray-900">
                    {gatePass.bagsReceived || 0}
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                        gatePass.status === 'OPEN'
                          ? 'bg-green-100 text-green-700'
                          : gatePass.status === 'GRADED'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {gatePass.status || '--'}
                    </span>
                  </div>

                  {/* Delink Button */}
                  <div>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => onDelinkGatePass(gatePass._id)}
                      disabled={isUnlinking}
                    >
                      {isUnlinking ? 'Delinking...' : 'Delink'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingGatePassSelectionStep;
