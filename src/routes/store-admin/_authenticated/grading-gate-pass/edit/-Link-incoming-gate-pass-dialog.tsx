import { useMemo, useState } from 'react';
import { format } from 'date-fns';

import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useGetIncomingGatePassesOfFarmer } from '@/services/store-admin/general/useGetIncomingGatePassesOfFarmer';
import { useLinkIncomingGatePasses } from '@/services/store-admin/general/useLinkIncomingGatePasses';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';

type LinkIncomingGatePassDialogProps = {
  gradingGatePassId?: string;
};

const LinkIncomingGatePassDialog = ({
  gradingGatePassId,
}: LinkIncomingGatePassDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedFarmerLinkId, setSelectedFarmerLinkId] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [selectedIncomingGatePassId, setSelectedIncomingGatePassId] = useState<
    string | null
  >(null);
  const { mutate: linkIncomingGatePass, isPending: isLinking } =
    useLinkIncomingGatePasses();
  const { data: farmerLinks = [] } = useGetAllFarmers();
  const {
    data: farmerIncomingGatePasses = [],
    isLoading: isLoadingGatePasses,
  } = useGetIncomingGatePassesOfFarmer(selectedFarmerLinkId);

  const farmerOptions = useMemo<Option<string>[]>(() => {
    return farmerLinks.map((link) => ({
      label: `${link.farmerId.name} (Account #${link.accountNumber})`,
      value: link._id,
      searchableText:
        `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber}`.trim(),
    }));
  }, [farmerLinks]);

  const notGradedGatePasses = useMemo(() => {
    return farmerIncomingGatePasses.filter(
      (gatePass) => gatePass.status === 'NOT_GRADED'
    );
  }, [farmerIncomingGatePasses]);

  const varietyOptions = useMemo<Option<string>[]>(() => {
    const uniqueVarieties = Array.from(
      new Set(
        notGradedGatePasses
          .map((gatePass) => gatePass.variety?.trim())
          .filter((variety): variety is string => Boolean(variety))
      )
    );

    return uniqueVarieties.map((variety) => ({
      label: variety,
      value: variety,
    }));
  }, [notGradedGatePasses]);

  const filteredGatePasses = useMemo(() => {
    if (!selectedVariety) return [];

    return notGradedGatePasses.filter(
      (gatePass) => gatePass.variety === selectedVariety
    );
  }, [notGradedGatePasses, selectedVariety]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Link Incoming gate pass</Button>
      </DialogTrigger>

      <DialogContent className="font-custom max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Link Incoming gate pass</DialogTitle>
          <DialogDescription>
            Select farmer and variety to link an incoming gate pass.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="space-y-6 py-2">
          <Field>
            <FieldLabel
              htmlFor="link-farmer-select"
              className="font-custom mb-2 block text-base font-semibold"
            >
              Enter Account Name (search and select)
            </FieldLabel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <SearchSelector
                  id="link-farmer-select"
                  options={farmerOptions}
                  placeholder="Search or Create Farmer"
                  searchPlaceholder="Search by name, account number, or mobile..."
                  className="w-full"
                  buttonClassName="w-full justify-between"
                  value={selectedFarmerLinkId}
                  onSelect={(value) => {
                    setSelectedFarmerLinkId(value);
                    setSelectedVariety('');
                    setSelectedIncomingGatePassId(null);
                  }}
                />
              </div>
              <AddFarmerModal links={farmerLinks} onFarmerAdded={() => {}} />
            </div>
          </Field>

          <Field>
            <div className="border-primary/30 bg-primary/5 space-y-2 rounded-lg border p-4">
              <FieldLabel
                htmlFor="link-variety-select"
                className="font-custom block text-base font-semibold"
              >
                Select Variety
              </FieldLabel>
              <p className="font-custom text-sm text-[#6f6f6f]">
                Variety options are derived from this farmer&apos;s NOT_GRADED
                incoming gate passes.
              </p>
              <SearchSelector
                id="link-variety-select"
                options={varietyOptions}
                placeholder="Select a variety"
                searchPlaceholder="Search variety..."
                className="w-full"
                buttonClassName="w-full justify-between"
                value={selectedVariety}
                onSelect={(value) => setSelectedVariety(value)}
                disabled={!selectedFarmerLinkId || isLoadingGatePasses}
              />
            </div>
          </Field>

          {selectedFarmerLinkId ? (
            <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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

                  <div className="divide-y divide-gray-100">
                    {isLoadingGatePasses ? (
                      <div className="text-muted-foreground px-4 py-8 text-sm sm:px-6">
                        Loading incoming gate passes...
                      </div>
                    ) : !selectedVariety ? (
                      <div className="text-muted-foreground px-4 py-8 text-sm sm:px-6">
                        Select a variety to view incoming gate passes.
                      </div>
                    ) : filteredGatePasses.length === 0 ? (
                      <div className="text-muted-foreground px-4 py-8 text-sm sm:px-6">
                        No NOT_GRADED incoming gate passes found for this
                        variety.
                      </div>
                    ) : (
                      filteredGatePasses.map((gatePass) => (
                        <div
                          key={gatePass._id}
                          className="grid grid-cols-[60px_1.2fr_1.2fr_1fr_1.5fr_100px_130px_120px] items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 sm:px-6"
                        >
                          <div className="flex justify-center">
                            <Checkbox
                              className="h-5 w-5 rounded-md"
                              checked={
                                selectedIncomingGatePassId === gatePass._id
                              }
                              onCheckedChange={(checked) =>
                                setSelectedIncomingGatePassId(
                                  checked ? gatePass._id : null
                                )
                              }
                            />
                          </div>

                          <div className="text-base font-semibold text-gray-900">
                            {gatePass.manualGatePassNumber ||
                              gatePass.gatePassNo}
                          </div>

                          <div className="text-sm font-medium text-gray-600">
                            {gatePass.date
                              ? format(new Date(gatePass.date), 'd MMM yyyy')
                              : '--'}
                          </div>

                          <div className="text-base font-semibold text-gray-900">
                            {gatePass.variety || '--'}
                          </div>

                          <div className="text-sm font-semibold tracking-wide text-gray-600">
                            {gatePass.truckNumber || '--'}
                          </div>

                          <div className="text-base font-semibold text-gray-900">
                            {gatePass.bagsReceived || 0}
                          </div>

                          <div>
                            <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-700">
                              {gatePass.status}
                            </span>
                          </div>

                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if (!gradingGatePassId) return;
                                linkIncomingGatePass(
                                  {
                                    gradingGatePassId,
                                    incomingGatePassIds: [gatePass._id],
                                  },
                                  {
                                    onSuccess: (data) => {
                                      if (!data.success) return;
                                      setSelectedIncomingGatePassId(null);
                                    },
                                  }
                                );
                              }}
                              disabled={!gradingGatePassId || isLinking}
                            >
                              {isLinking &&
                              selectedIncomingGatePassId === gatePass._id
                                ? 'Linking...'
                                : 'Link'}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </FieldGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkIncomingGatePassDialog;
