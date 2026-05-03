import { memo, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { useGetIncomingGatePasses } from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import type {
  GradingGatePass,
  GradingGatePassIncomingRef,
} from '@/types/grading-gate-pass';

type IncomingSelectionStepProps = {
  pass: GradingGatePass;
  onNext: (selection: { selectedIds: string[]; variety: string }) => void;
};

function getBagsFromPass(pass: { bagsReceived?: number }): number {
  return Number(pass.bagsReceived ?? 0);
}

function getInitialFarmerStorageLinkId(pass: GradingGatePass): string {
  const firstIncoming = pass.incomingGatePassIds?.[0];
  const farmerStorageLinkId = firstIncoming?.farmerStorageLinkId;
  if (farmerStorageLinkId && typeof farmerStorageLinkId === 'object') {
    return farmerStorageLinkId._id;
  }
  return '';
}

export const IncomingSelectionStep = memo(function IncomingSelectionStep({
  pass,
  onNext,
}: IncomingSelectionStepProps) {
  const { data: farmerLinks, isLoading: isLoadingFarmers } = useGetAllFarmers();
  const [farmerStorageLinkId, setFarmerStorageLinkId] = useState(
    () => getInitialFarmerStorageLinkId(pass) || ''
  );
  const [variety, setVariety] = useState(() => pass.variety?.trim() || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((pass.incomingGatePassIds ?? []).map((gp) => gp._id))
  );
  const {
    data: incomingResponse,
    isLoading: isLoadingIncoming,
    isFetching: isFetchingIncoming,
  } = useGetIncomingGatePasses(
    {
      status: 'NOT_GRADED',
      limit: 500,
      sortOrder: 'desc',
    },
    { enabled: true }
  );

  const farmerOptions: Option<string>[] = useMemo(() => {
    return (farmerLinks ?? [])
      .filter((link) => link.isActive)
      .map((link) => ({
        value: link._id,
        label: `${link.farmerId.name} (Account #${link.accountNumber})`,
        searchableText: `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber} ${link.farmerId.address ?? ''}`,
      }));
  }, [farmerLinks]);

  const existingIncomingById = useMemo(() => {
    return new Map((pass.incomingGatePassIds ?? []).map((gp) => [gp._id, gp]));
  }, [pass.incomingGatePassIds]);

  const farmerIncoming = useMemo(() => {
    const incomingList = incomingResponse?.data ?? [];
    const ungradedForFarmer = incomingList.filter((incoming) => {
      const link = incoming.farmerStorageLinkId;
      if (!link || typeof link === 'string') return false;
      return link._id === farmerStorageLinkId;
    });

    const existingIncoming = (pass.incomingGatePassIds ?? []).filter((gp) => {
      const link = gp.farmerStorageLinkId;
      if (!link || typeof link !== 'object') return false;
      return link._id === farmerStorageLinkId;
    });

    const mergedById = new Map<string, GradingGatePassIncomingRef>();
    for (const incoming of ungradedForFarmer) {
      mergedById.set(incoming._id, incoming as GradingGatePassIncomingRef);
    }
    for (const incoming of existingIncoming) {
      mergedById.set(incoming._id, incoming);
    }

    return [...mergedById.values()];
  }, [farmerStorageLinkId, incomingResponse?.data, pass.incomingGatePassIds]);

  const varietyOptions: Option<string>[] = useMemo(() => {
    const uniqueVarieties = new Set<string>();
    for (const incoming of farmerIncoming) {
      if (incoming.variety) uniqueVarieties.add(incoming.variety);
    }
    return [...uniqueVarieties]
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({
        value: v,
        label: v,
        searchableText: v,
      }));
  }, [farmerIncoming]);

  const filteredPasses = useMemo(() => {
    if (!variety) return [];
    return farmerIncoming.filter((incoming) => incoming.variety === variety);
  }, [farmerIncoming, variety]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const allSelected =
      filteredPasses.length > 0 &&
      filteredPasses.every((incoming) => selectedIds.has(incoming._id));
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredPasses.map((incoming) => incoming._id)));
  };

  const selectedCount = useMemo(
    () =>
      filteredPasses.filter((incoming) => selectedIds.has(incoming._id)).length,
    [filteredPasses, selectedIds]
  );

  const totalBagsSelected = useMemo(() => {
    return filteredPasses
      .filter((incoming) => selectedIds.has(incoming._id))
      .reduce((sum, incoming) => sum + getBagsFromPass(incoming), 0);
  }, [filteredPasses, selectedIds]);

  const handleFarmerChange = (value: string | '') => {
    setFarmerStorageLinkId(value);
    setVariety('');
    setSelectedIds(new Set());
  };

  const handleVarietyChange = (value: string | '') => {
    setVariety(value);
    setSelectedIds(new Set());
  };

  const handleNext = () => {
    const ids = [...selectedIds].filter((id) => {
      return filteredPasses.some((incoming) => incoming._id === id);
    });
    if (ids.length === 0) return;
    onNext({ selectedIds: ids, variety });
  };

  return (
    <div className="font-custom flex flex-col space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-custom text-foreground text-base font-semibold sm:text-lg">
            Step 0: Select incoming gate passes
          </CardTitle>
          <p className="text-muted-foreground font-custom text-sm">
            Select farmer and variety first, then choose incoming gate passes to
            keep in this grading voucher.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-0 pb-6">
          <Field>
            <FieldLabel
              htmlFor="grading-edit-selection-farmer"
              className="font-custom text-base font-semibold"
            >
              Farmer
            </FieldLabel>
            <SearchSelector
              id="grading-edit-selection-farmer"
              options={farmerOptions}
              placeholder="Select farmer"
              searchPlaceholder="Search by name, account number, or mobile..."
              value={farmerStorageLinkId}
              onSelect={(value) => handleFarmerChange(value ?? '')}
              loading={isLoadingFarmers}
              loadingMessage="Loading farmers..."
              emptyMessage="No farmers found"
              className="w-full"
              buttonClassName="w-full justify-between"
            />
          </Field>

          <Field>
            <FieldLabel
              htmlFor="grading-edit-selection-variety"
              className="font-custom text-base font-semibold"
            >
              Variety
            </FieldLabel>
            <SearchSelector
              id="grading-edit-selection-variety"
              options={varietyOptions}
              placeholder={
                farmerStorageLinkId ? 'Select variety' : 'Select a farmer first'
              }
              searchPlaceholder="Search variety..."
              value={variety}
              onSelect={(value) => handleVarietyChange(value ?? '')}
              disabled={!farmerStorageLinkId}
              emptyMessage="No varieties available for this farmer"
              className="w-full"
              buttonClassName="w-full justify-between"
            />
          </Field>
        </CardContent>
      </Card>

      {farmerStorageLinkId && variety ? (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="font-custom text-foreground text-base font-semibold sm:text-lg">
                Select linked incoming passes
              </CardTitle>
              {filteredPasses.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-custom w-full sm:w-auto"
                  onClick={selectAll}
                >
                  {selectedCount === filteredPasses.length
                    ? 'Deselect all'
                    : 'Select all'}
                </Button>
              ) : null}
            </div>
            <p className="text-muted-foreground font-custom text-sm">
              Ungraded passes are listed. Existing linked passes are also shown,
              even if their status is no longer ungraded.
            </p>
          </CardHeader>
          <CardContent className="px-6 pt-0 pb-6">
            {isLoadingIncoming || isFetchingIncoming ? (
              <div className="font-custom border-border/60 bg-muted/10 flex min-h-[120px] items-center justify-center rounded-lg border py-8">
                <p className="text-muted-foreground text-sm">
                  Loading incoming gate passes...
                </p>
              </div>
            ) : filteredPasses.length === 0 ? (
              <div className="font-custom border-border/60 bg-muted/10 flex min-h-[120px] items-center justify-center rounded-lg border py-8">
                <p className="text-muted-foreground text-center text-sm">
                  No incoming gate passes found for this farmer and variety.
                </p>
              </div>
            ) : (
              <div className="border-border/60 max-h-[min(70vh,36rem)] min-h-64 overflow-y-auto rounded-lg border">
                <table className="font-custom w-full text-sm">
                  <thead className="border-border/60 bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-muted-foreground w-10 px-3 py-3 text-left">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-left font-semibold">
                        Gate Pass #
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-right font-semibold">
                        Bags
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPasses.map((incoming) => {
                      const isSelected = selectedIds.has(incoming._id);
                      const originalIncoming = existingIncomingById.get(
                        incoming._id
                      );
                      const isOriginallyLinked = Boolean(originalIncoming);
                      return (
                        <tr
                          key={incoming._id}
                          className="border-border/40 hover:bg-muted/30 cursor-pointer border-b last:border-0"
                          onClick={() => toggleId(incoming._id)}
                        >
                          <td
                            className="w-10 px-3 py-2.5"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleId(incoming._id)}
                              aria-label={`Select gate pass #${incoming.gatePassNo}`}
                            />
                          </td>
                          <td className="text-foreground px-4 py-2.5 font-medium">
                            #{incoming.gatePassNo}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5">
                            {isOriginallyLinked
                              ? 'Already linked'
                              : incoming.status}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                            {getBagsFromPass(incoming)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-border/60 bg-muted/30 sticky bottom-0">
                    <tr className="font-semibold">
                      <td className="text-foreground px-4 py-3" colSpan={3}>
                        Selected: {selectedCount} pass
                        {selectedCount === 1 ? '' : 'es'}
                        {' · '}Total bags
                      </td>
                      <td className="text-foreground px-4 py-3 text-right tabular-nums">
                        {totalBagsSelected}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {farmerStorageLinkId && variety && filteredPasses.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="default"
            size="lg"
            className="font-custom font-bold"
            disabled={selectedCount === 0}
            onClick={handleNext}
          >
            Next: Edit voucher
          </Button>
        </div>
      ) : null}
    </div>
  );
});
