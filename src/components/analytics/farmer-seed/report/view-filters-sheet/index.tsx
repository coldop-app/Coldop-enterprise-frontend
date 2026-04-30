import * as React from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ChevronDown,
  Columns3,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  createDefaultCondition,
  createDefaultFilterGroup,
  getDefaultOperatorForField,
  hasAnyUsableFilter,
  isAdvancedFilterGroup,
  type FilterField,
  type FilterGroupNode,
  type FilterOperator,
} from '@/lib/advanced-filters';
import type { FilterableColumnId, ViewFiltersSheetProps } from './types';
import {
  advancedFilterFields,
  filterableColumns,
  getEmptyValueFilters,
  getInitialExpandedFilters,
  getInitialSearchQueries,
} from './constants';
import {
  mutateFilterNodeById,
  parseGroupingColumnId,
  parseGroupingSlotIndex,
  removeFilterNodeById,
} from './helpers';
import {
  EmptyState,
  GroupingDropZone,
  SectionLabel,
  SortableColumnRow,
  SortableGroupingRow,
} from './primitives';
import { LogicBuilder } from './logic-builder';

const columnLabels: Record<string, string> = {
  gatePassNo: 'Gate Pass No',
  invoiceNumber: 'Invoice Number',
  date: 'Date',
  farmerName: 'Farmer',
  farmerAddress: 'Address',
  accountNumber: 'Account #',
  variety: 'Variety',
  generation: 'Generation',
  totalBags: 'Bags',
  totalAcres: 'Acres',
  averageRate: 'Avg Rate',
  totalAmount: 'Amount',
  remarks: 'Remarks',
};

const getInitialValueFilterTouched = (): Record<
  FilterableColumnId,
  boolean
> => ({
  gatePassNo: false,
  date: false,
  farmerName: false,
  variety: false,
  bagsReceived: false,
  netWeightKg: false,
});

