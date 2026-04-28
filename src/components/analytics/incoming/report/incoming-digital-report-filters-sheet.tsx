import * as React from 'react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type Table,
} from '@tanstack/react-table';
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Columns3,
  GripVertical,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  advancedFilterFields,
  defaultCondition,
  defaultFilterGroup,
  filterableColumns,
  filterOperatorLabels,
  getDefaultOperatorForField,
  hasAnyUsableFilter,
  isAdvancedFilterGroup,
  mutateFilterNodeById,
  numberOperators,
  numericFilterFields,
  removeFilterNodeById,
  stringOperators,
  type FilterField,
  type FilterGroupNode,
  type FilterOperator,
  type IncomingRecord,
  type IncomingStatus,
} from './incoming-digital-report-shared';

function SortableColumnRow({
  columnId,
  label,
  checked,
  onCheckedChange,
}: {
  columnId: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: columnId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between px-3 py-2.5 transition-colors ${
        checked ? 'bg-white' : 'bg-slate-50 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={`Reorder ${label}`}
          className="cursor-grab text-slate-400"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
    </div>
  );
}

type Props = {
  table: Table<IncomingRecord>;
  defaultOrder: string[];
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
};

export function IncomingReportViewAndFiltersSheet({
  table,
  defaultOrder,
  columnResizeMode,
  columnResizeDirection,
  onColumnResizeModeChange,
  onColumnResizeDirectionChange,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('filters');
  const [draftColumnVisibility, setDraftColumnVisibility] = React.useState<
    Record<string, boolean>
  >({});
  const [draftColumnOrder, setDraftColumnOrder] = React.useState<string[]>([]);
  const [draftStatusFilters, setDraftStatusFilters] = React.useState<
    IncomingStatus[]
  >(['GRADED', 'NOT_GRADED']);
  const [draftValueFilters, setDraftValueFilters] = React.useState<
    Record<string, string[]>
  >({});
  const [draftGrouping, setDraftGrouping] = React.useState<string[]>([]);
  const [draftLogicFilter, setDraftLogicFilter] =
    React.useState<FilterGroupNode>(defaultFilterGroup());
  const [searchQueries, setSearchQueries] = React.useState<
    Record<string, string>
  >({});
  const [expandedFilters, setExpandedFilters] = React.useState<
    Record<string, boolean>
  >({});

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );
  const hidableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());
  const hidableColumnIds = hidableColumns.map((column) => column.id);
  const columnMap = new Map(
    hidableColumns.map((column) => [column.id, column])
  );
  const orderedColumns = draftColumnOrder
    .map((columnId) => columnMap.get(columnId))
    .filter(Boolean);

  const availableFilterOptions = React.useMemo(() => {
    const options: Record<string, string[]> = {};
    filterableColumns.forEach(({ id }) => {
      const faceted = table.getColumn(id)?.getFacetedUniqueValues();
      const values = faceted
        ? Array.from(faceted.keys())
            .map((value) => String(value))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        : [];
      options[id] = values;
    });
    return options;
  }, [table]);

  const activeFilterCount = React.useMemo(() => {
    let count = draftStatusFilters.length < 2 ? 1 : 0;
    filterableColumns.forEach(({ id }) => {
      const all = availableFilterOptions[id];
      const selected = draftValueFilters[id] ?? [];
      if (all.length > 0 && selected.length < all.length) count += 1;
    });
    if (hasAnyUsableFilter(draftLogicFilter)) count += 1;
    return count;
  }, [
    draftStatusFilters,
    draftValueFilters,
    draftLogicFilter,
    availableFilterOptions,
  ]);

  const hiddenColumnsCount = React.useMemo(
    () => Object.values(draftColumnVisibility).filter((value) => !value).length,
    [draftColumnVisibility]
  );

  const syncDraftFromTable = () => {
    const nextVisibility: Record<string, boolean> = {};
    hidableColumns.forEach((column) => {
      nextVisibility[column.id] = column.getIsVisible();
    });
    const activeOrder = table.getState().columnOrder;
    const baseOrder = activeOrder.length > 0 ? activeOrder : defaultOrder;
    const validOrder = baseOrder.filter((id) => hidableColumnIds.includes(id));
    const missing = hidableColumnIds.filter((id) => !validOrder.includes(id));
    const nextValueFilters: Record<string, string[]> = {};
    filterableColumns.forEach(({ id }) => {
      const raw = table.getColumn(id)?.getFilterValue();
      nextValueFilters[id] = Array.isArray(raw)
        ? raw.map(String)
        : [...(availableFilterOptions[id] ?? [])];
    });
    const statusRaw = table.getColumn('status')?.getFilterValue();
    setDraftColumnVisibility(nextVisibility);
    setDraftColumnOrder([...validOrder, ...missing]);
    setDraftValueFilters(nextValueFilters);
    setDraftStatusFilters(
      Array.isArray(statusRaw)
        ? (statusRaw as IncomingStatus[])
        : ['GRADED', 'NOT_GRADED']
    );
    setDraftGrouping(table.getState().grouping);
    setDraftLogicFilter(
      isAdvancedFilterGroup(table.getState().globalFilter)
        ? (table.getState().globalFilter as FilterGroupNode)
        : defaultFilterGroup()
    );
    setSearchQueries({});
    setExpandedFilters({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    if (nextOpen) {
      syncDraftFromTable();
      setActiveTab('filters');
    }
  };

  const handleApply = () => {
    table.setColumnVisibility(draftColumnVisibility);
    table.setColumnOrder(draftColumnOrder);
    table.setGrouping(draftGrouping);
    const statusColumn = table.getColumn('status');
    statusColumn?.setFilterValue(
      draftStatusFilters.length === 2 ? undefined : draftStatusFilters
    );
    filterableColumns.forEach(({ id }) => {
      const selected = draftValueFilters[id] ?? [];
      const all = availableFilterOptions[id] ?? [];
      table
        .getColumn(id)
        ?.setFilterValue(selected.length === all.length ? undefined : selected);
    });
    if (hasAnyUsableFilter(draftLogicFilter))
      table.setGlobalFilter(draftLogicFilter);
    else if (isAdvancedFilterGroup(table.getState().globalFilter))
      table.setGlobalFilter('');
    setIsOpen(false);
  };

  const handleClearAll = () => {
    const resetVisibility: Record<string, boolean> = {};
    hidableColumns.forEach((column) => {
      resetVisibility[column.id] = true;
    });
    const resetOrder = [
      ...defaultOrder.filter((id) => hidableColumnIds.includes(id)),
      ...hidableColumnIds.filter((id) => !defaultOrder.includes(id)),
    ];
    const resetValueFilters: Record<string, string[]> = {};
    filterableColumns.forEach(({ id }) => {
      resetValueFilters[id] = [...(availableFilterOptions[id] ?? [])];
    });
    setDraftColumnVisibility(resetVisibility);
    setDraftColumnOrder(resetOrder);
    setDraftStatusFilters(['GRADED', 'NOT_GRADED']);
    setDraftValueFilters(resetValueFilters);
    setDraftGrouping([]);
    setDraftLogicFilter(defaultFilterGroup());
    table.setColumnVisibility({});
    table.setColumnOrder(resetOrder);
    table.resetColumnFilters();
    table.setGlobalFilter('');
    table.setGrouping([]);
    table.resetColumnSizing();
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

  const toggleDraftGrouping = (columnId: string) => {
    setDraftGrouping((current) =>
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId]
    );
  };

  const renderGroup = (group: FilterGroupNode, depth = 0): React.ReactNode => (
    <div
      key={group.id}
      className={`space-y-2 rounded-lg border p-3 ${depth > 0 ? 'border-border bg-muted/40' : 'border-primary/20 bg-background'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Match</span>
        <div className="flex overflow-hidden rounded-md border border-slate-200">
          {(['AND', 'OR'] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() =>
                setDraftLogicFilter((current) =>
                  mutateFilterNodeById(current, group.id, (node) =>
                    node.type === 'group' ? { ...node, operator: op } : node
                  )
                )
              }
              className={`px-3 py-1 text-xs font-semibold ${group.operator === op ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
            >
              {op === 'AND' ? 'All' : 'Any'}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500">of these conditions</span>
        <div className="ml-auto flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() =>
              setDraftLogicFilter((current) =>
                mutateFilterNodeById(current, group.id, (node) =>
                  node.type === 'group'
                    ? {
                        ...node,
                        conditions: [...node.conditions, defaultCondition()],
                      }
                    : node
                )
              )
            }
          >
            <Plus className="h-3 w-3" /> Condition
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() =>
              setDraftLogicFilter((current) =>
                mutateFilterNodeById(current, group.id, (node) =>
                  node.type === 'group'
                    ? {
                        ...node,
                        conditions: [...node.conditions, defaultFilterGroup()],
                      }
                    : node
                )
              )
            }
          >
            <Plus className="h-3 w-3" /> Group
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        {group.conditions.length === 0 ? (
          <div className="rounded border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">
            No conditions yet - add one above
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
                      onClick={() =>
                        setDraftLogicFilter((current) =>
                          removeFilterNodeById(current, node.id)
                        )
                      }
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" /> Remove group
                    </button>
                  </div>
                </div>
              );
            }

            const isNumeric = numericFilterFields.includes(node.field);
            const operators = isNumeric ? numberOperators : stringOperators;
            const values = Array.from(
              table.getColumn(node.field)?.getFacetedUniqueValues()?.keys() ??
                []
            )
              .map(String)
              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

            return (
              <div
                key={node.id}
                className="grid grid-cols-12 items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50 p-1.5"
              >
                <select
                  value={node.field}
                  onChange={(event) => {
                    const field = event.target.value as FilterField;
                    setDraftLogicFilter((current) =>
                      mutateFilterNodeById(current, node.id, (currentNode) =>
                        currentNode.type === 'condition'
                          ? {
                              ...currentNode,
                              field,
                              operator: getDefaultOperatorForField(field),
                              value: '',
                            }
                          : currentNode
                      )
                    );
                  }}
                  className="col-span-4 h-8 rounded border border-slate-200 bg-white px-2 text-xs"
                >
                  {advancedFilterFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <select
                  value={node.operator}
                  onChange={(event) =>
                    setDraftLogicFilter((current) =>
                      mutateFilterNodeById(current, node.id, (currentNode) =>
                        currentNode.type === 'condition'
                          ? {
                              ...currentNode,
                              operator: event.target.value as FilterOperator,
                            }
                          : currentNode
                      )
                    )
                  }
                  className="col-span-3 h-8 rounded border border-slate-200 bg-white px-2 text-xs"
                >
                  {operators.map((operator) => (
                    <option key={operator} value={operator}>
                      {filterOperatorLabels[operator]}
                    </option>
                  ))}
                </select>
                <select
                  value={node.value}
                  onChange={(event) =>
                    setDraftLogicFilter((current) =>
                      mutateFilterNodeById(current, node.id, (currentNode) =>
                        currentNode.type === 'condition'
                          ? { ...currentNode, value: event.target.value }
                          : currentNode
                      )
                    )
                  }
                  className="col-span-4 h-8 rounded border border-slate-200 bg-white px-2 text-xs"
                >
                  <option value="">
                    {values.length > 0 ? 'Select value...' : 'No values'}
                  </option>
                  {values.map((value) => (
                    <option key={`${node.id}-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setDraftLogicFilter((current) =>
                      removeFilterNodeById(current, node.id)
                    )
                  }
                  className="col-span-1 flex items-center justify-center text-slate-300 hover:text-red-500"
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
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-white text-xs font-medium shadow-none"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            View & Filters
            {(activeFilterCount > 0 ||
              hiddenColumnsCount > 0 ||
              draftGrouping.length > 0) && (
              <span className="bg-primary text-primary-foreground ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                {activeFilterCount +
                  (hiddenColumnsCount > 0 ? 1 : 0) +
                  (draftGrouping.length > 0 ? 1 : 0)}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex flex-col gap-0 border-l bg-slate-50 p-0 data-[side=right]:w-[94vw] data-[side=right]:max-w-none data-[side=right]:sm:max-w-[860px]"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-white py-4 pr-14 pl-5">
            <div>
              <SheetTitle className="text-base font-semibold text-slate-800">
                Customize View
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-xs text-slate-400">
                Changes apply when you click Save.
              </SheetDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mr-1 h-8 gap-1.5 text-xs text-slate-500"
                  onClick={handleClearAll}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset all
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
            <div className="border-b border-slate-200 bg-white px-5 pt-3 pb-3">
              <TabsList className="grid h-11 w-full grid-cols-4 rounded-xl border border-slate-200 bg-slate-100/70 p-1">
                <TabsTrigger value="filters" className="gap-1.5 text-xs">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                </TabsTrigger>
                <TabsTrigger value="columns" className="gap-1.5 text-xs">
                  <Columns3 className="h-3.5 w-3.5" />
                  Columns
                </TabsTrigger>
                <TabsTrigger value="grouping" className="gap-1.5 text-xs">
                  <Rows3 className="h-3.5 w-3.5" />
                  Grouping
                </TabsTrigger>
                <TabsTrigger value="advanced" className="gap-1.5 text-xs">
                  <Settings2 className="h-3.5 w-3.5" />
                  Advanced
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="filters" className="m-0 p-5">
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                      QC Status
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['GRADED', 'NOT_GRADED'] as const).map((status) => {
                        const checked = draftStatusFilters.includes(status);
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              setDraftStatusFilters((current) =>
                                checked
                                  ? current.filter((value) => value !== status)
                                  : [...current, status]
                              )
                            }
                            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left ${
                              checked
                                ? 'border-primary/30 bg-primary/10 shadow-sm'
                                : 'border-slate-200 bg-white opacity-60'
                            }`}
                          >
                            {checked ? (
                              <CheckCircle2 className="text-primary h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-300" />
                            )}
                            <span
                              className={`h-2 w-2 rounded-full ${status === 'GRADED' ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            />
                            <span className="text-sm font-medium text-slate-700">
                              {status === 'GRADED' ? 'Graded' : 'Ungraded'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                      Column Filters
                    </p>
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {filterableColumns.map(({ id, label }) => {
                        const selected = draftValueFilters[id] ?? [];
                        const allValues = availableFilterOptions[id] ?? [];
                        const isExpanded = expandedFilters[id] ?? false;
                        const areAllSelected =
                          allValues.length > 0 &&
                          selected.length === allValues.length;
                        const query = (searchQueries[id] ?? '')
                          .trim()
                          .toLowerCase();
                        const filtered = query
                          ? allValues.filter((item) =>
                              item.toLowerCase().includes(query)
                            )
                          : allValues;
                        return (
                          <div key={id}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                              onClick={() =>
                                setExpandedFilters((current) => ({
                                  ...current,
                                  [id]: !current[id],
                                }))
                              }
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700">
                                  {label}
                                </span>
                                {!areAllSelected && selected.length > 0 ? (
                                  <span className="bg-primary/15 text-primary rounded-full px-1.5 text-[10px] font-semibold">
                                    {selected.length}
                                  </span>
                                ) : null}
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 text-slate-400 ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                            {isExpanded ? (
                              <div className="border-t border-slate-100">
                                <div className="relative border-b border-slate-100">
                                  <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                                  <input
                                    value={searchQueries[id] ?? ''}
                                    onChange={(event) =>
                                      setSearchQueries((current) => ({
                                        ...current,
                                        [id]: event.target.value,
                                      }))
                                    }
                                    placeholder={`Search ${label.toLowerCase()}...`}
                                    className="w-full border-0 bg-slate-50 py-2 pr-3 pl-8 text-sm text-slate-700 outline-none"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {filtered.length === 0 ? (
                                    <p className="py-4 text-center text-xs text-slate-400">
                                      No matches
                                    </p>
                                  ) : (
                                    filtered.map((value) => (
                                      <label
                                        key={`${id}-${value}`}
                                        className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-slate-50"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selected.includes(value)}
                                          onChange={(event) =>
                                            setDraftValueFilters((current) => ({
                                              ...current,
                                              [id]: event.target.checked
                                                ? [
                                                    ...(current[id] ?? []),
                                                    value,
                                                  ]
                                                : (current[id] ?? []).filter(
                                                    (item) => item !== value
                                                  ),
                                            }))
                                          }
                                        />
                                        <span className="text-sm text-slate-700">
                                          {value}
                                        </span>
                                      </label>
                                    ))
                                  )}
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2">
                                  <span className="text-xs text-slate-400">
                                    {selected.length} of {allValues.length}{' '}
                                    selected
                                  </span>
                                  <button
                                    type="button"
                                    className="text-primary hover:text-primary/80 text-xs font-medium"
                                    onClick={() =>
                                      setDraftValueFilters((current) => ({
                                        ...current,
                                        [id]: areAllSelected
                                          ? []
                                          : [...allValues],
                                      }))
                                    }
                                  >
                                    {areAllSelected
                                      ? 'Deselect all'
                                      : 'Select all'}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="columns" className="m-0 p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                      Column Visibility & Order
                    </p>
                    <button
                      type="button"
                      className="text-primary hover:text-primary/80 text-xs font-medium"
                      onClick={() =>
                        setDraftColumnVisibility((current) => {
                          const next = { ...current };
                          hidableColumns.forEach((column) => {
                            next[column.id] = true;
                          });
                          return next;
                        })
                      }
                    >
                      Show all
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                        {orderedColumns.map((column) =>
                          column ? (
                            <SortableColumnRow
                              key={column.id}
                              columnId={column.id}
                              label={
                                column.columnDef.header?.toString() || column.id
                              }
                              checked={draftColumnVisibility[column.id] ?? true}
                              onCheckedChange={(checked) =>
                                setDraftColumnVisibility((current) => ({
                                  ...current,
                                  [column.id]: checked,
                                }))
                              }
                            />
                          ) : null
                        )}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="grouping" className="m-0 p-5">
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                      Active Groups
                    </p>
                    {draftGrouping.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center">
                        <p className="text-sm font-medium text-slate-500">
                          No groups yet
                        </p>
                        <p className="text-xs text-slate-400">
                          Add columns from below to group rows together
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {draftGrouping.map((columnId, index) => (
                          <div
                            key={columnId}
                            className="border-primary/20 bg-primary/10 flex items-center gap-2 rounded-md border px-2 py-2"
                          >
                            <button
                              type="button"
                              className="text-primary/50 cursor-grab"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                            <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                              {index + 1}
                            </span>
                            <span className="flex-1 text-sm text-slate-700">
                              {columnId}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleDraftGrouping(columnId)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                      Available Columns
                    </p>
                    <div className="space-y-1.5">
                      {table
                        .getAllLeafColumns()
                        .filter(
                          (column) =>
                            column.getCanGroup() &&
                            !draftGrouping.includes(column.id)
                        )
                        .map((column) => (
                          <div
                            key={column.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                          >
                            <span className="text-sm text-slate-700">
                              {column.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleDraftGrouping(column.id)}
                              className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="m-0 p-5">
                <div className="space-y-6">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                        Logic Builder
                      </p>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                        onClick={() =>
                          setDraftLogicFilter(defaultFilterGroup())
                        }
                      >
                        <RefreshCw className="h-3 w-3" /> Reset
                      </button>
                    </div>
                    <p className="mb-3 text-xs text-slate-400">
                      Build custom logic with AND/OR conditions.
                    </p>
                    {renderGroup(draftLogicFilter)}
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                      Column Resizing
                    </p>
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                          Resize Mode
                        </p>
                        <div className="flex gap-2">
                          {(['onChange', 'onEnd'] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => onColumnResizeModeChange(mode)}
                              className={`rounded-md border px-2.5 py-1.5 text-xs ${
                                columnResizeMode === mode
                                  ? 'border-primary/30 bg-primary/10 text-primary'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {mode === 'onChange'
                                ? 'Live (onChange)'
                                : 'On release (onEnd)'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                          Resize Direction
                        </p>
                        <div className="flex gap-2">
                          {(['ltr', 'rtl'] as const).map((direction) => (
                            <button
                              key={direction}
                              type="button"
                              onClick={() =>
                                onColumnResizeDirectionChange(direction)
                              }
                              className={`rounded-md border px-2.5 py-1.5 text-xs ${
                                columnResizeDirection === direction
                                  ? 'border-primary/30 bg-primary/10 text-primary'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {direction === 'ltr'
                                ? 'Left to right'
                                : 'Right to left'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 text-xs"
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

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              className="h-9 text-sm text-slate-500 hover:text-slate-800"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 text-sm"
              onClick={handleApply}
            >
              Save & Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
