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
import type { ContractFarmingViewFiltersSheetProps } from './types';
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

function mapLegacyFieldToColumn(
  field: FilterField,
  legacyAdvancedFieldToColumnId: Partial<Record<FilterField, string>>
): FilterField {
  return (legacyAdvancedFieldToColumnId[field] ?? field) as FilterField;
}

function normalizeFilterGroupFields(
  group: FilterGroupNode,
  legacyAdvancedFieldToColumnId: Partial<Record<FilterField, string>>
): FilterGroupNode {
  return {
    ...group,
    conditions: group.conditions.map((condition) =>
      condition.type === 'group'
        ? normalizeFilterGroupFields(condition, legacyAdvancedFieldToColumnId)
        : {
            ...condition,
            field: mapLegacyFieldToColumn(
              condition.field,
              legacyAdvancedFieldToColumnId
            ),
          }
    ),
  };
}

type AdvancedTabContentProps = {
  draftLogicFilter: FilterGroupNode;
  advancedFilterFields: Array<{ id: FilterField; label: string }>;
  advancedFieldValueOptions: Record<FilterField, string[]>;
  onResetLogicBuilder: () => void;
  onSetGroupOperator: (groupId: string, operator: 'AND' | 'OR') => void;
  onAddConditionToGroup: (groupId: string) => void;
  onAddNestedGroup: (groupId: string) => void;
  onSetConditionField: (conditionId: string, field: FilterField) => void;
  onSetConditionOperator: (
    conditionId: string,
    operator: FilterOperator
  ) => void;
  onSetConditionValue: (conditionId: string, value: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onResetColumnResizing: () => void;
  onResetColumnWidths: () => void;
};

const AdvancedTabContent = React.memo(function AdvancedTabContent({
  draftLogicFilter,
  advancedFilterFields,
  advancedFieldValueOptions,
  onResetLogicBuilder,
  onSetGroupOperator,
  onAddConditionToGroup,
  onAddNestedGroup,
  onSetConditionField,
  onSetConditionOperator,
  onSetConditionValue,
  onRemoveNode,
  onResetColumnResizing,
  onResetColumnWidths,
}: AdvancedTabContentProps) {
  return (
    <TabsContent value="advanced" className="m-0 focus-visible:ring-0">
      <div className="space-y-6 p-5">
        <div>
          <SectionLabel
            action={
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
                onClick={onResetLogicBuilder}
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            }
          >
            Logic Builder
          </SectionLabel>
          <p className="text-muted-foreground mb-3 text-xs">
            Combine filters with AND / OR logic on contract-farming fields.
          </p>
          <LogicBuilder
            group={draftLogicFilter}
            advancedFilterFields={advancedFilterFields}
            advancedFieldValueOptions={advancedFieldValueOptions}
            onSetGroupOperator={onSetGroupOperator}
            onAddConditionToGroup={onAddConditionToGroup}
            onAddNestedGroup={onAddNestedGroup}
            onSetConditionField={onSetConditionField}
            onSetConditionOperator={onSetConditionOperator}
            onSetConditionValue={onSetConditionValue}
            onRemoveNode={onRemoveNode}
          />
        </div>

        <div>
          <SectionLabel
            action={
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
                onClick={onResetColumnResizing}
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
              onClick={onResetColumnWidths}
            >
              Reset all column widths
            </Button>
          </div>
        </div>
      </div>
    </TabsContent>
  );
});

export function ContractFarmingViewFiltersSheet({
  open,
  onOpenChange,
  table,
  defaultColumnOrder,
  onColumnResizeModeChange,
  onColumnResizeDirectionChange,
  onGroupingChange,
}: ContractFarmingViewFiltersSheetProps) {
  const [activeTab, setActiveTab] = React.useState('filters');
  const [searchQueries, setSearchQueries] = React.useState<
    Record<string, string>
  >({});
  const [expandedFilters, setExpandedFilters] = React.useState<
    Record<string, boolean>
  >({});

  const hidableColumns = React.useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table]
  );
  const hidableColumnIds = React.useMemo(
    () => hidableColumns.map((column) => column.id),
    [hidableColumns]
  );

  /** All leaf columns with a filterFn — mirrors the grid (grades, %, totals, ₹, etc.) */
  const filterableColumns = React.useMemo(() => {
    const leafById = new Map(table.getAllLeafColumns().map((c) => [c.id, c]));
    const order = table.getState().columnOrder;
    const canonical = order.length > 0 ? order : defaultColumnOrder;
    const seen = new Set<string>();
    const rows: Array<{ id: string; label: string }> = [];

    const pushIfFilterable = (id: string) => {
      if (seen.has(id)) return;
      const col = leafById.get(id);
      if (!col?.getCanFilter()) return;
      seen.add(id);
      const h = col.columnDef.header;
      rows.push({
        id,
        label: typeof h === 'string' ? h : id,
      });
    };

    canonical.forEach(pushIfFilterable);

    leafById.forEach((col, id) => {
      if (!seen.has(id) && col.getCanFilter()) {
        pushIfFilterable(id);
      }
    });

    return rows;
  }, [defaultColumnOrder, table]);

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
    React.useState<FilterGroupNode>(() => ({
      ...createDefaultFilterGroup(),
      conditions: [createDefaultCondition('farmer' as FilterField)],
    }));
  const [draftValueFilters, setDraftValueFilters] = React.useState<
    Record<string, string[]>
  >({});
  const [valueFilterTouched, setValueFilterTouched] = React.useState<
    Record<string, boolean>
  >({});

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );
  const coreRowCount = table.getCoreRowModel().rows.length;

  const resetFilterUiState = React.useCallback(() => {
    setSearchQueries(
      Object.fromEntries(filterableColumns.map((c) => [c.id, '']))
    );
    setExpandedFilters(
      Object.fromEntries(filterableColumns.map((c) => [c.id, false]))
    );
    setValueFilterTouched(
      Object.fromEntries(filterableColumns.map((c) => [c.id, false]))
    );
  }, [filterableColumns]);

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

  const availableFilterOptions = React.useMemo(() => {
    const options: Record<string, string[]> = {};
    filterableColumns.forEach(({ id }) => {
      options[id] = getUniqueColumnValues(id);
    });
    return options;
  }, [filterableColumns, getUniqueColumnValues]);

  const legacyAdvancedFieldToColumnId = React.useMemo<
    Partial<Record<FilterField, string>>
  >(
    () => ({
      farmerName: 'farmer',
      farmerMobile: 'farmerMobile',
      farmerAddress: 'address',
      varietyName: 'variety',
      generation: 'generation',
      sizeName: 'size',
      sizeQuantity: 'qty',
      sizeAcres: 'acres',
      sizeAmount: 'amount',
      buyBackBags: 'bbBags',
      buyBackNetWeightKg: 'bbNetWeight',
      accountNumber: 'accountNumber',
      familyKey: 'familyKey',
      totalGradeBags: 'grade_bags___totalAfterGrading',
      totalGradeNetWeightKg: 'grade_bags___netWeightAfterGrading',
      averageQuintalPerAcre: 'grade_bags___avgQuintalPerAcre',
      wastageKg: 'grade_bags___wastageKg',
      outputPercentage: 'grade_bags___outputPercentage',
      buyBackAmount: 'grade_bags___buyBackAmount',
      netAmount: 'netAmount',
      netAmountPerAcre: 'netAmountPerAcre',
    }),
    []
  );

  const advancedFilterFields = React.useMemo<
    Array<{ id: FilterField; label: string }>
  >(
    () =>
      filterableColumns.map(({ id, label }) => ({
        id: id as FilterField,
        label,
      })),
    [filterableColumns]
  );

  const advancedFieldValueOptions = React.useMemo<
    Record<FilterField, string[]>
  >(() => {
    const options = {} as Record<FilterField, string[]>;
    advancedFilterFields.forEach(({ id }) => {
      const colId = legacyAdvancedFieldToColumnId[id] ?? id;
      options[id] = getUniqueColumnValues(colId);
    });
    return options;
  }, [
    advancedFilterFields,
    getUniqueColumnValues,
    legacyAdvancedFieldToColumnId,
  ]);

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    filterableColumns.forEach(({ id }) => {
      const all = availableFilterOptions[id] ?? [];
      const selected = draftValueFilters[id] ?? [];
      if (all.length > 0 && selected.length < all.length) count++;
    });
    if (hasAnyUsableFilter(draftLogicFilter)) count++;
    return count;
  }, [
    draftLogicFilter,
    draftValueFilters,
    availableFilterOptions,
    filterableColumns,
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
        description: 'Refine rows by column values and advanced logic.',
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
        description:
          'Group rows by address, farmer, variety, or stage; expand or collapse sections.',
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

  const resolveColumnLabel = React.useCallback(
    (columnId: string) => {
      const col = table.getColumn(columnId);
      const h = col?.columnDef.header;
      if (typeof h === 'string') return h;
      return (
        filterableColumns.find((c) => c.id === columnId)?.label ?? columnId
      );
    },
    [filterableColumns, table]
  );

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

    const nextValueFilters: Record<string, string[]> = {};
    filterableColumns.forEach(({ id }) => {
      const rawFilter = table.getColumn(id)?.getFilterValue();
      nextValueFilters[id] = Array.isArray(rawFilter)
        ? rawFilter.map((value) => String(value))
        : [...(availableFilterOptions[id] ?? [])];
    });

    setDraftColumnVisibility(visibility);
    setDraftColumnOrder([...validOrder, ...missing]);
    setDraftGrouping([...table.getState().grouping]);
    setDraftValueFilters(nextValueFilters);
    const activeGlobalFilter = table.getState().globalFilter;
    setDraftLogicFilter(
      isAdvancedFilterGroup(activeGlobalFilter)
        ? normalizeFilterGroupFields(
            activeGlobalFilter,
            legacyAdvancedFieldToColumnId
          )
        : {
            ...createDefaultFilterGroup(),
            conditions: [createDefaultCondition('farmer' as FilterField)],
          }
    );
  }, [
    availableFilterOptions,
    defaultColumnOrder,
    filterableColumns,
    hidableColumnIds,
    hidableColumns,
    legacyAdvancedFieldToColumnId,
    table,
  ]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) return;
      syncDraftFromTable();
      resetFilterUiState();
      setActiveTab('filters');
    },
    [onOpenChange, resetFilterUiState, syncDraftFromTable]
  );

  const handleResetAll = React.useCallback(() => {
    table.setColumnVisibility(table.initialState.columnVisibility ?? {});
    table.setColumnOrder(defaultColumnOrder);
    table.resetColumnFilters();
    table.setGlobalFilter('');
    table.resetColumnSizing();
    onColumnResizeModeChange('onChange');
    onColumnResizeDirectionChange('ltr');
    onGroupingChange(['farmer', 'variety']);
    syncDraftFromTable();
    resetFilterUiState();
  }, [
    defaultColumnOrder,
    onColumnResizeDirectionChange,
    onColumnResizeModeChange,
    onGroupingChange,
    resetFilterUiState,
    syncDraftFromTable,
    table,
  ]);

  const getEffectiveDraftValues = React.useCallback(
    (columnId: string) => {
      const selected = draftValueFilters[columnId] ?? [];
      if (valueFilterTouched[columnId] || selected.length > 0) return selected;
      return availableFilterOptions[columnId] ?? [];
    },
    [availableFilterOptions, draftValueFilters, valueFilterTouched]
  );

  const handleApplyView = React.useCallback(() => {
    table.setColumnVisibility(draftColumnVisibility);
    table.setColumnOrder(draftColumnOrder);
    onGroupingChange(draftGrouping);

    filterableColumns.forEach(({ id }) => {
      const allValues = availableFilterOptions[id] ?? [];
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
  }, [
    availableFilterOptions,
    draftColumnOrder,
    draftColumnVisibility,
    draftGrouping,
    draftLogicFilter,
    filterableColumns,
    getEffectiveDraftValues,
    onOpenChange,
    onGroupingChange,
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
        Math.min(targetIndex as number, next.length)
      );
      next.splice(clampedTargetIndex, 0, activeColumnId);
      return next;
    });
  };

  const toggleValueDraft = React.useCallback(
    (columnId: string, value: string, checked: boolean) => {
      setDraftValueFilters((current) => {
        const hasTouchedFilter = valueFilterTouched[columnId];
        const currentValues =
          hasTouchedFilter || (current[columnId]?.length ?? 0) > 0
            ? (current[columnId] ?? [])
            : (availableFilterOptions[columnId] ?? []);
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
    (columnId: string) => {
      setValueFilterTouched((current) => ({ ...current, [columnId]: true }));
      const allValues = availableFilterOptions[columnId] ?? [];
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
    (columnId: string) => {
      const query = (searchQueries[columnId] ?? '').trim().toLowerCase();
      const allValues = availableFilterOptions[columnId] ?? [];
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
  const handleResetLogicBuilder = React.useCallback(() => {
    setDraftLogicFilter({
      ...createDefaultFilterGroup(),
      conditions: [createDefaultCondition('farmer' as FilterField)],
    });
  }, []);
  const handleResetColumnResizing = React.useCallback(() => {
    onColumnResizeModeChange('onChange');
    onColumnResizeDirectionChange('ltr');
    table.resetColumnSizing();
  }, [onColumnResizeDirectionChange, onColumnResizeModeChange, table]);
  const handleResetColumnWidths = React.useCallback(() => {
    table.resetColumnSizing();
  }, [table]);

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
                  <div className="space-y-2">
                    <SectionLabel>Column Filters</SectionLabel>
                    <div className="divide-border bg-background divide-y overflow-hidden rounded-lg border">
                      {filterableColumns.map(({ id, label }) => {
                        const effectiveDraftValues =
                          getEffectiveDraftValues(id);
                        const selectedValuesSet = new Set(effectiveDraftValues);
                        const selectedCount = effectiveDraftValues.length;
                        const allValues = availableFilterOptions[id] ?? [];
                        const filteredValues = getFilteredOptionsForColumn(id);
                        const isExpanded = expandedFilters[id] ?? false;
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
                                    value={searchQueries[id] ?? ''}
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
                            label={resolveColumnLabel(columnId)}
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
                        description="Add grouping columns from below (address, farmer, variety, stage)."
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
                            const label = resolveColumnLabel(columnId);
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
                          All grouped columns are in use.
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
                                {resolveColumnLabel(column.id)}
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

              <AdvancedTabContent
                draftLogicFilter={draftLogicFilter}
                advancedFilterFields={advancedFilterFields}
                advancedFieldValueOptions={advancedFieldValueOptions}
                onResetLogicBuilder={handleResetLogicBuilder}
                onSetGroupOperator={setGroupOperator}
                onAddConditionToGroup={addConditionToGroup}
                onAddNestedGroup={addNestedGroup}
                onSetConditionField={setConditionField}
                onSetConditionOperator={setConditionOperator}
                onSetConditionValue={setConditionValue}
                onRemoveNode={removeNode}
                onResetColumnResizing={handleResetColumnResizing}
                onResetColumnWidths={handleResetColumnWidths}
              />
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
