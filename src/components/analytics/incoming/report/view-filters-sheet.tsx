import * as React from 'react';
import type { Table as TanstackTable } from '@tanstack/react-table';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  RotateCcw,
  Trash2,
  X,
  SlidersHorizontal,
  Columns3,
  Rows3,
  Settings2,
  Calendar as CalendarIcon,
  Search,
  ChevronDown,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { IncomingReportRow } from './columns';
import {
  createDefaultCondition,
  createDefaultFilterGroup,
  getDefaultOperatorForField,
  hasAnyUsableFilter,
  isAdvancedFilterGroup,
  numericFilterFields,
  type FilterConditionNode,
  type FilterField,
  type FilterGroupNode,
  type FilterNode,
  type FilterOperator,
} from '@/lib/advanced-filters';

type ViewFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TanstackTable<IncomingReportRow>;
  defaultColumnOrder: string[];
  columnResizeMode: 'onChange' | 'onEnd';
  columnResizeDirection: 'ltr' | 'rtl';
  onColumnResizeModeChange: (mode: 'onChange' | 'onEnd') => void;
  onColumnResizeDirectionChange: (direction: 'ltr' | 'rtl') => void;
};

type StatusFilterValue = 'GRADED' | 'NOT_GRADED';
type FilterableColumnId =
  | 'gatePassNo'
  | 'date'
  | 'farmerName'
  | 'variety'
  | 'bagsReceived'
  | 'netWeightKg'
  | 'location'
  | 'truckNumber';

const statusFilterOptions: StatusFilterValue[] = ['GRADED', 'NOT_GRADED'];
const stringOperators: FilterOperator[] = [
  'contains',
  '=',
  '!=',
  'startsWith',
  'endsWith',
];
const numberOperators: FilterOperator[] = ['=', '!=', '>', '>=', '<', '<='];
const filterOperatorLabels: Record<FilterOperator, string> = {
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  '=': 'equals',
  '!=': 'not equal',
  '>': 'greater than',
  '>=': '≥ greater or equal',
  '<': 'less than',
  '<=': '≤ less or equal',
};

const filterableColumns: Array<{ id: FilterableColumnId; label: string }> = [
  { id: 'gatePassNo', label: 'Gate Pass No.' },
  { id: 'date', label: 'Date' },
  { id: 'farmerName', label: 'Farmer' },
  { id: 'variety', label: 'Variety' },
  { id: 'bagsReceived', label: 'Bags' },
  { id: 'netWeightKg', label: 'Net Weight (kg)' },
  { id: 'location', label: 'Location' },
  { id: 'truckNumber', label: 'Truck No.' },
];

const advancedFilterFields: Array<{ id: FilterField; label: string }> = [
  { id: 'gatePassNo', label: 'Gate Pass No.' },
  { id: 'date', label: 'Date' },
  { id: 'farmerName', label: 'Farmer' },
  { id: 'variety', label: 'Variety' },
  { id: 'bagsReceived', label: 'Bags' },
  { id: 'netWeightKg', label: 'Net Weight (kg)' },
  { id: 'status', label: 'Status' },
  { id: 'location', label: 'Location' },
  { id: 'truckNumber', label: 'Truck No.' },
];

const mutateFilterNodeById = (
  group: FilterGroupNode,
  targetId: string,
  updater: (node: FilterNode) => FilterNode
): FilterGroupNode => {
  if (group.id === targetId) {
    const updated = updater(group);
    return updated.type === 'group' ? updated : group;
  }
  return {
    ...group,
    conditions: group.conditions.map((node) => {
      if (node.id === targetId) return updater(node);
      if (node.type === 'group')
        return mutateFilterNodeById(node, targetId, updater);
      return node;
    }),
  };
};

