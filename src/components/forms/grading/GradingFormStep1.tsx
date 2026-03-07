import { memo, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { SearchSelector } from '@/components/forms/search-selector';
import type { Option } from '@/components/forms/search-selector';
import { useGetAllFarmers } from '@/services/store-admin/functions/useGetAllFarmers';
import {
  useGetIncomingGatePasses,
  INCOMING_GATE_PASS_STATUS_NOT_GRADED,
} from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';

import { POTATO_VARIETIES } from './constants';

export interface GradingFormStep1Props {
  initialSelectedIds?: string[];
  onNext: (selectedIds: string[]) => void;
}

function getDefaultDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const year = now.getFullYear();
  const dateFrom = `${year}-01-01`;
  const dateTo = now.toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

function getBagsFromPass(pass: IncomingGatePassWithLink): number {
  if (pass.bagsReceived != null) return pass.bagsReceived;
  if (pass.bagSizes?.length)
    return pass.bagSizes.reduce((sum, b) => sum + b.initialQuantity, 0);
  return 0;
}

function getFarmerStorageLinkId(pass: IncomingGatePassWithLink): string {
  const link = pass.farmerStorageLinkId;
  return typeof link === 'string' ? link : (link?._id ?? '');
}

function getVarietyLabel(varietyValue: string): string {
  const found = POTATO_VARIETIES.find((v) => v.value === varietyValue);
  return found?.label ?? varietyValue;
}

export const GradingFormStep1 = memo(function GradingFormStep1({
  initialSelectedIds = [],
  onNext,
}: GradingFormStep1Props) {
  const { data: farmerLinks, isLoading: isLoadingFarmers } = useGetAllFarmers();
  const [farmerStorageLinkId, setFarmerStorageLinkId] = useState('');
  const [variety, setVariety] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    initialSelectedIds.length > 0 ? new Set(initialSelectedIds) : new Set()
  );

  const { dateFrom, dateTo } = getDefaultDateRange();
  const { data: incomingResult, isLoading: isLoadingPasses } =
    useGetIncomingGatePasses({
      page: 1,
      limit: 50,
      sortOrder: 'desc',
      status: INCOMING_GATE_PASS_STATUS_NOT_GRADED,
      dateFrom,
      dateTo,
    });
  const incomingGatePassesList = incomingResult?.data ?? [];

  /** Farmer link IDs that have at least one ungraded incoming gate pass */
  const farmerLinkIdsWithPasses = useMemo(() => {
    const set = new Set<string>();
    for (const pass of incomingGatePassesList) {
      const linkId = getFarmerStorageLinkId(pass);
      if (linkId) set.add(linkId);
    }
    return set;
  }, [incomingGatePassesList]);

  /** Only farmers that have an incoming gate pass (ungraded) */
  const farmerOptions: Option<string>[] = useMemo(() => {
    if (!farmerLinks) return [];
    return farmerLinks
      .filter((link) => link.isActive && farmerLinkIdsWithPasses.has(link._id))
      .map((link) => ({
        value: link._id,
        label: `${link.farmerId.name} (Account #${link.accountNumber})`,
        searchableText: `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber} ${link.farmerId.address ?? ''}`,
      }));
  }, [farmerLinks, farmerLinkIdsWithPasses]);

  /** Varieties that appear in the selected farmer's ungraded incoming gate passes */
  const varietyOptions: Option<string>[] = useMemo(() => {
    if (!farmerStorageLinkId) return [];
    const varieties = new Set<string>();
    for (const pass of incomingGatePassesList) {
      if (
        getFarmerStorageLinkId(pass) === farmerStorageLinkId &&
        pass.variety
      ) {
        varieties.add(pass.variety);
      }
    }
    return Array.from(varieties)
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({
        value: v,
        label: getVarietyLabel(v),
        searchableText: getVarietyLabel(v),
      }));
  }, [incomingGatePassesList, farmerStorageLinkId]);

  const filteredPasses = useMemo(() => {
    if (!farmerStorageLinkId || !variety) return [];
    return incomingGatePassesList.filter((pass) => {
      const linkId = getFarmerStorageLinkId(pass);
      return linkId === farmerStorageLinkId && pass.variety === variety;
    });
  }, [incomingGatePassesList, farmerStorageLinkId, variety]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredPasses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPasses.map((p) => p._id)));
    }
  };

  const totalBagsSelected = useMemo(
    () =>
      filteredPasses
        .filter((p) => selectedIds.has(p._id))
        .reduce((sum, p) => sum + getBagsFromPass(p), 0),
    [filteredPasses, selectedIds]
  );

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
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onNext(ids);
  };

  const canShowPasses = Boolean(farmerStorageLinkId && variety);
  const showPassesSection = canShowPasses;

  if (isLoadingFarmers || isLoadingPasses) {
    return (
      <div className="font-custom border-border/60 bg-muted/20 flex min-h-[200px] items-center justify-center rounded-lg border">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (incomingGatePassesList.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="px-6 py-8">
          <p className="text-muted-foreground font-custom text-center text-sm">
            No ungraded incoming gate passes found. Only farmers with at least
            one ungraded incoming gate pass can be selected for grading.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="font-custom flex flex-col space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-custom text-foreground text-base font-semibold sm:text-lg">
            Step 1: Select farmer and variety
          </CardTitle>
          <p className="text-muted-foreground font-custom text-sm">
            First choose the farmer and variety. Then you can select which
            ungraded incoming gate passes to include.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-0 pb-6">
          <Field>
            <FieldLabel
              htmlFor="grading-step1-farmer"
              className="font-custom text-base font-semibold"
            >
              Farmer
            </FieldLabel>
            <SearchSelector
              id="grading-step1-farmer"
              options={farmerOptions}
              placeholder="Select farmer"
              searchPlaceholder="Search by name, account number, or mobile..."
              value={farmerStorageLinkId}
              onSelect={(value) => handleFarmerChange(value ?? '')}
              loading={isLoadingFarmers}
              loadingMessage="Loading farmers..."
              emptyMessage="No farmers with ungraded incoming gate passes"
              className="w-full"
              buttonClassName="w-full justify-between"
            />
          </Field>

          <Field>
            <FieldLabel
              htmlFor="grading-step1-variety"
              className="font-custom text-base font-semibold"
            >
              Variety
            </FieldLabel>
            <SearchSelector
              id="grading-step1-variety"
              options={varietyOptions}
              placeholder={
                farmerStorageLinkId ? 'Select variety' : 'Select a farmer first'
              }
              searchPlaceholder="Search variety..."
              value={variety}
              onSelect={(value) => handleVarietyChange(value ?? '')}
              disabled={!farmerStorageLinkId}
              emptyMessage="No varieties for this farmer's ungraded passes"
              className="w-full"
              buttonClassName="w-full justify-between"
            />
          </Field>
        </CardContent>
      </Card>

      {showPassesSection && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="font-custom text-foreground text-base font-semibold sm:text-lg">
                Select incoming gate passes (ungraded only)
              </CardTitle>
              {filteredPasses.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-custom w-full sm:w-auto"
                  onClick={selectAll}
                >
                  {selectedIds.size === filteredPasses.length
                    ? 'Deselect all'
                    : 'Select all'}
                </Button>
              )}
            </div>
            <p className="text-muted-foreground font-custom text-sm">
              Only passes with status Ungraded are listed. Choose one or more to
              grade.
            </p>
          </CardHeader>
          <CardContent className="px-6 pt-0 pb-6">
            {isLoadingPasses ? (
              <div className="font-custom border-border/60 bg-muted/10 flex min-h-[120px] items-center justify-center rounded-lg border py-8">
                <p className="text-muted-foreground text-sm">
                  Loading ungraded incoming gate passes...
                </p>
              </div>
            ) : filteredPasses.length === 0 ? (
              <div className="font-custom border-border/60 bg-muted/10 flex min-h-[120px] items-center justify-center rounded-lg border py-8">
                <p className="text-muted-foreground text-center text-sm">
                  No ungraded incoming gate passes found for this farmer and
                  variety.
                </p>
              </div>
            ) : (
              <div className="border-border/60 max-h-[min(60vh,24rem)] overflow-y-auto rounded-lg border">
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
                        Variety
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-right font-semibold">
                        Bags
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPasses.map((pass) => {
                      const bags = getBagsFromPass(pass);
                      const isSelected = selectedIds.has(pass._id);
                      return (
                        <tr
                          key={pass._id}
                          className="border-border/40 hover:bg-muted/30 cursor-pointer border-b last:border-0"
                          onClick={() => toggleId(pass._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleId(pass._id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                        >
                          <td
                            className="w-10 px-3 py-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleId(pass._id)}
                              aria-label={`Select gate pass #${pass.gatePassNo}`}
                            />
                          </td>
                          <td className="text-foreground px-4 py-2.5 font-medium">
                            #{pass.gatePassNo}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5">
                            {pass.variety ?? '—'}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                            {bags}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-border/60 bg-muted/30 sticky bottom-0">
                    <tr className="font-semibold">
                      <td className="text-foreground px-4 py-3" colSpan={3}>
                        Selected: {selectedIds.size} pass
                        {selectedIds.size !== 1 ? 'es' : ''} · Total bags
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
      )}

      {showPassesSection && filteredPasses.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="default"
            size="lg"
            className="font-custom font-bold"
            onClick={handleNext}
            disabled={selectedIds.size === 0}
          >
            Next: Enter quantities
          </Button>
        </div>
      )}
    </div>
  );
});
