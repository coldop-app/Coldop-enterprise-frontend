import * as React from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';
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
import {
  getNikasiColumnFilterValue,
  NIKASI_EXCLUDED_TABLE_COLUMN_IDS,
} from '../columns';
import { createDefaultNikasiLogicFilter } from '../nikasi-advanced-filters';
import type { FilterableColumnId, ViewFiltersSheetProps } from './types';
import {
  filterableColumns,
  getEmptyValueFilters,
  getInitialExpandedFilters,
  getInitialSearchQueries,
} from './constants';
import {
  buildAppliedColumnOrder,
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
  gatePassNo: 'System Generated Gate Pass No',
  manualGatePassNumber: 'Manual Gate Pass No',
  date: 'Date',
  dispatchLedger: 'Dispatch Ledger',
  to: 'To',
  truckNumber: 'Truck Number',
  variety: 'Variety',
  bagBelow25: 'Below 25 (mm)',
  bag25to30: '25-30 (mm)',
  bagBelow30: 'Below 30 (mm)',
  bag30to35: '30-35 (mm)',
  bag30to40: '30-40 (mm)',
  bag35to40: '35-40 (mm)',
  bag40to45: '40-45 (mm)',
  bag45to50: '45-50 (mm)',
  bag50to55: '50-55 (mm)',
  bagAbove50: 'Above 50 (mm)',
  bagAbove55: 'Above 55 (mm)',
  bagCut: 'Cut',
  totalBagsIssued: 'Total Bags Issued',
  averageWeightPerBag: 'Average Weight Per Bag',
  netWeight: 'Net Weight',
  isInternalTransfer: 'Internal Transfer',
  remarks: 'Remarks',
};

const getInitialValueFilterTouched = (): Partial<
  Record<FilterableColumnId, boolean>
> => ({
  gatePassNo: false,
  manualGatePassNumber: false,
  date: false,
  variety: false,
  totalBagsIssued: false,
});

