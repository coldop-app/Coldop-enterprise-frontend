'use client';

import { useMemo, useState } from 'react';
import type { Table as TanstackTable } from '@tanstack/react-table';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
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
  SlidersHorizontal,
  ChevronDown,
  Search,
  GripVertical,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StorageReportRow } from './columns';

type FilterableColumnId = string;

type ViewFiltersSheetProps = {
  table: TanstackTable<StorageReportRow>;
  defaultColumnOrder: string[];
};

const columnLabels: Record<string, string> = {
  farmerName: 'Farmer',
  accountNumber: 'Account No.',
  farmerAddress: 'Address',
  farmerMobile: 'Mobile',
  createdByName: 'Created by',
  gatePassNo: 'System generated Gate Pass No.',
  manualGatePassNumber: 'Manual Gate Pass No.',
  date: 'Date',
  variety: 'Variety',
  totalBags: 'Bags',
  remarks: 'Remarks',
};

const getColumnLabel = (columnId: string): string => {
  if (columnId.startsWith('bags_')) {
    return columnId.replace('bags_', '').replace(/-/g, '–');
  }
  return columnLabels[columnId] ?? columnId;
};

type SortableRowProps = {
  id: string;
  label: string;
  rightSlot: React.ReactNode;
  leftSlot?: React.ReactNode;
};

