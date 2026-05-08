import type { GradingGatePassIncomingRef } from '@/types/grading-gate-pass';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import { usePreferencesStore } from '@/stores/store';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import LinkIncomingGatePassDialog from './-Link-incoming-gate-pass-dialog';

type IncomingGatePassSelectionStepProps = {
  incomingGatePasses: GradingGatePassIncomingRef[];
  initialFarmerStorageLinkId: string;
  initialVariety?: string;
};

const formatDisplayDate = (date?: string) => {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusBadgeClassName = (status?: string) => {
  if (status === 'OPEN') return 'bg-green-100 text-green-700';
  if (status === 'GRADED') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
};

const IncomingGatePassSelectionStep = ({
  incomingGatePasses,
  initialFarmerStorageLinkId,
  initialVariety,
}: IncomingGatePassSelectionStepProps) => {
  const { data: farmerLinks = [], isLoading: isFarmersLoading } =
    useGetAllFarmers();
  const preferences = usePreferencesStore((state) => state.preferences);
  const [selectedFarmerLinkId, setSelectedFarmerLinkId] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [hasFarmerSelectionChanged, setHasFarmerSelectionChanged] =
    useState(false);
  const [hasVarietySelectionChanged, setHasVarietySelectionChanged] =
    useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  const effectiveSelectedFarmerLinkId = hasFarmerSelectionChanged
    ? selectedFarmerLinkId
    : initialFarmerStorageLinkId;
  const effectiveSelectedVariety = hasVarietySelectionChanged
    ? selectedVariety
    : (initialVariety ?? '');

  const effectiveSelectedFarmerName = useMemo(() => {
    if (!effectiveSelectedFarmerLinkId) return '';

    const matchingFarmerLink = farmerLinks.find(
      (link) => link._id === effectiveSelectedFarmerLinkId
    );
    if (matchingFarmerLink) return matchingFarmerLink.farmerId.name;

    const matchingPass = incomingGatePasses.find((pass) => {
      const farmerLink = pass.farmerStorageLinkId;
      return (
        typeof farmerLink === 'object' &&
        farmerLink !== null &&
        farmerLink._id === effectiveSelectedFarmerLinkId
      );
    });
    const matchingPassFarmerLink =
      typeof matchingPass?.farmerStorageLinkId === 'object' &&
      matchingPass.farmerStorageLinkId !== null
        ? matchingPass.farmerStorageLinkId
        : null;

    return matchingPassFarmerLink?.farmerId.name ?? '';
  }, [effectiveSelectedFarmerLinkId, farmerLinks, incomingGatePasses]);

  const farmerOptions = useMemo<Option<string>[]>(() => {
    const mappedOptions = farmerLinks.map((link) => ({
      label: `${link.farmerId.name} (Account #${link.accountNumber})`,
      value: link._id,
      searchableText:
        `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber}`.trim(),
    }));

    if (!effectiveSelectedFarmerLinkId) return mappedOptions;

    const alreadyExists = mappedOptions.some(
      (option) => option.value === effectiveSelectedFarmerLinkId
    );
    if (alreadyExists) return mappedOptions;

    const selectedPass = incomingGatePasses.find((pass) => {
      const farmerLink = pass.farmerStorageLinkId;
      return (
        typeof farmerLink === 'object' &&
        farmerLink !== null &&
        farmerLink._id === effectiveSelectedFarmerLinkId
      );
    });
    const selectedPassFarmerLink =
      typeof selectedPass?.farmerStorageLinkId === 'object' &&
      selectedPass.farmerStorageLinkId !== null
        ? selectedPass.farmerStorageLinkId
        : null;

    const fallbackLabel = selectedPassFarmerLink
      ? `${selectedPassFarmerLink.farmerId.name} (Account #${selectedPassFarmerLink.accountNumber ?? '--'})`
      : `Farmer (Account #${effectiveSelectedFarmerLinkId})`;

    return [
      ...mappedOptions,
      {
        label: fallbackLabel,
        value: effectiveSelectedFarmerLinkId,
        searchableText: fallbackLabel,
      },
    ];
  }, [effectiveSelectedFarmerLinkId, farmerLinks, incomingGatePasses]);

  const potatoVarietyOptions = useMemo<Option<string>[]>(() => {
    return preferences?.custom.potatoVarieties ?? [];
  }, [preferences?.custom.potatoVarieties]);

  const varietyOptions = useMemo<Option<string>[]>(() => {
    const exists = potatoVarietyOptions.some(
      (option) => option.value === effectiveSelectedVariety
    );
    if (!effectiveSelectedVariety || exists) return potatoVarietyOptions;
    return [
      ...potatoVarietyOptions,
      {
        label: effectiveSelectedVariety,
        value: effectiveSelectedVariety,
      },
    ];
  }, [effectiveSelectedVariety, potatoVarietyOptions]);

  return (
    <div className="space-y-6">
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
              value={effectiveSelectedFarmerLinkId}
              onSelect={(value) => {
                setHasFarmerSelectionChanged(true);
                setSelectedFarmerLinkId(value);
              }}
              loading={isFarmersLoading}
            />
          </div>
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
            value={effectiveSelectedVariety}
            onSelect={(value) => {
              setHasVarietySelectionChanged(true);
              setSelectedVariety(value);
            }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="default"
          className="font-custom"
          onClick={() => setIsLinkDialogOpen(true)}
        >
          Link Incoming Gate Passes
        </Button>
      </div>

      <LinkIncomingGatePassDialog
        farmerStorageLinkId={effectiveSelectedFarmerLinkId}
        farmerName={effectiveSelectedFarmerName}
        variety={effectiveSelectedVariety}
        open={isLinkDialogOpen}
        setOpen={setIsLinkDialogOpen}
      />

      {incomingGatePasses.length === 0 ? (
        <>No incoming gate passes linked</>
      ) : (
        <>
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
                        {formatDisplayDate(gatePass.date)}
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
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusBadgeClassName(gatePass.status)}`}
                        >
                          {gatePass.status || '--'}
                        </span>
                      </div>

                      {/* Delink Button */}
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Delink
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default IncomingGatePassSelectionStep;