const removeFilterNodeById = (
  group: FilterGroupNode,
  nodeId: string
): FilterGroupNode => ({
  ...group,
  conditions: group.conditions
    .filter((node) => node.id !== nodeId)
    .map((node) =>
      node.type === 'group' ? removeFilterNodeById(node, nodeId) : node
    ),
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortableColumnRow({
  columnId,
  label,
  visible,
  onToggle,
}: {
  columnId: string;
  label: string;
  visible: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: columnId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors ${
        visible
          ? 'bg-background border-border'
          : 'bg-muted/50 border-transparent opacity-60'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={`Reorder ${label}`}
          className="text-muted-foreground/50 hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-foreground text-sm select-none">{label}</span>
      </div>
      <Switch
        id={`col-${columnId}`}
        checked={visible}
        onCheckedChange={onToggle}
        className="scale-90"
      />
    </div>
  );
}

function SortableGroupingRow({
  columnId,
  label,
  groupedIndex,
  onRemove,
}: {
  columnId: string;
  label: string;
  groupedIndex: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `grouping-item:${columnId}`,
  });
  const style = { transform: CSS.Transform.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-primary/20 bg-primary/5 flex items-center gap-2 rounded-md border px-2 py-2"
    >
      <button
        type="button"
        aria-label={`Reorder ${label}`}
        className="text-primary/40 hover:text-primary cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
        {groupedIndex + 1}
      </span>
      <span className="text-foreground flex-1 text-sm">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function GroupingDropZone({
  index,
  isActive,
}: {
  index: number;
  isActive: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `grouping-slot:${index}` });
  return (
    <div
      ref={setNodeRef}
      className={`h-1.5 rounded transition-all ${isActive ? 'bg-primary/50' : 'bg-transparent'}`}
      aria-hidden
    />
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-border bg-muted/30 flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
      <div className="text-muted-foreground/50">{icon}</div>
      <p className="text-muted-foreground text-sm font-medium">{title}</p>
      <p className="text-muted-foreground/70 text-xs">{description}</p>
    </div>
  );
}

function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
        {children}
      </p>
      {action}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ViewFiltersSheet({
  open,
  onOpenChange,
  table,
  defaultColumnOrder,
  columnResizeMode,
  columnResizeDirection,
  onColumnResizeModeChange,
  onColumnResizeDirectionChange,
}: ViewFiltersSheetProps) {
  const [activeTab, setActiveTab] = React.useState('filters');
  const [searchQueries, setSearchQueries] = React.useState<
    Record<FilterableColumnId, string>
  >({
    gatePassNo: '',
    date: '',
    farmerName: '',
    variety: '',
    bagsReceived: '',
    netWeightKg: '',
    location: '',
    truckNumber: '',
  });
  const [expandedFilters, setExpandedFilters] = React.useState<
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

  const [draftColumnVisibility, setDraftColumnVisibility] = React.useState<
    Record<string, boolean>
  >({});
  const [draftColumnOrder, setDraftColumnOrder] = React.useState<string[]>([]);
  const [draftGrouping, setDraftGrouping] = React.useState<string[]>([]);
  const [draftStatusFilters, setDraftStatusFilters] =
    React.useState<StatusFilterValue[]>(statusFilterOptions);
  const [draftLogicFilter, setDraftLogicFilter] =
    React.useState<FilterGroupNode>(createDefaultFilterGroup());
  const [draftValueFilters, setDraftValueFilters] = React.useState<
    Record<FilterableColumnId, string[]>
  >({
    gatePassNo: [],
    date: [],
    farmerName: [],
    variety: [],
    bagsReceived: [],
    netWeightKg: [],
    location: [],
    truckNumber: [],
  });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const hidableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());
  const hidableColumnIds = hidableColumns.map((column) => column.id);
  const columnLabels: Record<string, string> = {
    gatePassNo: 'Gate Pass No.',
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
      const values = table.getColumn(id)?.getFacetedUniqueValues();
      if (!values) return;
      options[id] = Array.from(values.keys())
        .map((value) => String(value))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return options;
  }, [table]);

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
      const values = table.getColumn(id)?.getFacetedUniqueValues();
      if (!values) return;
      options[id] = Array.from(values.keys())
        .map((value) => String(value))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return options;
  }, [table]);

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

    const nextValueFilters = {
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
    setSearchQueries({
      gatePassNo: '',
      date: '',
      farmerName: '',
      variety: '',
      bagsReceived: '',
      netWeightKg: '',
      location: '',
      truckNumber: '',
    });
    setExpandedFilters({
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
      const selected = draftValueFilters[id];
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

  // ─── Filter & Drag Handlers ───────────────────────────────────────────────

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
  const parseGroupingColumnId = (id: string) =>
    id.replace('grouping-item:', '');
  const parseGroupingSlotIndex = (id: string) =>
    Number(id.replace('grouping-slot:', ''));

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
    setDraftValueFilters((current) => {
      const currentValues = current[columnId];
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
    const allValues = availableFilterOptions[columnId];
    const areAllSelected =
      allValues.length > 0 &&
      draftValueFilters[columnId].length === allValues.length;
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

  // ─── Logic Builder Helpers ────────────────────────────────────────────────

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

  const renderGroup = (group: FilterGroupNode, depth = 0): React.ReactNode => (
    <div
      key={group.id}
      className={`space-y-2 rounded-lg border p-3 ${depth > 0 ? 'bg-muted/30 border-border' : 'bg-background border-primary/20'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">Match</span>
        <div className="flex overflow-hidden rounded-md border">
          {(['AND', 'OR'] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setGroupOperator(group.id, op)}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                group.operator === op
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              {op === 'AND' ? 'All' : 'Any'}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs">
          of these conditions
        </span>
        <div className="ml-auto flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => addConditionToGroup(group.id)}
          >
            <Plus className="h-3 w-3" /> Condition
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => addNestedGroup(group.id)}
          >
            <Plus className="h-3 w-3" /> Group
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {group.conditions.length === 0 ? (
          <div className="border-border text-muted-foreground/70 rounded border border-dashed py-3 text-center text-xs">
            No conditions yet — add one above
          </div>
        ) : (
          group.conditions.map((node) => {
            if (node.type === 'group') {
              return (
                <div key={node.id}>
                  {renderGroup(node, depth + 1)}
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeNode(node.id)}
                      className="text-destructive/80 hover:text-destructive flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="h-3 w-3" /> Remove group
                    </button>
                  </div>
                </div>
              );
            }

            const isNumeric = numericFilterFields.includes(node.field);
            const operators = isNumeric ? numberOperators : stringOperators;
            const valueOptions = advancedFieldValueOptions[node.field] ?? [];

            return (
              <div
                key={node.id}
                className="bg-muted/20 grid grid-cols-12 items-center gap-1.5 rounded-md border p-1.5"
              >
                <div className="col-span-4">
                  <Select
                    value={node.field}
                    onValueChange={(value) =>
                      setConditionField(node.id, value as FilterField)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {advancedFilterFields.map((field) => (
                        <SelectItem
                          key={field.id}
                          value={field.id}
                          className="text-xs"
                        >
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Select
                    value={node.operator}
                    onValueChange={(value) =>
                      setConditionOperator(
                        node.id,
                        value as FilterConditionNode['operator']
                      )
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op} value={op} className="text-xs">
                          {filterOperatorLabels[op]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Select
                    value={node.value}
                    onValueChange={(value) => setConditionValue(node.id, value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select value..." />
                    </SelectTrigger>
                    <SelectContent>
                      {valueOptions.map((opt) => (
                        <SelectItem
                          key={`${node.id}-${opt}`}
                          value={opt}
                          className="text-xs"
                        >
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => removeNode(node.id)}
                  className="text-muted-foreground hover:text-destructive col-span-1 flex items-center justify-center transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="bg-background flex flex-col gap-0 border-l p-0 data-[side=right]:w-[92vw] data-[side=right]:max-w-[640px]"
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
              {/* FILTERS TAB */}
              <TabsContent value="filters" className="m-0 focus-visible:ring-0">
                <div className="space-y-6 p-5">
                  <div>
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

                  <div>
                    <SectionLabel>Date Range</SectionLabel>
                    <div className="bg-background flex items-center gap-2 rounded-lg border p-1 shadow-sm">
                      <Button
                        variant="ghost"
                        className="text-muted-foreground h-8 flex-1 justify-start gap-2 text-sm font-normal"
                      >
                        <CalendarIcon className="h-3.5 w-3.5" /> Start Date
                      </Button>
                      <span className="text-muted-foreground/40 text-sm">
                        →
                      </span>
                      <Button
                        variant="ghost"
                        className="text-muted-foreground h-8 flex-1 justify-start gap-2 text-sm font-normal"
                      >
                        <CalendarIcon className="h-3.5 w-3.5" /> End Date
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <SectionLabel>Column Filters</SectionLabel>
                    <div className="divide-border bg-background divide-y overflow-hidden rounded-lg border">
                      {filterableColumns.map(({ id, label }) => {
                        const selectedCount = draftValueFilters[id].length;
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
                                          checked={draftValueFilters[
                                            id
                                          ].includes(value)}
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

              {/* COLUMNS TAB */}
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

              {/* GROUPING TAB */}
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

              {/* ADVANCED TAB */}
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
                    {renderGroup(draftLogicFilter)}
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
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                          Resize Mode
                        </p>
                        <div className="flex gap-2">
                          {[
                            { value: 'onChange' as const, label: 'Live' },
                            { value: 'onEnd' as const, label: 'On release' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                onColumnResizeModeChange(option.value)
                              }
                              className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                                columnResizeMode === option.value
                                  ? 'border-primary/30 bg-primary/10 text-primary'
                                  : 'bg-background text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                          Resize Direction
                        </p>
                        <div className="flex gap-2">
                          {[
                            { value: 'ltr' as const, label: 'Left to right' },
                            { value: 'rtl' as const, label: 'Right to left' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                onColumnResizeDirectionChange(option.value)
                              }
                              className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                                columnResizeDirection === option.value
                                  ? 'border-primary/30 bg-primary/10 text-primary'
                                  : 'bg-background text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
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