function SortableRow({ id, label, rightSlot, leftSlot }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-background flex items-center justify-between px-3 py-2 transition-colors ${
        isDragging ? 'bg-muted/50 opacity-75 shadow-sm' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground cursor-grab active:cursor-grabbing"
          aria-label={`Reorder ${label}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {leftSlot}
        <span className="font-custom text-sm">{label}</span>
      </div>
      {rightSlot}
    </div>
  );
}

export function ViewFiltersSheet({
  table,
  defaultColumnOrder,
}: ViewFiltersSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('filters');
  const [expandedFilters, setExpandedFilters] = useState<
    Record<FilterableColumnId, boolean>
  >({});
  const [searchQueries, setSearchQueries] = useState<
    Record<FilterableColumnId, string>
  >({});
  const [draftColumnVisibility, setDraftColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const [draftColumnOrder, setDraftColumnOrder] = useState<string[]>([]);
  const [draftValueFilters, setDraftValueFilters] = useState<
    Record<FilterableColumnId, string[]>
  >({});
  const [draftGrouping, setDraftGrouping] = useState<string[]>([]);
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
  const allColumnIds = table.getAllLeafColumns().map((column) => column.id);

  const filterableColumns = useMemo<
    Array<{ id: FilterableColumnId; label: string }>
  >(
    () => allColumnIds.map((id) => ({ id, label: getColumnLabel(id) })),
    [allColumnIds]
  );

  const availableFilterOptions = useMemo<
    Record<FilterableColumnId, string[]>
  >(() => {
    const options: Record<FilterableColumnId, string[]> = {};
    filterableColumns.forEach(({ id }) => {
      const facetedValues = table.getColumn(id)?.getFacetedUniqueValues();
      if (!facetedValues) return;
      options[id] = Array.from(facetedValues.keys())
        .map((value) => String(value))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return options;
  }, [table, filterableColumns]);

  const syncDraftFromTable = () => {
    const nextVisibility: Record<string, boolean> = {};
    hidableColumns.forEach((column) => {
      nextVisibility[column.id] = column.getIsVisible();
    });
    setDraftColumnVisibility(nextVisibility);

    const activeOrder = table.getState().columnOrder;
    const baseOrder = activeOrder.length > 0 ? activeOrder : defaultColumnOrder;
    const validOrder = baseOrder.filter((id) => hidableColumnIds.includes(id));
    const missing = hidableColumnIds.filter((id) => !validOrder.includes(id));
    setDraftColumnOrder([...validOrder, ...missing]);

    const valueFilters: Record<FilterableColumnId, string[]> = {};
    filterableColumns.forEach(({ id }) => {
      const rawFilter = table.getColumn(id)?.getFilterValue();
      valueFilters[id] = Array.isArray(rawFilter)
        ? rawFilter.map((value) => String(value))
        : [...(availableFilterOptions[id] ?? [])];
    });
    setDraftValueFilters(valueFilters);
    setDraftGrouping(table.getState().grouping);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    if (nextOpen) {
      syncDraftFromTable();
      setActiveTab('filters');
      const resetSearchQueries: Record<string, string> = {};
      const resetExpandedFilters: Record<string, boolean> = {};
      filterableColumns.forEach(({ id }) => {
        resetSearchQueries[id] = '';
        resetExpandedFilters[id] = false;
      });
      setSearchQueries(resetSearchQueries);
      setExpandedFilters(resetExpandedFilters);
    }
  };

  const handleApply = () => {
    table.setColumnVisibility(draftColumnVisibility);
    table.setColumnOrder(draftColumnOrder);

    filterableColumns.forEach(({ id }) => {
      const allValues = availableFilterOptions[id];
      const selectedValues = draftValueFilters[id];
      const column = table.getColumn(id);
      if (selectedValues.length === allValues.length) {
        column?.setFilterValue(undefined);
      } else {
        column?.setFilterValue(selectedValues);
      }
    });

    table.setGrouping(draftGrouping);
    setIsOpen(false);
  };

  const handleResetAll = () => {
    const resetVisibility: Record<string, boolean> = {};
    hidableColumns.forEach((column) => {
      resetVisibility[column.id] = true;
    });
    const resetOrderBase =
      defaultColumnOrder.length > 0 ? defaultColumnOrder : hidableColumnIds;
    const resetOrder = [
      ...resetOrderBase.filter((id) => hidableColumnIds.includes(id)),
      ...hidableColumnIds.filter((id) => !resetOrderBase.includes(id)),
    ];
    setDraftColumnVisibility(resetVisibility);
    setDraftColumnOrder(resetOrder);
    const resetValueFilters: Record<string, string[]> = {};
    filterableColumns.forEach(({ id }) => {
      resetValueFilters[id] = [...(availableFilterOptions[id] ?? [])];
    });
    setDraftValueFilters(resetValueFilters);
    setDraftGrouping([]);
    table.setColumnVisibility({});
    table.setColumnOrder(resetOrder);
    table.resetColumnFilters();
    table.setGrouping([]);
    table.resetColumnSizing();
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    filterableColumns.forEach(({ id }) => {
      const all = availableFilterOptions[id] ?? [];
      if (all.length > 0 && (draftValueFilters[id] ?? []).length < all.length)
        count += 1;
    });
    return count;
  }, [availableFilterOptions, draftValueFilters, filterableColumns]);

  const hiddenColumnCount = useMemo(
    () =>
      Object.values(draftColumnVisibility).filter((visible) => !visible).length,
    [draftColumnVisibility]
  );

  const orderedColumns = draftColumnOrder
    .map((columnId) => columnMap.get(columnId))
    .filter((column) => column !== undefined);

  const setAllColumnsVisible = () => {
    setDraftColumnVisibility((current) => {
      const next = { ...current };
      hidableColumnIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  };

  const toggleValue = (
    columnId: FilterableColumnId,
    value: string,
    checked: boolean
  ) => {
    setDraftValueFilters((current) => {
      const currentValues = current[columnId] ?? [];
      if (checked) {
        return currentValues.includes(value)
          ? current
          : { ...current, [columnId]: [...currentValues, value] };
      }
      return {
        ...current,
        [columnId]: currentValues.filter((item) => item !== value),
      };
    });
  };

  const toggleAllValues = (columnId: FilterableColumnId) => {
    const allValues = availableFilterOptions[columnId] ?? [];
    const isAllSelected =
      allValues.length > 0 &&
      (draftValueFilters[columnId] ?? []).length === allValues.length;
    setDraftValueFilters((current) => ({
      ...current,
      [columnId]: isAllSelected ? [] : [...allValues],
    }));
  };

  const filteredOptionsForColumn = (columnId: FilterableColumnId) => {
    const query = (searchQueries[columnId] ?? '').trim().toLowerCase();
    const allValues = availableFilterOptions[columnId] ?? [];
    if (!query) return allValues;
    return allValues.filter((option) => option.toLowerCase().includes(query));
  };

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftColumnOrder((current) => {
      const fromIndex = current.indexOf(String(active.id));
      const toIndex = current.indexOf(String(over.id));
      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }
      return arrayMove(current, fromIndex, toIndex);
    });
  };

  const handleGroupingDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftGrouping((current) => {
      const fromIndex = current.indexOf(String(active.id));
      const toIndex = current.indexOf(String(over.id));
      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }
      return arrayMove(current, fromIndex, toIndex);
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="font-custom h-10 gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          View & Filters
          {(activeFilterCount > 0 ||
            hiddenColumnCount > 0 ||
            draftGrouping.length > 0) && (
            <span className="bg-primary text-primary-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold">
              {activeFilterCount +
                (hiddenColumnCount > 0 ? 1 : 0) +
                (draftGrouping.length > 0 ? 1 : 0)}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-[640px]"
      >
        <div className="border-border bg-background flex items-center justify-between border-b px-5 py-4">
          <div>
            <SheetTitle className="font-custom text-base">
              Customize View
            </SheetTitle>
            <SheetDescription className="font-custom text-xs">
              Changes apply after Save & Apply.
            </SheetDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleResetAll}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset all
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="border-border bg-background border-b px-5 py-3">
            <TabsList className="grid h-10 w-full grid-cols-3">
              <TabsTrigger value="filters" className="text-xs">
                Filters
              </TabsTrigger>
              <TabsTrigger value="columns" className="text-xs">
                Columns
              </TabsTrigger>
              <TabsTrigger value="grouping" className="text-xs">
                Grouping
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <TabsContent value="filters" className="m-0 space-y-2">
              <p className="font-custom text-muted-foreground text-[11px] font-semibold uppercase">
                Column Filters
              </p>
              <div className="border-border divide-border divide-y overflow-hidden rounded-lg border">
                {filterableColumns.map(({ id, label }) => {
                  const selectedCount = (draftValueFilters[id] ?? []).length;
                  const allValues = availableFilterOptions[id] ?? [];
                  const filteredValues = filteredOptionsForColumn(id);
                  const expanded = expandedFilters[id];
                  const isAllSelected =
                    allValues.length > 0 && selectedCount === allValues.length;
                  const hasPartial = !isAllSelected && selectedCount > 0;
                  return (
                    <div key={id}>
                      <button
                        type="button"
                        className="hover:bg-muted/40 flex w-full items-center justify-between px-4 py-3 text-left"
                        onClick={() =>
                          setExpandedFilters((current) => ({
                            ...current,
                            [id]: !current[id],
                          }))
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-custom text-sm">{label}</span>
                          {hasPartial && (
                            <span className="bg-primary/15 text-primary rounded-full px-1.5 text-[10px] font-semibold">
                              {selectedCount}
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {expanded && (
                        <div className="border-border border-t">
                          <div className="border-border relative border-b">
                            <Search className="text-muted-foreground absolute top-2.5 left-3 h-3.5 w-3.5" />
                            <input
                              value={searchQueries[id]}
                              onChange={(event) =>
                                setSearchQueries((current) => ({
                                  ...current,
                                  [id]: event.target.value,
                                }))
                              }
                              placeholder={`Search ${label.toLowerCase()}...`}
                              className="font-custom bg-muted/30 w-full border-0 py-2 pr-3 pl-8 text-sm focus:outline-none"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredValues.length === 0 ? (
                              <p className="text-muted-foreground py-4 text-center text-xs">
                                No matches
                              </p>
                            ) : (
                              filteredValues.map((value) => (
                                <label
                                  key={value}
                                  className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-4 py-2"
                                >
                                  <Checkbox
                                    checked={(
                                      draftValueFilters[id] ?? []
                                    ).includes(value)}
                                    onCheckedChange={(checked) =>
                                      toggleValue(id, value, Boolean(checked))
                                    }
                                  />
                                  <span className="font-custom text-sm">
                                    {value}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                          <div className="border-border bg-muted/20 flex items-center justify-between border-t px-4 py-2">
                            <span className="text-muted-foreground text-xs">
                              {selectedCount} of {allValues.length} selected
                            </span>
                            <button
                              type="button"
                              className="text-primary text-xs font-medium"
                              onClick={() => toggleAllValues(id)}
                            >
                              {isAllSelected ? 'Deselect all' : 'Select all'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="columns" className="m-0 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-custom text-muted-foreground text-[11px] font-semibold uppercase">
                  Column Visibility & Order
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="font-custom text-primary h-7 text-xs"
                  onClick={setAllColumnsVisible}
                >
                  Show all
                </Button>
              </div>
              <p className="font-custom text-muted-foreground text-xs">
                Drag rows to reorder. Toggle to show/hide.
              </p>
              <div className="border-border divide-border divide-y overflow-hidden rounded-lg border">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleColumnDragEnd}
                >
                  <SortableContext
                    items={orderedColumns.map((column) => column.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {orderedColumns.map((column) => (
                      <SortableRow
                        key={column.id}
                        id={column.id}
                        label={getColumnLabel(column.id)}
                        rightSlot={
                          <Switch
                            checked={draftColumnVisibility[column.id] ?? true}
                            aria-label={`Toggle ${getColumnLabel(column.id)}`}
                            onCheckedChange={(checked) =>
                              setDraftColumnVisibility((current) => ({
                                ...current,
                                [column.id]: checked,
                              }))
                            }
                          />
                        }
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </TabsContent>

            <TabsContent value="grouping" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-custom text-muted-foreground text-[11px] font-semibold uppercase">
                  Active Groups
                </p>
                {draftGrouping.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDraftGrouping([])}
                  >
                    Clear all
                  </Button>
                ) : null}
              </div>
              {draftGrouping.length === 0 ? (
                <div className="text-muted-foreground border-border rounded-lg border border-dashed py-6 text-center text-sm">
                  No groups added yet.
                </div>
              ) : (
                <div className="space-y-1">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleGroupingDragEnd}
                  >
                    <SortableContext
                      items={draftGrouping}
                      strategy={verticalListSortingStrategy}
                    >
                      {draftGrouping.map((columnId, index) => (
                        <SortableRow
                          key={columnId}
                          id={columnId}
                          label={getColumnLabel(columnId)}
                          leftSlot={
                            <span className="bg-primary text-primary-foreground inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                              {index + 1}
                            </span>
                          }
                          rightSlot={
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setDraftGrouping((current) =>
                                  current.filter((id) => id !== columnId)
                                )
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="font-custom text-muted-foreground text-[11px] font-semibold uppercase">
                  Available Columns
                </p>
                {table
                  .getAllLeafColumns()
                  .filter((column) => !draftGrouping.includes(column.id))
                  .map((column) => (
                    <div
                      key={column.id}
                      className="border-border bg-background flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span className="font-custom text-sm">
                        {getColumnLabel(column.id)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          setDraftGrouping((current) => [...current, column.id])
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                  ))}
              </div>

              <div className="space-y-2">
                <p className="font-custom text-muted-foreground text-[11px] font-semibold uppercase">
                  Column Resizing
                </p>
                <div className="border-border bg-background rounded-lg border p-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => table.resetColumnSizing()}
                  >
                    Reset all widths
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="border-border bg-background flex items-center justify-end gap-2 border-t px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Save & Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