export function ViewFiltersSheet({
  open,
  onOpenChange,
  table,
  defaultColumnOrder,
  onColumnResizeModeChange,
  onColumnResizeDirectionChange,
}: ViewFiltersSheetProps) {
  const [activeTab, setActiveTab] = React.useState('filters');
  const [searchQueries, setSearchQueries] = React.useState<
    Record<FilterableColumnId, string>
  >(getInitialSearchQueries());
  const [expandedFilters, setExpandedFilters] = React.useState<
    Record<FilterableColumnId, boolean>
  >(getInitialExpandedFilters());

  const hidableColumns = React.useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table]
  );
  const hidableColumnIds = React.useMemo(
    () => hidableColumns.map((column) => column.id),
    [hidableColumns]
  );

  const [draftColumnVisibility, setDraftColumnVisibility] = React.useState<
    Record<string, boolean>
  >(() => {
    const visibility: Record<string, boolean> = {};
    hidableColumns.forEach((column) => {
      visibility[column.id] = column.getIsVisible();
    });
    return visibility;
  });
  const [draftColumnOrder, setDraftColumnOrder] = React.useState<string[]>(
    () => {
      const activeOrder = table.getState().columnOrder;
      const validOrder = (
        activeOrder.length ? activeOrder : defaultColumnOrder
      ).filter((id) => hidableColumnIds.includes(id));
      const missing = hidableColumnIds.filter((id) => !validOrder.includes(id));
      return [...validOrder, ...missing];
    }
  );
  const [draftGrouping, setDraftGrouping] = React.useState<string[]>([]);
  const [draftLogicFilter, setDraftLogicFilter] =
    React.useState<FilterGroupNode>(createDefaultFilterGroup());
  const [draftValueFilters, setDraftValueFilters] = React.useState<
    Record<FilterableColumnId, string[]>
  >(getEmptyValueFilters());
  const [valueFilterTouched, setValueFilterTouched] = React.useState<
    Record<FilterableColumnId, boolean>
  >(getInitialValueFilterTouched());

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );
  const coreRowCount = table.getCoreRowModel().rows.length;

  const getUniqueColumnValues = React.useCallback(
    (columnId: string): string[] => {
      void coreRowCount;
      const facetedValues = table.getColumn(columnId)?.getFacetedUniqueValues();
      let values = facetedValues ? Array.from(facetedValues.keys()) : [];

      if (values.length === 0) {
        const uniqueValues = new Set<string>();
        table.getCoreRowModel().rows.forEach((row) => {
          const rawValue = row.getValue(columnId);
          if (rawValue === undefined || rawValue === null) return;
          const normalized = String(rawValue).trim();
          if (normalized.length > 0) {
            uniqueValues.add(normalized);
          }
        });
        values = Array.from(uniqueValues);
      }

      return values
        .map((value) => String(value))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    },
    [table, coreRowCount]
  );

  const availableFilterOptions = React.useMemo<
    Record<FilterableColumnId, string[]>
  >(() => {
    const options = {
      gatePassNo: [],
      date: [],
      farmerName: [],
      variety: [],
      bagsReceived: [],
      netWeightKg: [],
    } as Record<FilterableColumnId, string[]>;

    filterableColumns.forEach(({ id }) => {
      const mappedColumnId =
        id === 'bagsReceived'
          ? 'totalBags'
          : id === 'netWeightKg'
            ? 'totalAcres'
            : id;
      options[id] = getUniqueColumnValues(mappedColumnId);
    });
    return options;
  }, [getUniqueColumnValues]);

  const advancedFieldValueOptions = React.useMemo<
    Record<FilterField, string[]>
  >(() => {
    const options = {
      gatePassNo: [],
      manualGatePassNumber: [],
      date: [],
      farmerName: [],
      variety: [],
      totalBags: [],
      bagsReceived: [],
      netWeightKg: [],
      status: [],
      location: [],
      truckNumber: [],
    } as Record<FilterField, string[]>;

    advancedFilterFields.forEach(({ id }) => {
      const mappedColumnId =
        id === 'bagsReceived'
          ? 'totalBags'
          : id === 'netWeightKg'
            ? 'totalAcres'
            : id;
      options[id] = getUniqueColumnValues(mappedColumnId);
    });
    return options;
  }, [getUniqueColumnValues]);

  const syncDraftFromTable = React.useCallback(() => {
    const visibility: Record<string, boolean> = {};
    hidableColumns.forEach((column) => {
      visibility[column.id] = column.getIsVisible();
    });

    const activeOrder = table.getState().columnOrder;
    const validOrder = (
      activeOrder.length ? activeOrder : defaultColumnOrder
    ).filter((id) => hidableColumnIds.includes(id));
    const missing = hidableColumnIds.filter((id) => !validOrder.includes(id));
    const nextValueFilters = getEmptyValueFilters();

    filterableColumns.forEach(({ id }) => {
      const mappedColumnId =
        id === 'bagsReceived'
          ? 'totalBags'
          : id === 'netWeightKg'
            ? 'totalAcres'
            : id;
      const rawFilter = table.getColumn(mappedColumnId)?.getFilterValue();
      nextValueFilters[id] = Array.isArray(rawFilter)
        ? rawFilter.map((value) => String(value))
        : [...availableFilterOptions[id]];
    });

    setDraftColumnVisibility(visibility);
    setDraftColumnOrder([...validOrder, ...missing]);
    setDraftGrouping(table.getState().grouping);
    setDraftValueFilters(nextValueFilters);
    const activeGlobalFilter = table.getState().globalFilter;
    setDraftLogicFilter(
      isAdvancedFilterGroup(activeGlobalFilter)
        ? activeGlobalFilter
        : createDefaultFilterGroup()
    );
  }, [
    availableFilterOptions,
    defaultColumnOrder,
    hidableColumnIds,
    hidableColumns,
    table,
  ]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) return;
      syncDraftFromTable();
      setValueFilterTouched(getInitialValueFilterTouched());
      setActiveTab('filters');
    },
    [onOpenChange, syncDraftFromTable]
  );

  const handleResetAll = React.useCallback(() => {
    table.setColumnVisibility(table.initialState.columnVisibility ?? {});
    table.setColumnOrder(defaultColumnOrder);
    table.resetColumnFilters();
    table.setGrouping([]);
    table.setGlobalFilter('');
    table.resetColumnSizing();
    onColumnResizeModeChange('onChange');
    onColumnResizeDirectionChange('ltr');
    syncDraftFromTable();
    setSearchQueries(getInitialSearchQueries());
    setExpandedFilters(getInitialExpandedFilters());
    setValueFilterTouched(getInitialValueFilterTouched());
  }, [
    defaultColumnOrder,
    onColumnResizeDirectionChange,
    onColumnResizeModeChange,
    syncDraftFromTable,
    table,
  ]);

  const getEffectiveDraftValues = React.useCallback(
    (columnId: FilterableColumnId) => {
      const selected = draftValueFilters[columnId];
      if (valueFilterTouched[columnId] || selected.length > 0) return selected;
      return availableFilterOptions[columnId];
    },
    [availableFilterOptions, draftValueFilters, valueFilterTouched]
  );

  const handleApplyView = React.useCallback(() => {
    table.setColumnVisibility(draftColumnVisibility);
    table.setColumnOrder(draftColumnOrder);
    table.setGrouping(draftGrouping);

    filterableColumns.forEach(({ id }) => {
      const allValues = availableFilterOptions[id];
      const selected = getEffectiveDraftValues(id);
      const mappedColumnId =
        id === 'bagsReceived'
          ? 'totalBags'
          : id === 'netWeightKg'
            ? 'totalAcres'
            : id;
      table
        .getColumn(mappedColumnId)
        ?.setFilterValue(
          selected.length === allValues.length ? undefined : selected
        );
    });

    if (hasAnyUsableFilter(draftLogicFilter)) {
      table.setGlobalFilter(draftLogicFilter);
    } else if (isAdvancedFilterGroup(table.getState().globalFilter)) {
      table.setGlobalFilter('');
    }
    onOpenChange(false);
  }, [
    availableFilterOptions,
    draftColumnOrder,
    draftColumnVisibility,
    draftGrouping,
    draftLogicFilter,
    getEffectiveDraftValues,
    onOpenChange,
    table,
  ]);

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftColumnOrder((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const [activeGroupingDropIndex, setActiveGroupingDropIndex] = React.useState<
    number | null
  >(null);
  const handleGroupingDragMove = (event: {
    over: { id: string | number } | null;
  }) => {
    if (!event.over) {
      setActiveGroupingDropIndex(null);
      return;
    }
    const overId = String(event.over.id);
    if (overId.startsWith('grouping-slot:')) {
      const index = parseGroupingSlotIndex(overId);
      if (!Number.isNaN(index)) {
        setActiveGroupingDropIndex(index);
        return;
      }
    }
    if (overId.startsWith('grouping-item:')) {
      const columnId = parseGroupingColumnId(overId);
      const overIndex = draftGrouping.findIndex((id) => id === columnId);
      setActiveGroupingDropIndex(overIndex >= 0 ? overIndex : null);
      return;
    }
    setActiveGroupingDropIndex(null);
  };

  const handleGroupingDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGroupingDropIndex(null);
    if (!over) return;
    const activeId = String(active.id);
    if (!activeId.startsWith('grouping-item:')) return;

    const activeColumnId = parseGroupingColumnId(activeId);
    let targetIndex: number | null = null;
    const overId = String(over.id);
    if (overId.startsWith('grouping-slot:')) {
      const parsedIndex = parseGroupingSlotIndex(overId);
      if (!Number.isNaN(parsedIndex)) targetIndex = parsedIndex;
    } else if (overId.startsWith('grouping-item:')) {
      const overColumnId = parseGroupingColumnId(overId);
      const overIndex = draftGrouping.findIndex((id) => id === overColumnId);
      if (overIndex >= 0) targetIndex = overIndex;
    }

    if (targetIndex === null) return;
    setDraftGrouping((current) => {
      const currentIndex = current.indexOf(activeColumnId);
      if (currentIndex < 0) return current;
      const next = [...current];
      next.splice(currentIndex, 1);
      const clampedTargetIndex = Math.max(
        0,
        Math.min(targetIndex, next.length)
      );
      next.splice(clampedTargetIndex, 0, activeColumnId);
      return next;
    });
  };

  const toggleValueDraft = React.useCallback(
    (columnId: FilterableColumnId, value: string, checked: boolean) => {
      setDraftValueFilters((current) => {
        const hasTouchedFilter = valueFilterTouched[columnId];
        const currentValues =
          hasTouchedFilter || current[columnId].length > 0
            ? current[columnId]
            : availableFilterOptions[columnId];
        if (checked) {
          return currentValues.includes(value)
            ? current
            : { ...current, [columnId]: [...currentValues, value] };
        }
        return {
          ...current,
          [columnId]: currentValues.filter((v) => v !== value),
        };
      });
      setValueFilterTouched((current) => ({ ...current, [columnId]: true }));
    },
    [availableFilterOptions, valueFilterTouched]
  );

  const handleToggleAllValues = React.useCallback(
    (columnId: FilterableColumnId) => {
      setValueFilterTouched((current) => ({ ...current, [columnId]: true }));
      const allValues = availableFilterOptions[columnId];
      const areAllSelected =
        allValues.length > 0 &&
        getEffectiveDraftValues(columnId).length === allValues.length;
      setDraftValueFilters((current) => ({
        ...current,
        [columnId]: areAllSelected ? [] : [...allValues],
      }));
    },
    [availableFilterOptions, getEffectiveDraftValues]
  );

  const getFilteredOptionsForColumn = React.useCallback(
    (columnId: FilterableColumnId) => {
      const query = searchQueries[columnId].trim().toLowerCase();
      const allValues = availableFilterOptions[columnId];
      return query
        ? allValues.filter((option) => option.toLowerCase().includes(query))
        : allValues;
    },
    [availableFilterOptions, searchQueries]
  );

  const setGroupOperator = React.useCallback(
    (groupId: string, operator: 'AND' | 'OR') =>
      setDraftLogicFilter((current) =>
        mutateFilterNodeById(current, groupId, (node) =>
          node.type === 'group' ? { ...node, operator } : node
        )
      ),
    []
  );
  const addConditionToGroup = React.useCallback(
    (groupId: string) =>
      setDraftLogicFilter((current) =>
        mutateFilterNodeById(current, groupId, (node) =>
          node.type === 'group'
            ? {
                ...node,
                conditions: [...node.conditions, createDefaultCondition()],
              }
            : node
        )
      ),
    []
  );
  const addNestedGroup = React.useCallback(
    (groupId: string) =>
      setDraftLogicFilter((current) =>
        mutateFilterNodeById(current, groupId, (node) =>
          node.type === 'group'
            ? {
                ...node,
                conditions: [...node.conditions, createDefaultFilterGroup()],
              }
            : node
        )
      ),
    []
  );
  const setConditionField = React.useCallback(
    (conditionId: string, field: FilterField) =>
      setDraftLogicFilter((current) =>
        mutateFilterNodeById(current, conditionId, (node) =>
          node.type === 'condition'
            ? {
                ...node,
                field,
                operator: getDefaultOperatorForField(field),
                value: '',
              }
            : node
        )
      ),
    []
  );
  const setConditionOperator = React.useCallback(
    (conditionId: string, operator: FilterOperator) =>
      setDraftLogicFilter((current) =>
        mutateFilterNodeById(current, conditionId, (node) =>
          node.type === 'condition' ? { ...node, operator } : node
        )
      ),
    []
  );
  const setConditionValue = React.useCallback(
    (conditionId: string, value: string) =>
      setDraftLogicFilter((current) =>
        mutateFilterNodeById(current, conditionId, (node) =>
          node.type === 'condition' ? { ...node, value } : node
        )
      ),
    []
  );
  const removeNode = React.useCallback(
    (nodeId: string) =>
      setDraftLogicFilter((current) => removeFilterNodeById(current, nodeId)),
    []
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="bg-background flex h-full w-full max-w-full flex-col gap-0 border-l p-0 lg:w-[50vw]! lg:max-w-[50vw]!"
        >
          <div className="border-border flex items-center justify-between border-b py-4 pr-14 pl-5">
            <div>
              <SheetTitle className="text-foreground text-base font-semibold">
                Customize View
              </SheetTitle>
              <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
                Changes apply when you click Save.
              </SheetDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground mr-1 h-8 gap-1.5 text-xs"
                  onClick={handleResetAll}
                >
                  <RefreshCw className="h-3 w-3" /> Reset all
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                Reset all filters, columns & grouping
              </TooltipContent>
            </Tooltip>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="border-border bg-background border-b px-5 pt-3 pb-3">
              <TabsList className="bg-muted/70 grid h-11 w-full grid-cols-4 rounded-xl p-1">
                <TabsTrigger
                  value="filters"
                  className="data-[state=active]:bg-background gap-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:shadow-sm"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />{' '}
                  <span className="hidden sm:inline">Filters</span>
                </TabsTrigger>
                <TabsTrigger
                  value="columns"
                  className="data-[state=active]:bg-background gap-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:shadow-sm"
                >
                  <Columns3 className="h-3.5 w-3.5" />{' '}
                  <span className="hidden sm:inline">Columns</span>
                </TabsTrigger>
                <TabsTrigger
                  value="grouping"
                  className="data-[state=active]:bg-background gap-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:shadow-sm"
                >
                  <Rows3 className="h-3.5 w-3.5" />{' '}
                  <span className="hidden sm:inline">Grouping</span>
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="data-[state=active]:bg-background gap-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:shadow-sm"
                >
                  <Settings2 className="h-3.5 w-3.5" />{' '}
                  <span className="hidden sm:inline">Advanced</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="bg-muted/10 flex-1 overflow-y-auto">
              <TabsContent value="filters" className="m-0 focus-visible:ring-0">
                <div className="space-y-6 p-5">
                  <SectionLabel>Column Filters</SectionLabel>
                  <div className="divide-border bg-background divide-y overflow-hidden rounded-lg border">
                    {filterableColumns.map(({ id, label }) => {
                      const effectiveDraftValues = getEffectiveDraftValues(id);
                      const selectedValuesSet = new Set(effectiveDraftValues);
                      const selectedCount = effectiveDraftValues.length;
                      const allValues = availableFilterOptions[id];
                      const filteredValues = getFilteredOptionsForColumn(id);
                      const isExpanded = expandedFilters[id];
                      const areAllSelected =
                        allValues.length > 0 &&
                        selectedCount === allValues.length;
                      const hasPartialFilter =
                        !areAllSelected && selectedCount > 0;

                      return (
                        <div key={id}>
                          <button
                            type="button"
                            className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
                            onClick={() =>
                              setExpandedFilters((c) => ({
                                ...c,
                                [id]: !c[id],
                              }))
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-foreground text-sm font-medium">
                                {label}
                              </span>
                              {hasPartialFilter && (
                                <span className="bg-primary/10 text-primary rounded-full px-1.5 text-[10px] font-semibold">
                                  {selectedCount}
                                </span>
                              )}
                            </div>
                            <ChevronDown
                              className={`text-muted-foreground h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="border-border bg-muted/20 border-t">
                              <div className="border-border bg-background relative border-b">
                                <Search className="text-muted-foreground absolute top-2.5 left-3 h-3.5 w-3.5" />
                                <input
                                  value={searchQueries[id]}
                                  onChange={(e) =>
                                    setSearchQueries((c) => ({
                                      ...c,
                                      [id]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Search ${label.toLowerCase()}...`}
                                  className="placeholder:text-muted-foreground/60 w-full border-0 bg-transparent py-2 pr-3 pl-8 text-sm focus:ring-0 focus:outline-none"
                                />
                              </div>
                              <div className="bg-background max-h-48 overflow-y-auto">
                                {filteredValues.length === 0 ? (
                                  <p className="text-muted-foreground py-4 text-center text-xs">
                                    No matches
                                  </p>
                                ) : (
                                  filteredValues.map((value) => (
                                    <label
                                      key={value}
                                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-4 py-2"
                                    >
                                      <Checkbox
                                        checked={selectedValuesSet.has(value)}
                                        onCheckedChange={(checked) =>
                                          toggleValueDraft(id, value, !!checked)
                                        }
                                        className="h-3.5 w-3.5"
                                      />
                                      <span className="text-foreground text-sm">
                                        {value}
                                      </span>
                                    </label>
                                  ))
                                )}
                              </div>
                              <div className="border-border bg-muted/30 flex items-center justify-between border-t px-4 py-2">
                                <span className="text-muted-foreground text-xs">
                                  {selectedCount} of {allValues.length} selected
                                </span>
                                <button
                                  type="button"
                                  className="text-primary text-xs font-medium hover:underline"
                                  onClick={() => handleToggleAllValues(id)}
                                >
                                  {areAllSelected
                                    ? 'Deselect all'
                                    : 'Select all'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="columns" className="m-0 focus-visible:ring-0">
                <div className="space-y-4 p-5">
                  <SectionLabel>Column Visibility & Order</SectionLabel>
                  <div className="bg-background divide-border divide-y overflow-hidden rounded-lg border">
                    <DndContext
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleColumnDragEnd}
                      sensors={sensors}
                    >
                      <SortableContext
                        items={draftColumnOrder}
                        strategy={verticalListSortingStrategy}
                      >
                        {draftColumnOrder.map((columnId) => (
                          <SortableColumnRow
                            key={columnId}
                            columnId={columnId}
                            label={columnLabels[columnId] ?? columnId}
                            visible={draftColumnVisibility[columnId] ?? true}
                            onToggle={(checked) =>
                              setDraftColumnVisibility((c) => ({
                                ...c,
                                [columnId]: checked,
                              }))
                            }
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="grouping"
                className="m-0 focus-visible:ring-0"
              >
                <div className="space-y-5 p-5">
                  <div>
                    <SectionLabel>Active Groups</SectionLabel>
                    {draftGrouping.length === 0 ? (
                      <EmptyState
                        icon={<Rows3 className="h-8 w-8" />}
                        title="No groups yet"
                        description="Add columns from below to group rows together"
                      />
                    ) : (
                      <DndContext
                        modifiers={[restrictToVerticalAxis]}
                        onDragMove={handleGroupingDragMove}
                        onDragEnd={handleGroupingDragEnd}
                        sensors={sensors}
                      >
                        <div className="space-y-1">
                          {draftGrouping.map((columnId, index) => (
                            <React.Fragment key={columnId}>
                              <GroupingDropZone
                                index={index}
                                isActive={activeGroupingDropIndex === index}
                              />
                              <SortableGroupingRow
                                columnId={columnId}
                                label={columnLabels[columnId] ?? columnId}
                                groupedIndex={index}
                                onRemove={() =>
                                  setDraftGrouping((c) =>
                                    c.filter((id) => id !== columnId)
                                  )
                                }
                              />
                            </React.Fragment>
                          ))}
                          <GroupingDropZone
                            index={draftGrouping.length}
                            isActive={
                              activeGroupingDropIndex === draftGrouping.length
                            }
                          />
                        </div>
                      </DndContext>
                    )}
                  </div>

                  <div>
                    <SectionLabel>Available Columns</SectionLabel>
                    <div className="space-y-1.5">
                      {table
                        .getAllLeafColumns()
                        .filter(
                          (c) =>
                            c.getCanGroup() && !draftGrouping.includes(c.id)
                        )
                        .map((column) => (
                          <div
                            key={column.id}
                            className="bg-background flex items-center justify-between rounded-lg border px-3 py-2.5"
                          >
                            <span className="text-foreground text-sm">
                              {columnLabels[column.id] ?? column.id}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftGrouping((c) => [...c, column.id])
                              }
                              className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="advanced"
                className="m-0 focus-visible:ring-0"
              >
                <div className="space-y-6 p-5">
                  <div>
                    <SectionLabel>Logic Builder</SectionLabel>
                    <LogicBuilder
                      group={draftLogicFilter}
                      advancedFieldValueOptions={advancedFieldValueOptions}
                      onSetGroupOperator={setGroupOperator}
                      onAddConditionToGroup={addConditionToGroup}
                      onAddNestedGroup={addNestedGroup}
                      onSetConditionField={setConditionField}
                      onSetConditionOperator={setConditionOperator}
                      onSetConditionValue={setConditionValue}
                      onRemoveNode={removeNode}
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="border-border bg-background flex items-center justify-end gap-2 border-t px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-9 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 px-5 text-sm shadow-sm"
              onClick={handleApplyView}
            >
              Save & Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
