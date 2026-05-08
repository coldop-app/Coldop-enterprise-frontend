import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldGroup } from '@/components/ui/field';
import { useGetIncomingGatePassesOfFarmer } from '@/services/store-admin/general/useGetIncomingGatePassesOfFarmer';
import { useLinkIncomingGatePasses } from '@/services/store-admin/general/useLinkIncomingGatePasses';

type LinkIncomingGatePassDialogProps = {
  gradingGatePassId: string;
  farmerStorageLinkId: string;
  farmerName: string;
  variety: string;
  open: boolean;
  setOpen: (open: boolean) => void;
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
  if (status === 'NOT_GRADED') return 'bg-green-100 text-green-700';
  if (status === 'GRADED') return 'bg-blue-100 text-blue-700';
  if (status === 'PARTIALLY_GRADED') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
};

const LinkIncomingGatePassDialog = ({
  gradingGatePassId,
  farmerStorageLinkId,
  farmerName,
  variety,
  open,
  setOpen,
}: LinkIncomingGatePassDialogProps) => {
  const {
    data: farmerIncomingGatePasses = [],
    isLoading,
    isError,
    error,
  } = useGetIncomingGatePassesOfFarmer(farmerStorageLinkId);
  const { mutateAsync: linkIncomingGatePasses, isPending: isLinking } =
    useLinkIncomingGatePasses();

  const eligibleGatePasses = useMemo(() => {
    const normalizedVariety = variety.trim();

    return farmerIncomingGatePasses.filter((gatePass) => {
      if (gatePass.status !== 'NOT_GRADED') return false;

      // Only show gate passes for the exact same variety.
      if (!normalizedVariety) return true;

      return gatePass.variety?.trim() === normalizedVariety;
    });
  }, [farmerIncomingGatePasses, variety]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="font-custom max-h-[85vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Link Incoming gate pass</DialogTitle>
            <DialogDescription>
              Select the incoming gate pass for {farmerName || 'this farmer'}{' '}
              for the {variety || 'selected'} variety to link it with this
              grading gate pass.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="space-y-6 py-2">
            {!farmerStorageLinkId ? (
              <div className="font-custom text-muted-foreground rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm sm:px-6">
                Select a farmer account on this step first; then you can link an
                incoming gate pass here.
              </div>
            ) : (
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

                    {isLoading ? (
                      <div className="font-custom px-4 py-8 text-center text-sm text-gray-500 sm:px-6">
                        Loading incoming gate passes...
                      </div>
                    ) : isError ? (
                      <div className="font-custom px-4 py-8 text-center text-sm text-red-600 sm:px-6">
                        {error instanceof Error
                          ? error.message
                          : 'Failed to load incoming gate passes.'}
                      </div>
                    ) : eligibleGatePasses.length === 0 ? (
                      <div className="font-custom px-4 py-8 text-center text-sm text-gray-500 sm:px-6">
                        {`No NOT_GRADED incoming gate passes found for ${farmerName || 'this farmer'} for variety "${variety}".`}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {eligibleGatePasses.map((gatePass) => (
                          <div
                            key={gatePass._id}
                            className="grid grid-cols-[60px_1.2fr_1.2fr_1fr_1.5fr_100px_130px_120px] items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 sm:px-6"
                          >
                            <div className="flex justify-center">
                              <Checkbox className="h-5 w-5 rounded-md" />
                            </div>

                            <div className="text-base font-semibold text-gray-900">
                              {gatePass.manualGatePassNumber ||
                                gatePass.gatePassNo ||
                                '--'}
                            </div>

                            <div className="text-sm font-medium text-gray-600">
                              {formatDisplayDate(gatePass.date)}
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
                              <span
                                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusBadgeClassName(gatePass.status)}`}
                              >
                                {gatePass.status || '--'}
                              </span>
                            </div>

                            <div>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="font-custom"
                                disabled={isLinking || !gradingGatePassId}
                                onClick={async () => {
                                  await linkIncomingGatePasses({
                                    gradingGatePassId,
                                    incomingGatePassIds: [gatePass._id],
                                  });
                                  setOpen(false);
                                }}
                              >
                                Link
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
    </>
  );
};

export default LinkIncomingGatePassDialog;
