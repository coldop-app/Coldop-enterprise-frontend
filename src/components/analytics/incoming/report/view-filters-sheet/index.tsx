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
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Columns3,
  Rows3,
  Settings2,
  Search,
  ChevronDown,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
import type {
  FilterableColumnId,
  StatusFilterValue,
  ViewFiltersSheetProps,
} from './types';
import {
  advancedFilterFields,
  filterableColumns,
  getEmptyValueFilters,
  getInitialExpandedFilters,
  getInitialSearchQueries,
  statusFilterOptions,
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

  const hidableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());
  const hidableColumnIds = hidableColumns.map((column) => column.id);

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
  const [draftStatusFilters, setDraftStatusFilters] =
    React.useState<StatusFilterValue[]>(statusFilterOptions);
  const [draftLogicFilter, setDraftLogicFilter] =
    React.useState<FilterGroupNode>(createDefaultFilterGroup());
  const [draftValueFilters, setDraftValueFilters] = React.useState<
    Record<FilterableColumnId, string[]>
  >(getEmptyValueFilters());
  const [valueFilterTouched, setValueFilterTouched] = React.useState<
    Record<FilterableColumnId, boolean>
  >({
    gatePassNo: false,
    date: false,
    farmerName: false,
    variety: false,
    bagsReceived: false,
    netWeightKg: false,
    location: false,
    truckNumber: false,
  });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );
  const columnLabels: Record<string, string> = {
    gatePassNo: 'System Generated Gate Pass No',
    manualGatePassNumber: 'Manual Gate Pass No',
    date: 'Date',
    farmerName: 'Farmer',
    variety: 'Variety',
    bagsReceived: 'Bags',
    netWeightKg: 'Net Weight (kg)',
    status: 'Status',
    location: 'Location',
    truckNumber: 'Truck No.',
    remarks: 'Remarks',
  };

  const coreRowCount = table.getCoreRowModel().rows.length;

  const getUniqueColumnValues = React.useCallback(
    (columnId: string): string[] => {
      // Re-run option derivation when row data changes.
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
      location: [],
      truckNumber: [],
    } as Record<FilterableColumnId, string[]>;

    filterableColumns.forEach(({ id }) => {
      options[id] = getUniqueColumnValues(id);
    });
    return options;
  }, [getUniqueColumnValues]);

  const advancedFieldValueOptions = React.useMemo<
    Record<FilterField, string[]>
  >(() => {
    const options = {
      gatePassNo: [],
      date: [],
      farmerName: [],
      variety: [],
      bagsReceived: [],
      netWeightKg: [],
      status: [...statusFilterOptions],
      location: [],
      truckNumber: [],
    } as Record<FilterField, string[]>;

    advancedFilterFields.forEach(({ id }) => {
      options[id] =
        id === 'status' ? [...statusFilterOptions] : getUniqueColumnValues(id);
    });
    return options;
  }, [getUniqueColumnValues]);

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (draftStatusFilters.length < statusFilterOptions.length) count++;
    filterableColumns.forEach(({ id }) => {
      const all = availableFilterOptions[id];
      if (all.length > 0 && draftValueFilters[id].length < all.length) count++;
    });
    if (hasAnyUsableFilter(draftLogicFilter)) count++;
    return count;
  }, [
    draftStatusFilters,
    draftValueFilters,
    draftLogicFilter,
    availableFilterOptions,
  ]);

  const activeColumnCount = React.useMemo(
    () => Object.values(draftColumnVisibility).filter((v) => !v).length,
    [draftColumnVisibility]
  );

  const tabItems = React.useMemo(
    () => [
      {
        value: 'filters',
        label: 'Filters',
        description: 'Refine rows by status, date range, and values.',
        icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
        badge: activeFilterCount || undefined,
      },
      {
        value: 'columns',
        label: 'Columns',
        description: 'Show, hide, and reorder columns for the perfect view.',
        icon: <Columns3 className="h-3.5 w-3.5" />,
        badge:
          activeColumnCount > 0 ? `${activeColumnCount} hidden` : undefined,
      },
      {
        value: 'grouping',
        label: 'Grouping',
        description: 'Group rows to compare records in meaningful sections.',
        icon: <Rows3 className="h-3.5 w-3.5" />,
        badge: draftGrouping.length > 0 ? draftGrouping.length : undefined,
      },
      {
        value: 'advanced',
        label: 'Advanced',
        description: 'Build custom logic and configure table behavior.',
        icon: <Settings2 className="h-3.5 w-3.5" />,
      },
    ],
    [activeFilterCount, activeColumnCount, draftGrouping.length]
  );

  const activeTabMeta =
    tabItems.find((tab) => tab.value === activeTab) ?? tabItems[0];

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
      const rawFilter = table.getColumn(id)?.getFilterValue();
      nextValueFilters[id] = Array.isArray(rawFilter)
        ? rawFilter.map((value) => String(value))
        : [...availableFilterOptions[id]];
    });

    const rawStatusFilter = table.getColumn('status')?.getFilterValue();

    setDraftStatusFilters(
      Array.isArray(rawStatusFilter)
        ? (rawStatusFilter as StatusFilterValue[])
        : [...statusFilterOptions]
    );
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

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) return;
    syncDraftFromTable();
    setValueFilterTouched({
      gatePassNo: false,
      date: false,
      farmerName: false,
      variety: false,
      bagsReceived: false,
      netWeightKg: false,
      location: false,
      truckNumber: false,
    });
    setActiveTab('filters');
  };

  const handleResetAll = () => {
    table.setColumnVisibility({});
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
    setValueFilterTouched({
      gatePassNo: false,
      date: false,
      farmerName: false,
      variety: false,
      bagsReceived: false,
      netWeightKg: false,
      location: false,
      truckNumber: false,
    });
  };

  const handleApplyView = () => {
    table.setColumnVisibility(draftColumnVisibility);
    table.setColumnOrder(draftColumnOrder);
    table.setGrouping(draftGrouping);

    const statusColumn = table.getColumn('status');
    statusColumn?.setFilterValue(
      draftStatusFilters.length === statusFilterOptions.length
        ? undefined
        : draftStatusFilters
    );

    filterableColumns.forEach(({ id }) => {
      const allValues = availableFilterOptions[id];
      const selected = getEffectiveDraftValues(id);
      table
        .getColumn(id)
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
  };

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
        Math.min(targetIndex as number, next.length)
      );
      next.splice(clampedTargetIndex, 0, activeColumnId);
      return next;
    });
  };

  const toggleStatusDraft = (status: StatusFilterValue, checked: boolean) => {
    setDraftStatusFilters((current) =>
      checked
        ? current.includes(status)
          ? current
          : [...current, status]
        : current.filter((v) => v !== status)
    );
  };

  const toggleValueDraft = (
    columnId: FilterableColumnId,
    value: string,
    checked: boolean
  ) => {
    setValueFilterTouched((current) => ({ ...current, [columnId]: true }));
    setDraftValueFilters((current) => {
      const currentValues =
        valueFilterTouched[columnId] || current[columnId].length > 0
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
  };

  const handleToggleAllValues = (columnId: FilterableColumnId) => {
    setValueFilterTouched((current) => ({ ...current, [columnId]: true }));
    const allValues = availableFilterOptions[columnId];
    const areAllSelected =
      allValues.length > 0 &&
      getEffectiveDraftValues(columnId).length === allValues.length;
    setDraftValueFilters((current) => ({
      ...current,
      [columnId]: areAllSelected ? [] : [...allValues],
    }));
  };

  const getFilteredOptionsForColumn = (columnId: FilterableColumnId) => {
    const query = searchQueries[columnId].trim().toLowerCase();
    const allValues = availableFilterOptions[columnId];
    return query
      ? allValues.filter((option) => option.toLowerCase().includes(query))
      : allValues;
  };
  const getEffectiveDraftValues = (columnId: FilterableColumnId) => {
    const selected = draftValueFilters[columnId];
    if (valueFilterTouched[columnId] || selected.length > 0) return selected;
    return availableFilterOptions[columnId];
  };

  const setGroupOperator = (groupId: string, operator: 'AND' | 'OR') =>
    setDraftLogicFilter((current) =>
      mutateFilterNodeById(current, groupId, (node) =>
        node.type === 'group' ? { ...node, operator } : node
      )
    );
  const addConditionToGroup = (groupId: string) =>
    setDraftLogicFilter((current) =>
      mutateFilterNodeById(current, groupId, (node) =>
        node.type === 'group'
          ? {
              ...node,
              conditions: [...node.conditions, createDefaultCondition()],
            }
          : node
      )
    );
  const addNestedGroup = (groupId: string) =>
    setDraftLogicFilter((current) =>
      mutateFilterNodeById(current, groupId, (node) =>
        node.type === 'group'
          ? {
              ...node,
              conditions: [...node.conditions, createDefaultFilterGroup()],
            }
          : node
      )
    );
  const setConditionField = (conditionId: string, field: FilterField) =>
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
    );
  const setConditionOperator = (
    conditionId: string,
    operator: FilterOperator
  ) =>
    setDraftLogicFilter((current) =>
      mutateFilterNodeById(current, conditionId, (node) =>
        node.type === 'condition' ? { ...node, operator } : node
      )
    );
  const setConditionValue = (conditionId: string, value: string) =>
    setDraftLogicFilter((current) =>
      mutateFilterNodeById(current, conditionId, (node) =>
        node.type === 'condition' ? { ...node, value } : node
      )
    );
  const removeNode = (nodeId: string) =>
    setDraftLogicFilter((current) => removeFilterNodeById(current, nodeId));

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
                  <RotateCcw className="h-3.5 w-3.5" /> Reset all
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
                {tabItems.map(({ value, label, icon, badge }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="data-[state=active]:bg-background gap-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:shadow-sm"
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                    {badge !== undefined && (
                      <span
                        className={`rounded-full px-1.5 py-0 text-[10px] leading-4 font-bold ${activeTab === value ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}
                      >
                        {badge}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              <p className="text-muted-foreground mt-2.5 text-xs">
                {activeTabMeta.description}
              </p>
            </div>

            <div className="bg-muted/10 flex-1 overflow-y-auto">
              <TabsContent value="filters" className="m-0 focus-visible:ring-0">
                <div className="space-y-6 p-5">
                  <div className="hidden">
                    <SectionLabel>QC Status</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          value: 'GRADED' as StatusFilterValue,
                          label: 'Graded',
                          indicator: 'bg-green-500',
                        },
                        {
                          value: 'NOT_GRADED' as StatusFilterValue,
                          label: 'Ungraded',
                          indicator: 'bg-yellow-500',
                        },
                      ].map(({ value, label, indicator }) => {
                        const checked = draftStatusFilters.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleStatusDraft(value, !checked)}
                            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all ${
                              checked
                                ? 'border-primary/30 bg-primary/5 shadow-sm'
                                : 'border-border bg-background opacity-70'
                            }`}
                          >
                            {checked ? (
                              <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                            ) : (
                              <Circle className="text-muted-foreground/40 h-4 w-4 shrink-0" />
                            )}
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${indicator}`}
                            />
                            <span className="text-foreground text-sm font-medium">
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <SectionLabel>Column Filters</SectionLabel>
                    <div className="divide-border bg-background divide-y overflow-hidden rounded-lg border">
                      {filterableColumns.map(({ id, label }) => {
                        const selectedCount =
                          getEffectiveDraftValues(id).length;
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
                              <div className="flex items-center gap-2">
                                {areAllSelected && (
                                  <span className="text-muted-foreground text-[10px]">
                                    All
                                  </span>
                                )}
                                <ChevronDown
                                  className={`text-muted-foreground h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </div>
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
                                          checked={getEffectiveDraftValues(
                                            id
                                          ).includes(value)}
                                          onCheckedChange={(checked) =>
                                            toggleValueDraft(
                                              id,
                                              value,
                                              !!checked
                                            )
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
                                    {selectedCount} of {allValues.length}{' '}
                                    selected
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
                </div>
              </TabsContent>

              <TabsContent value="columns" className="m-0 focus-visible:ring-0">
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Column Visibility & Order</SectionLabel>
                    <button
                      type="button"
                      className="text-primary text-xs font-medium hover:underline"
                      onClick={() => {
                        const next = { ...draftColumnVisibility };
                        hidableColumns.forEach((col) => {
                          next[col.id] = true;
                        });
                        setDraftColumnVisibility(next);
                      }}
                    >
                      Show all
                    </button>
                  </div>
                  <p className="text-muted-foreground -mt-2 text-xs">
                    Drag rows to reorder. Toggle to show/hide.
                  </p>

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
                    <SectionLabel
                      action={
                        draftGrouping.length > 0 ? (
                          <button
                            type="button"
                            className="text-destructive text-xs font-medium hover:underline"
                            onClick={() => setDraftGrouping([])}
                          >
                            Clear all
                          </button>
                        ) : undefined
                      }
                    >
                      Active Groups
                    </SectionLabel>
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
                          {draftGrouping.map((columnId, index) => {
                            const label = columnLabels[columnId] ?? columnId;
                            return (
                              <React.Fragment key={columnId}>
                                <GroupingDropZone
                                  index={index}
                                  isActive={activeGroupingDropIndex === index}
                                />
                                <SortableGroupingRow
                                  columnId={columnId}
                                  label={label}
                                  groupedIndex={index}
                                  onRemove={() =>
                                    setDraftGrouping((c) =>
                                      c.filter((id) => id !== columnId)
                                    )
                                  }
                                />
                              </React.Fragment>
                            );
                          })}
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
                        ).length === 0 ? (
                        <p className="text-muted-foreground py-3 text-center text-xs">
                          All columns are grouped.
                        </p>
                      ) : (
                        table
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
                          ))
                      )}
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
                    <SectionLabel
                      action={
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
                          onClick={() =>
                            setDraftLogicFilter(createDefaultFilterGroup())
                          }
                        >
                          <RotateCcw className="h-3 w-3" /> Reset
                        </button>
                      }
                    >
                      Logic Builder
                    </SectionLabel>
                    <p className="text-muted-foreground mb-3 text-xs">
                      Combine filters with AND / OR logic. E.g. status is Graded
                      AND bags &gt; 10.
                    </p>
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

                  <div>
                    <SectionLabel
                      action={
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
                          onClick={() => {
                            onColumnResizeModeChange('onChange');
                            onColumnResizeDirectionChange('ltr');
                            table.resetColumnSizing();
                          }}
                        >
                          <RotateCcw className="h-3 w-3" /> Reset
                        </button>
                      }
                    >
                      Column Resizing
                    </SectionLabel>
                    <div className="bg-background space-y-3 rounded-lg border p-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full text-xs"
                        onClick={() => table.resetColumnSizing()}
                      >
                        Reset all column widths
                      </Button>
                    </div>
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