type AdvancedTabContentProps = {
  draftLogicFilter: FilterGroupNode;
  advancedFilterFields: Array<{ id: FilterField; label: string }>;
  advancedFieldValueOptions: Partial<Record<FilterField, string[]>>;
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
            Combine filters with AND / OR logic across any report column.
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

export function ViewFiltersSheet({
  open,
  onOpenChange,
  table,
  defaultColumnOrder,
  defaultColumnVisibility,
  emptyBagSizeColumnIds,
  columnLabelById,
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

  const resolvedColumnLabels = React.useMemo(() => {
    const labels = { ...columnLabels, ...columnLabelById };
    table.getAllLeafColumns().forEach((column) => {
      const header = column.columnDef.header;
      if (typeof header === 'string') {
        labels[column.id] = header;
      }
    });
    return labels;
  }, [columnLabelById, table]);

  const manageableColumns = React.useMemo(() => {
    const leafById = new Map(table.getAllLeafColumns().map((c) => [c.id, c]));
    const activeOrder = table.getState().columnOrder;
    const canonical =
      activeOrder.length > 0
        ? activeOrder
        : defaultColumnOrder.length > 0
          ? defaultColumnOrder
          : Array.from(leafById.keys());
    const seen = new Set<string>();
    const rows: Array<{ id: string; label: string }> = [];

    const pushIfManageable = (id: string) => {
      if (seen.has(id) || NIKASI_EXCLUDED_TABLE_COLUMN_IDS.has(id)) return;
      const col = leafById.get(id);
      if (!col?.getCanHide()) return;
      seen.add(id);
      const staticLabel = filterableColumns.find((c) => c.id === id)?.label;
      const header = col.columnDef.header;
      rows.push({
        id,
        label:
          resolvedColumnLabels[id] ??
          staticLabel ??
          (typeof header === 'string' ? header : id),
      });
    };

    canonical.forEach(pushIfManageable);
    leafById.forEach((_col, id) => {
      if (!seen.has(id)) pushIfManageable(id);
    });

    return rows;
  }, [defaultColumnOrder, resolvedColumnLabels, table]);
  const manageableColumnIds = React.useMemo(
    () => manageableColumns.map((column) => column.id),
    [manageableColumns]
  );

  const [draftColumnVisibility, setDraftColumnVisibility] = React.useState<
    Record<string, boolean>
  >(() => {
    const visibility: Record<string, boolean> = {};
    manageableColumnIds.forEach((id) => {
      const column = table.getColumn(id);
      if (column) visibility[id] = column.getIsVisible();
    });
    return visibility;
  });
  const [draftColumnOrder, setDraftColumnOrder] = React.useState<string[]>(
    () => {
      const activeOrder = table.getState().columnOrder;
      const validOrder = (
        activeOrder.length ? activeOrder : defaultColumnOrder
      ).filter((id) => manageableColumnIds.includes(id));
      const missing = manageableColumnIds.filter(
        (id) => !validOrder.includes(id)
      );
      return [...validOrder, ...missing];
    }
  );
  const [draftGrouping, setDraftGrouping] = React.useState<string[]>([]);
  const [draftLogicFilter, setDraftLogicFilter] =
    React.useState<FilterGroupNode>(() => createDefaultNikasiLogicFilter());

  const advancedFilterFields = React.useMemo(() => {
    const fields: Array<{ id: FilterField; label: string }> = [];
    const seen = new Set<string>();

    filterableColumns.forEach(({ id, label }) => {
      if (!table.getColumn(id)) return;
      fields.push({
        id: id as FilterField,
        label: resolvedColumnLabels[id] ?? label,
      });
      seen.add(id);
    });

    table.getAllLeafColumns().forEach((column) => {
      const id = column.id;
      if (seen.has(id) || NIKASI_EXCLUDED_TABLE_COLUMN_IDS.has(id)) return;
      fields.push({
        id: id as FilterField,
        label: resolvedColumnLabels[id] ?? id,
      });
      seen.add(id);
    });

    return fields;
  }, [resolvedColumnLabels, table]);
  const [draftValueFilters, setDraftValueFilters] = React.useState<
    Record<FilterableColumnId, string[]>
  >(getEmptyValueFilters());
  const [valueFilterTouched, setValueFilterTouched] = React.useState<
    Partial<Record<FilterableColumnId, boolean>>
  >(getInitialValueFilterTouched());
  const [activeGroupingDropIndex, setActiveGroupingDropIndex] = React.useState<
    number | null
  >(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );
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
          const normalized = getNikasiColumnFilterValue(
            columnId,
            row.getValue(columnId),
            row.original
          );
          uniqueValues.add(normalized);
        });
        values = Array.from(uniqueValues);
      } else {
        values = values.map((value) =>
          getNikasiColumnFilterValue(columnId, value)
        );
      }

      return Array.from(new Set(values.map((value) => String(value)))).sort(
        (a, b) => a.localeCompare(b, undefined, { numeric: true })
      );
    },
    [table, coreRowCount]
  );

  /** Unfiltered facets for reset — avoids stale facet state before the next React commit. */
  const collectDistinctColumnStringsFromCore = React.useCallback(
    (columnId: string): string[] => {
      void coreRowCount;
      const uniqueValues = new Set<string>();
      table.getCoreRowModel().rows.forEach((row) => {
        uniqueValues.add(
          getNikasiColumnFilterValue(
            columnId,
            row.getValue(columnId),
            row.original
          )
        );
      });
      return Array.from(uniqueValues)
        .map((value) => String(value))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    },
    [table, coreRowCount]
  );

  const availableFilterOptions = React.useMemo<
    Record<FilterableColumnId, string[]>
  >(() => {
    const options = getEmptyValueFilters();

    filterableColumns.forEach(({ id }) => {
      options[id] = getUniqueColumnValues(id);
    });
    return options;
  }, [getUniqueColumnValues]);

  const advancedFieldValueOptions = React.useMemo<
    Partial<Record<FilterField, string[]>>
  >(() => {
    const options = {} as Partial<Record<FilterField, string[]>>;

    advancedFilterFields.forEach(({ id }) => {
      options[id] = getUniqueColumnValues(id);
    });
    return options;
  }, [advancedFilterFields, getUniqueColumnValues]);

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    filterableColumns.forEach(({ id }) => {
      const all = availableFilterOptions[id];
      if (all.length > 0 && draftValueFilters[id].length < all.length) count++;
    });
    if (hasAnyUsableFilter(draftLogicFilter)) count++;
    return count;
  }, [draftValueFilters, draftLogicFilter, availableFilterOptions]);

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

  const defaultColumnOrderKey = React.useMemo(
    () => defaultColumnOrder.join('|'),
    [defaultColumnOrder]
  );
  const lastSyncedDefaultsKeyRef = React.useRef(defaultColumnOrderKey);

  const syncDraftFromTable = React.useCallback(() => {
    const visibility: Record<string, boolean> = {};
    manageableColumnIds.forEach((id) => {
      const column = table.getColumn(id);
      if (column) visibility[id] = column.getIsVisible();
    });

    const activeOrder = table.getState().columnOrder;
    const baseOrder = activeOrder.length > 0 ? activeOrder : defaultColumnOrder;
    const validOrder = baseOrder.filter((id) =>
      manageableColumnIds.includes(id)
    );
    const missing = manageableColumnIds.filter(
      (id) => !validOrder.includes(id)
    );

    const nextValueFilters = getEmptyValueFilters();

    filterableColumns.forEach(({ id }) => {
      const rawFilter = table.getColumn(id)?.getFilterValue();
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
        : createDefaultNikasiLogicFilter()
    );
  }, [availableFilterOptions, defaultColumnOrder, manageableColumnIds, table]);

  React.useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      syncDraftFromTable();
      lastSyncedDefaultsKeyRef.current = defaultColumnOrderKey;
    }, 0);
    return () => window.clearTimeout(handle);
  }, [open, defaultColumnOrderKey, syncDraftFromTable]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) return;
      syncDraftFromTable();
      lastSyncedDefaultsKeyRef.current = defaultColumnOrderKey;
      setValueFilterTouched(getInitialValueFilterTouched());
      setActiveTab('filters');
    },
    [defaultColumnOrderKey, onOpenChange, syncDraftFromTable]
  );

  const handleResetAll = React.useCallback(() => {
    table.setColumnVisibility(defaultColumnVisibility);
    table.setColumnOrder(
      buildAppliedColumnOrder(
        defaultColumnOrder,
        table.getAllLeafColumns().map((column) => column.id)
      )
    );
    table.resetColumnFilters();
    table.setGrouping([]);
    table.setGlobalFilter('');
    table.setSorting([]);
    table.resetColumnSizing();
    onColumnResizeModeChange('onChange');
    onColumnResizeDirectionChange('ltr');

    const visibility: Record<string, boolean> = {};
    manageableColumnIds.forEach((id) => {
      if (emptyBagSizeColumnIds.has(id)) {
        visibility[id] = false;
      } else {
        visibility[id] = defaultColumnVisibility[id] !== false;
      }
    });
    const validOrder = defaultColumnOrder.filter((id) =>
      manageableColumnIds.includes(id)
    );
    const missing = manageableColumnIds.filter(
      (id) => !validOrder.includes(id)
    );

    setDraftColumnVisibility(visibility);
    setDraftColumnOrder([...validOrder, ...missing]);
    setDraftGrouping([]);
    setActiveGroupingDropIndex(null);
    const nextValueFilters = getEmptyValueFilters();
    filterableColumns.forEach(({ id }) => {
      nextValueFilters[id] = collectDistinctColumnStringsFromCore(id);
    });
    setDraftValueFilters(nextValueFilters);
    setDraftLogicFilter(createDefaultNikasiLogicFilter());
    setSearchQueries(getInitialSearchQueries());
    setExpandedFilters(getInitialExpandedFilters());
    setValueFilterTouched(getInitialValueFilterTouched());
    setActiveTab('filters');
  }, [
    collectDistinctColumnStringsFromCore,
    defaultColumnOrder,
    defaultColumnVisibility,
    emptyBagSizeColumnIds,
    manageableColumnIds,
    onColumnResizeDirectionChange,
    onColumnResizeModeChange,
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
    table.setColumnVisibility((prev) => ({
      ...prev,
      ...draftColumnVisibility,
    }));

    const allLeafColumnIds = table
      .getAllLeafColumns()
      .map((column) => column.id);
    table.setColumnOrder(
      buildAppliedColumnOrder(draftColumnOrder, allLeafColumnIds)
    );
    table.setGrouping(draftGrouping);

    const nextColumnFilters: ColumnFiltersState = [];
    filterableColumns.forEach(({ id }) => {
      const allValues = availableFilterOptions[id];
      const selected = getEffectiveDraftValues(id);
      if (allValues.length > 0 && selected.length < allValues.length) {
        nextColumnFilters.push({ id, value: selected });
      }
    });
    table.setColumnFilters(nextColumnFilters);

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
  const handleResetLogicBuilder = React.useCallback(() => {
    setDraftLogicFilter(createDefaultNikasiLogicFilter());
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
                        manageableColumnIds.forEach((id) => {
                          next[id] = true;
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
                            label={resolvedColumnLabels[columnId] ?? columnId}
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
                            const label =
                              resolvedColumnLabels[columnId] ?? columnId;
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
                                {resolvedColumnLabels[column.id] ?? column.id}
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
