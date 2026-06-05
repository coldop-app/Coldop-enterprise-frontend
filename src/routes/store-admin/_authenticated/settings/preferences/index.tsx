/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import {
  useGetPreferences,
  normalizePreferences,
  type PreferencesData,
  type PreferenceOption,
  type BuyBackCost,
  type StandardSeedBagsPerAcreEntry,
  type StandardSeedBagSizeRow,
  type FinanceParticularRow,
  type FinanceCostDriver,
  FINANCE_COST_DRIVER_OPTIONS,
} from '@/services/store-admin/preferences/useGetPreferences';
import { useUpdatePreferences } from '@/services/store-admin/preferences/useUpdatePreferences';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  X,
  Plus,
  GripVertical,
  Save,
  RotateCcw,
  Package,
  Wheat,
  Users,
  Scale,
  Settings2,
  ChevronRight,
  Info,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePreferencesStore,
  usePreferencesStoreHydrated,
} from '@/stores/usePreferencesStore';
import { usePermissionsStore } from '@/stores/usePermissionsStore';

export const Route = createFileRoute(
  '/store-admin/_authenticated/settings/preferences/'
)({
  component: RouteComponent,
});

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Hyphen / en-dash variants used as keys in saved preferences */
function dashKeyVariants(label: string): string[] {
  return [label, label.replace(/-/g, '–'), label.replace(/–/g, '-')].filter(
    (v, i, a) => a.indexOf(v) === i
  );
}

function migrateNumericMapLabel(
  map: Record<string, number>,
  from: string,
  to: string
): Record<string, number> {
  if (from === to) return map;
  const next = { ...map };
  const variantSet = new Set(dashKeyVariants(from));
  let value: number | undefined;
  for (const k of Object.keys(next)) {
    if (variantSet.has(k)) {
      if (value === undefined) value = next[k];
      delete next[k];
    }
  }
  if (value !== undefined && to) next[to] = value;
  return next;
}

function migrateStandardSeedBagsSizeLabels(
  entries: StandardSeedBagsPerAcreEntry[],
  from: string,
  to: string
): StandardSeedBagsPerAcreEntry[] {
  if (from === to || !to.trim()) return entries;
  const trimmed = to.trim();
  const variantSet = new Set(dashKeyVariants(from));
  return entries.map((e) => ({
    ...e,
    sizes: e.sizes.map((row) =>
      variantSet.has(row.name) ? { ...row, name: trimmed } : row
    ),
  }));
}

function seedSizeRowHasValues(
  row: StandardSeedBagSizeRow | undefined
): boolean {
  if (!row) return false;
  const r = Number(row.ratePerBag);
  const b = Number(row.bagsPerAcre);
  return (Number.isFinite(r) && r !== 0) || (Number.isFinite(b) && b !== 0);
}

/** Size + rate + bags/acre — same grid rhythm as farmer-seed gate pass bag rows */
const standardSeedPrefRowGridClass =
  'grid w-full min-w-[16rem] grid-cols-[minmax(5.5rem,8.5rem)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3';

/** Subtle variety accents; unknown names use theme-muted fallback */
const VARIETY_COLORS: Record<string, string> = {
  Himalini:
    'bg-primary/10 text-primary border-primary/25 dark:border-primary/35',
  Jyoti:
    'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/30',
  B101: 'bg-orange-500/10 text-orange-800 border-orange-500/25 dark:text-orange-300 dark:border-orange-500/30',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="font-custom mb-6 flex items-start gap-3">
      <div className="bg-primary/10 text-primary mt-0.5 rounded-lg p-2">
        <Icon size={16} aria-hidden />
      </div>
      <div>
        <h3 className="text-foreground text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        )}
      </div>
    </div>
  );
}

function TagList({
  items,
  onRemove,
  onAdd,
  canAdd = true,
  canRemove = true,
  addPlaceholder = 'Add item…',
}: {
  items: string[];
  onRemove: (item: string) => void;
  onAdd: (item: string) => void;
  canAdd?: boolean;
  canRemove?: boolean;
  addPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setValue('');
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Badge
          key={item}
          variant="secondary"
          className="font-custom border-border bg-muted/80 text-foreground hover:bg-muted gap-1.5 rounded-full border py-1.5 pr-2 pl-3 text-xs font-medium transition-colors duration-200"
        >
          {item}
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemove(item)}
              className="text-muted-foreground hover:text-destructive focus-visible:ring-primary h-5 min-h-5 w-5 min-w-5 shrink-0 rounded-full p-0 transition-colors duration-200"
              aria-label={`Remove ${item}`}
            >
              <X size={12} />
            </Button>
          )}
        </Badge>
      ))}
      {canAdd && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="font-custom text-muted-foreground hover:text-foreground h-7 rounded-full border-dashed px-3 text-xs transition-colors duration-200"
            >
              <Plus size={12} className="mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="font-custom sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">Add New Item</DialogTitle>
            </DialogHeader>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={addPlaceholder}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="mt-2"
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!value.trim()}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SortableBagSizeChip({
  id,
  label,
  canReorder,
  canRename,
  canRemove,
  onRemove,
  onRequestRename,
}: {
  id: string;
  label: string;
  canReorder: boolean;
  canRename: boolean;
  canRemove: boolean;
  onRemove: (item: string) => void;
  onRequestRename: (item: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !canReorder });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'inline-flex max-w-full items-center gap-0.5',
        isDragging && 'z-10 opacity-80'
      )}
    >
      <Badge
        variant="secondary"
        className="font-custom border-border bg-muted/80 text-foreground hover:bg-muted max-w-full gap-1 rounded-full border py-1.5 pr-2 pl-2 text-xs font-medium transition-colors duration-200"
      >
        {canReorder && (
          <button
            type="button"
            aria-label={`Reorder ${label}`}
            className="text-muted-foreground/70 hover:text-foreground focus-visible:ring-primary cursor-grab touch-none rounded p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </button>
        )}
        {canRename ? (
          <button
            type="button"
            onClick={() => onRequestRename(label)}
            className="text-foreground hover:text-primary focus-visible:ring-primary min-w-0 truncate rounded px-0.5 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {label}
          </button>
        ) : (
          <span className="text-foreground min-w-0 truncate px-0.5">
            {label}
          </span>
        )}
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(label)}
            className="text-muted-foreground hover:text-destructive focus-visible:ring-primary h-5 min-h-5 w-5 min-w-5 shrink-0 rounded-full p-0 transition-colors duration-200"
            aria-label={`Remove ${label}`}
          >
            <X size={12} />
          </Button>
        )}
      </Badge>
    </div>
  );
}

function BagSizesEditor({
  items,
  onReorder,
  onRename,
  onRemove,
  onAdd,
  canAdd = true,
  canReorder = true,
  canRename = true,
  canRemove = true,
  addPlaceholder = 'Add item…',
}: {
  items: string[];
  onReorder: (next: string[]) => void;
  onRename: (from: string, to: string) => void;
  onRemove: (item: string) => void;
  onAdd: (item: string) => void;
  canAdd?: boolean;
  canReorder?: boolean;
  canRename?: boolean;
  canRemove?: boolean;
  addPlaceholder?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameFrom, setRenameFrom] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.indexOf(String(active.id));
    const newIdx = items.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(items, oldIdx, newIdx));
  };

  const openRename = (label: string) => {
    setRenameFrom(label);
    setRenameValue(label);
    setRenameOpen(true);
  };

  const trimmedRename = renameValue.trim();
  const renameDuplicate =
    renameFrom !== null &&
    trimmedRename !== '' &&
    trimmedRename !== renameFrom &&
    items.includes(trimmedRename);

  const commitRename = () => {
    if (!renameFrom) return;
    const next = renameValue.trim();
    if (!next || next === renameFrom) {
      setRenameOpen(false);
      return;
    }
    if (items.includes(next)) return;
    onRename(renameFrom, next);
    setRenameOpen(false);
    setRenameFrom(null);
    setRenameValue('');
  };

  const handleAdd = () => {
    const trimmed = addValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setAddValue('');
      setAddOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          {items.map((item) => (
            <SortableBagSizeChip
              key={item}
              id={item}
              label={item}
              canReorder={canReorder}
              canRename={canRename}
              canRemove={canRemove}
              onRemove={onRemove}
              onRequestRename={openRename}
            />
          ))}
        </SortableContext>
      </DndContext>

      {canAdd && (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="font-custom text-muted-foreground hover:text-foreground h-7 rounded-full border-dashed px-3 text-xs transition-colors duration-200"
            >
              <Plus size={12} className="mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="font-custom sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">Add New Item</DialogTitle>
            </DialogHeader>
            <Input
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              placeholder={addPlaceholder}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="mt-2"
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!addValue.trim()}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open);
          if (!open) {
            setRenameFrom(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent className="font-custom sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Rename size</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Size label"
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
            }}
            className="mt-2"
            autoFocus
          />
          {renameDuplicate && (
            <p className="text-destructive mt-2 text-xs">
              A size with this name already exists.
            </p>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={commitRename}
              disabled={
                !trimmedRename ||
                trimmedRename === renameFrom ||
                renameDuplicate
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LabelValueList({
  items,
  onRemove,
  onAdd,
  canAdd = true,
  canRemove = true,
}: {
  items: PreferenceOption[];
  onRemove: (value: string) => void;
  onAdd: (item: PreferenceOption) => void;
  canAdd?: boolean;
  canRemove?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');

  const handleAdd = () => {
    const trimmed = label.trim();
    if (trimmed && !items.find((i) => i.value === trimmed)) {
      onAdd({ label: trimmed, value: trimmed });
      setLabel('');
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Badge
          key={item.value}
          variant="secondary"
          className={cn(
            'font-custom gap-1.5 rounded-full border py-1.5 pr-2 pl-3 text-xs font-medium transition-colors duration-200',
            VARIETY_COLORS[item.label] ??
              'border-border bg-muted text-foreground'
          )}
        >
          {item.label}
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemove(item.value)}
              className="text-muted-foreground hover:text-destructive focus-visible:ring-primary h-5 min-h-5 w-5 min-w-5 shrink-0 rounded-full p-0 transition-colors duration-200"
              aria-label={`Remove ${item.label}`}
            >
              <X size={12} />
            </Button>
          )}
        </Badge>
      ))}
      {canAdd && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="font-custom text-muted-foreground hover:text-foreground h-7 rounded-full border-dashed px-3 text-xs transition-colors duration-200"
            >
              <Plus size={12} className="mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="font-custom sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">Add Option</DialogTitle>
            </DialogHeader>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label / Value"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
              className="mt-2"
            />
            <DialogFooter className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!label.trim()}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function BuyBackTable({
  entry,
  bagSizes,
  onChange,
  canEdit = true,
  unitCaption = '₹ per kg',
}: {
  entry: BuyBackCost;
  bagSizes: string[];
  onChange: (variety: string, size: string, rate: number) => void;
  canEdit?: boolean;
  /** Shown next to the variety badge (e.g. finance report uses ₹ per bag). */
  unitCaption?: string;
}) {
  const colorClass =
    VARIETY_COLORS[entry.variety] ?? 'bg-muted text-foreground border-border';

  return (
    <Card className="border-border/60 bg-card font-custom border shadow-none">
      <CardHeader className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn(
              'font-custom rounded-full border px-3 py-1 text-xs font-semibold',
              colorClass
            )}
          >
            {entry.variety}
          </Badge>
          <span className="text-muted-foreground text-xs">{unitCaption}</span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {bagSizes.map((size) => {
            const rate =
              entry.sizeRates[size] ??
              entry.sizeRates[size.replace(/-/g, '–')] ??
              entry.sizeRates[size.replace(/–/g, '-')] ??
              '';
            return (
              <div key={size} className="group">
                <Label className="text-muted-foreground mb-1.5 block font-mono text-xs">
                  {size}
                </Label>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">
                    ₹
                  </span>
                  <Input
                    type="number"
                    step="0.25"
                    defaultValue={rate}
                    disabled={!canEdit}
                    onChange={(e) =>
                      onChange(entry.variety, size, parseFloat(e.target.value))
                    }
                    className="bg-background focus-visible:bg-background h-8 pl-6 font-mono text-sm transition-colors duration-200"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StandardSeedBagsTable({
  entry,
  bagSizes,
  onChange,
  onClearRow,
  canEdit = true,
}: {
  entry: StandardSeedBagsPerAcreEntry;
  bagSizes: string[];
  onChange: (
    variety: string,
    size: string,
    field: 'ratePerBag' | 'bagsPerAcre',
    value: number
  ) => void;
  onClearRow: (variety: string, size: string) => void;
  canEdit?: boolean;
}) {
  const colorClass =
    VARIETY_COLORS[entry.variety] ?? 'bg-muted text-foreground border-border';

  const rowForSize = useCallback(
    (size: string) => {
      const variants = new Set(dashKeyVariants(size));
      return entry.sizes.find((s) => variants.has(s.name));
    },
    [entry]
  );

  const [pinnedSizes, setPinnedSizes] = useState<Set<string>>(() => new Set());
  const [addMoreOpen, setAddMoreOpen] = useState(false);
  const [sizeToAdd, setSizeToAdd] = useState('');

  const effectivePinnedSizes = useMemo(() => {
    const next = new Set<string>();
    for (const s of pinnedSizes) {
      if (!bagSizes.includes(s)) continue;
      const row = rowForSize(s);
      if (row && !seedSizeRowHasValues(row)) next.add(s);
    }
    return next;
  }, [pinnedSizes, bagSizes, rowForSize]);

  const visibleSizes = useMemo(() => {
    return bagSizes.filter((size) => {
      const row = rowForSize(size);
      if (!row) return false;
      return seedSizeRowHasValues(row) || effectivePinnedSizes.has(size);
    });
  }, [bagSizes, rowForSize, effectivePinnedSizes]);

  const addableSizes = useMemo(() => {
    const visible = new Set(visibleSizes);
    return bagSizes.filter((s) => !visible.has(s));
  }, [bagSizes, visibleSizes]);

  const visibleSizeSet = useMemo(() => new Set(visibleSizes), [visibleSizes]);

  const handleRemoveCard = (size: string) => {
    const row = rowForSize(size);
    if (seedSizeRowHasValues(row)) {
      onClearRow(entry.variety, size);
    }
    setPinnedSizes((prev) => {
      const next = new Set(prev);
      next.delete(size);
      return next;
    });
  };

  const confirmAddMore = () => {
    const key = (sizeToAdd.trim() || addableSizes[0] || '').trim();
    if (!key || !addableSizes.includes(key)) return;
    setPinnedSizes((prev) => new Set(prev).add(key));
    setAddMoreOpen(false);
    setSizeToAdd('');
  };

  return (
    <Card className="border-border/60 bg-card font-custom border shadow-none">
      <CardHeader className="px-5 pt-4 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold',
              colorClass
            )}
          >
            {entry.variety}
          </Badge>
          <span className="text-muted-foreground text-xs">
            Rate (₹/bag) · bags/acre
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-4">
        {visibleSizes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No sizes with values yet. Use Add more to include a size from your
            bag list.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-0 flex-col gap-3">
              <div
                className={`text-muted-foreground border-border/60 font-custom border-b pb-2 text-xs font-medium ${standardSeedPrefRowGridClass}`}
                aria-hidden
              >
                <span>Size</span>
                <span>Rate</span>
                <span>Bags/acre</span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-3 p-0" role="list">
                {visibleSizes.map((size, index) => {
                  const row = rowForSize(size);
                  const rate = row?.ratePerBag ?? '';
                  const bags = row?.bagsPerAcre ?? '';
                  return (
                    <li
                      key={`${entry.variety}-${size}`}
                      className={`font-custom ${standardSeedPrefRowGridClass}`}
                    >
                      <div className="flex min-w-0 items-center justify-between gap-1">
                        <label
                          htmlFor={`standard-seed-rate-${entry.variety}-${index}`}
                          className="text-foreground truncate text-base font-normal"
                        >
                          {size}
                        </label>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive focus-visible:ring-primary h-6 w-6 shrink-0 rounded-full"
                            onClick={() => handleRemoveCard(size)}
                            aria-label={`Remove ${size} from list`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="relative min-w-0">
                        <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">
                          ₹
                        </span>
                        <Input
                          id={`standard-seed-rate-${entry.variety}-${index}`}
                          type="number"
                          step="0.01"
                          defaultValue={rate}
                          disabled={!canEdit}
                          onChange={(e) =>
                            onChange(
                              entry.variety,
                              size,
                              'ratePerBag',
                              parseFloat(e.target.value)
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                          className="bg-background focus-visible:bg-background h-9 [appearance:textfield] rounded-lg pl-6 font-mono text-sm transition-colors duration-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Input
                          id={`standard-seed-bags-${entry.variety}-${index}`}
                          type="number"
                          step="1"
                          defaultValue={bags}
                          disabled={!canEdit}
                          onChange={(e) =>
                            onChange(
                              entry.variety,
                              size,
                              'bagsPerAcre',
                              parseInt(e.target.value, 10)
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                          className="bg-background focus-visible:bg-background h-9 min-w-0 flex-1 [appearance:textfield] rounded-lg font-mono text-sm transition-colors duration-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-muted-foreground shrink-0 text-xs">
                          /acre
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        <Dialog
          open={addMoreOpen}
          onOpenChange={(open) => {
            setAddMoreOpen(open);
            if (open && addableSizes.length > 0) {
              setSizeToAdd(addableSizes[0] ?? '');
            }
            if (!open) setSizeToAdd('');
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit || addableSizes.length === 0}
              className="gap-1.5"
              title={
                addableSizes.length === 0
                  ? 'All bag sizes are already shown or have values'
                  : undefined
              }
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add more
            </Button>
          </DialogTrigger>
          <DialogContent className="font-custom sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Add bag size</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-xs">
              All sizes from Bag Sizes above are listed here. Already-shown rows
              are disabled; pick another to add it to this variety.
            </p>
            <div className="pt-2">
              <Label className="text-muted-foreground mb-1.5 block text-xs">
                Bag size
              </Label>
              <select
                aria-label="Bag size to add"
                value={
                  addableSizes.includes(sizeToAdd)
                    ? sizeToAdd
                    : (addableSizes[0] ?? '')
                }
                onChange={(e) => setSizeToAdd(e.target.value)}
                className="border-input bg-background text-foreground focus-visible:ring-primary h-9 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {bagSizes.map((s) => {
                  const alreadyShown = visibleSizeSet.has(s);
                  return (
                    <option key={s} value={s} disabled={alreadyShown}>
                      {alreadyShown ? `${s} (already shown)` : s}
                    </option>
                  );
                })}
              </select>
            </div>
            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddMoreOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmAddMore}
                disabled={addableSizes.length === 0}
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function PreferencesEditor({ baseline }: { baseline: PreferencesData }) {
  const hasPermission = usePermissionsStore((state) => state.hasPermission);
  const canCreatePreferences = hasPermission('preferences', 'create');
  const canUpdatePreferences = hasPermission('preferences', 'update');
  const canMutatePreferences = canCreatePreferences || canUpdatePreferences;
  const rawData = usePreferencesStore((s) => s.preferences);
  const data = rawData ? normalizePreferences(rawData, baseline) : null;
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);
  const resetToServer = usePreferencesStore((s) => s.resetToServer);
  const { mutateAsync, isPending } = useUpdatePreferences();
  const [dirty, setDirty] = useState(false);

  if (!data) return null;

  const standardSeedEntries = data.custom.standardSeedBagsPerAcre ?? [];

  // Bag sizes
  const removeBagSize = (size: string) => {
    if (!canUpdatePreferences) return;
    updatePreferences((p) => ({
      ...p,
      bagSizes: p.bagSizes.filter((s) => s !== size),
    }));
    setDirty(true);
  };
  const addBagSize = (size: string) => {
    if (!canCreatePreferences) return;
    updatePreferences((p) => ({
      ...p,
      bagSizes: [...p.bagSizes, size],
    }));
    setDirty(true);
  };
  const reorderBagSizes = (next: string[]) => {
    if (!canUpdatePreferences) return;
    updatePreferences((p) => ({ ...p, bagSizes: next }));
    setDirty(true);
  };
  const renameBagSize = (from: string, to: string) => {
    if (!canUpdatePreferences) return;
    const trimmed = to.trim();
    if (!trimmed || trimmed === from) return;
    if (data.bagSizes.some((s) => s === trimmed)) return;
    updatePreferences((p) => ({
      ...p,
      bagSizes: p.bagSizes.map((s) => (s === from ? trimmed : s)),
      custom: {
        ...p.custom,
        buyBackCost: p.custom.buyBackCost.map((e) => ({
          ...e,
          sizeRates: migrateNumericMapLabel(e.sizeRates, from, trimmed),
        })),
        standardSeedBagsPerAcre: migrateStandardSeedBagsSizeLabels(
          p.custom.standardSeedBagsPerAcre ?? [],
          from,
          trimmed
        ),
        financeConstants: {
          ...p.custom.financeConstants,
          actualCostWithoutSubsidy:
            p.custom.financeConstants.actualCostWithoutSubsidy.map((e) => ({
              ...e,
              sizeRates: migrateNumericMapLabel(e.sizeRates, from, trimmed),
            })),
          salePricePerBag: p.custom.financeConstants.salePricePerBag.map(
            (e) => ({
              ...e,
              sizeRates: migrateNumericMapLabel(e.sizeRates, from, trimmed),
            })
          ),
        },
      },
    }));
    setDirty(true);
  };

  // Varieties
  const removeVariety = (val: string) => {
    updatePreferences((p) => {
      return {
        ...p,
        custom: {
          ...p.custom,
          potatoVarieties: p.custom.potatoVarieties.filter(
            (v) => v.value !== val
          ),
          buyBackCost: p.custom.buyBackCost.filter((e) => e.variety !== val),
          standardSeedBagsPerAcre: (
            p.custom.standardSeedBagsPerAcre ?? []
          ).filter((e) => e.variety !== val),
          financeConstants: {
            ...p.custom.financeConstants,
            actualCostWithoutSubsidy:
              p.custom.financeConstants.actualCostWithoutSubsidy.filter(
                (e) => e.variety !== val
              ),
            salePricePerBag: p.custom.financeConstants.salePricePerBag.filter(
              (e) => e.variety !== val
            ),
          },
        },
      };
    });
    setDirty(true);
  };
  const addVariety = (item: PreferenceOption) => {
    if (!canCreatePreferences) return;
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        potatoVarieties: [...p.custom.potatoVarieties, item],
        buyBackCost: p.custom.buyBackCost.some((e) => e.variety === item.value)
          ? p.custom.buyBackCost
          : [...p.custom.buyBackCost, { variety: item.value, sizeRates: {} }],
        standardSeedBagsPerAcre: (p.custom.standardSeedBagsPerAcre ?? []).some(
          (e) => e.variety === item.value
        )
          ? (p.custom.standardSeedBagsPerAcre ?? [])
          : [
              ...(p.custom.standardSeedBagsPerAcre ?? []),
              {
                variety: item.value,
                sizes: p.bagSizes.map((name) => ({
                  name,
                  ratePerBag: 0,
                  bagsPerAcre: 0,
                })),
              },
            ],
        financeConstants: {
          ...p.custom.financeConstants,
          actualCostWithoutSubsidy:
            p.custom.financeConstants.actualCostWithoutSubsidy.some(
              (e) => e.variety === item.value
            )
              ? p.custom.financeConstants.actualCostWithoutSubsidy
              : [
                  ...p.custom.financeConstants.actualCostWithoutSubsidy,
                  { variety: item.value, sizeRates: {} },
                ],
          salePricePerBag: p.custom.financeConstants.salePricePerBag.some(
            (e) => e.variety === item.value
          )
            ? p.custom.financeConstants.salePricePerBag
            : [
                ...p.custom.financeConstants.salePricePerBag,
                { variety: item.value, sizeRates: {} },
              ],
        },
      },
    }));
    setDirty(true);
  };

  // Seed generations
  const removeGeneration = (val: string) => {
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        farmerSeedGenerations: p.custom.farmerSeedGenerations.filter(
          (g) => g.value !== val
        ),
      },
    }));
    setDirty(true);
  };
  const addGeneration = (item: PreferenceOption) => {
    if (!canCreatePreferences) return;
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        farmerSeedGenerations: [...p.custom.farmerSeedGenerations, item],
      },
    }));
    setDirty(true);
  };

  // Graders
  const removeGrader = (g: string) => {
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        graderOptions: p.custom.graderOptions.filter((o) => o !== g),
      },
    }));
    setDirty(true);
  };
  const addGrader = (g: string) => {
    if (!canCreatePreferences) return;
    updatePreferences((p) => ({
      ...p,
      custom: { ...p.custom, graderOptions: [...p.custom.graderOptions, g] },
    }));
    setDirty(true);
  };
  const removeIncomingLocation = (location: string) => {
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        incomingLocations: (p.custom.incomingLocations ?? []).filter(
          (item) => item !== location
        ),
      },
    }));
    setDirty(true);
  };
  const addIncomingLocation = (location: string) => {
    if (!canCreatePreferences) return;
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        incomingLocations: [...(p.custom.incomingLocations ?? []), location],
      },
    }));
    setDirty(true);
  };

  // Buy-back rates
  const updateRate = (variety: string, size: string, rate: number) => {
    if (!canUpdatePreferences) return;
    updatePreferences((p) => {
      const idx = p.custom.buyBackCost.findIndex((e) => e.variety === variety);
      const nextBuyBack =
        idx >= 0
          ? p.custom.buyBackCost.map((e) =>
              e.variety === variety
                ? { ...e, sizeRates: { ...e.sizeRates, [size]: rate } }
                : e
            )
          : [...p.custom.buyBackCost, { variety, sizeRates: { [size]: rate } }];
      return {
        ...p,
        custom: { ...p.custom, buyBackCost: nextBuyBack },
      };
    });
    setDirty(true);
  };

  const updateFinanceParticular = (
    index: number,
    patch: Partial<FinanceParticularRow>
  ) => {
    if (!canUpdatePreferences) return;
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        financeConstants: {
          ...p.custom.financeConstants,
          particulars: p.custom.financeConstants.particulars.map((row, i) =>
            i === index ? { ...row, ...patch } : row
          ),
        },
      },
    }));
    setDirty(true);
  };

  const setFinanceGrading40mmSize = (size: string, on: boolean) => {
    if (!canUpdatePreferences) return;
    updatePreferences((p) => {
      const cur = p.custom.financeConstants.gradingBagSizes40mmAndAbove;
      const next = on
        ? cur.includes(size)
          ? cur
          : [...cur, size]
        : cur.filter((s) => s !== size);
      return {
        ...p,
        custom: {
          ...p.custom,
          financeConstants: {
            ...p.custom.financeConstants,
            gradingBagSizes40mmAndAbove: next,
          },
        },
      };
    });
    setDirty(true);
  };

  const updateFinanceVarietyMatrix = (
    table: 'actualCostWithoutSubsidy' | 'salePricePerBag',
    variety: string,
    size: string,
    rate: number
  ) => {
    if (!canUpdatePreferences) return;
    updatePreferences((p) => {
      const list = p.custom.financeConstants[table];
      const idx = list.findIndex((e) => e.variety === variety);
      const nextList =
        idx >= 0
          ? list.map((e) =>
              e.variety === variety
                ? { ...e, sizeRates: { ...e.sizeRates, [size]: rate } }
                : e
            )
          : [...list, { variety, sizeRates: { [size]: rate } }];
      return {
        ...p,
        custom: {
          ...p.custom,
          financeConstants: {
            ...p.custom.financeConstants,
            [table]: nextList,
          },
        },
      };
    });
    setDirty(true);
  };

  // Bag config
  const updateBagWeight = (
    key: 'juteBagWeight' | 'lenoBagWeight',
    val: number
  ) => {
    if (!canUpdatePreferences) return;
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        bagConfig: { ...p.custom.bagConfig, [key]: val },
      },
    }));
    setDirty(true);
  };

  const updateStandardSeed = (
    variety: string,
    size: string,
    field: 'ratePerBag' | 'bagsPerAcre',
    raw: number
  ) => {
    if (!canUpdatePreferences) return;
    const val = Number.isFinite(raw) ? raw : 0;
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        standardSeedBagsPerAcre: (p.custom.standardSeedBagsPerAcre ?? []).map(
          (e) => {
            if (e.variety !== variety) return e;
            const variants = new Set(dashKeyVariants(size));
            return {
              ...e,
              sizes: e.sizes.map((row) =>
                variants.has(row.name) ? { ...row, [field]: val } : row
              ),
            };
          }
        ),
      },
    }));
    setDirty(true);
  };

  const clearStandardSeedSize = (variety: string, size: string) => {
    if (!canUpdatePreferences) return;
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        standardSeedBagsPerAcre: (p.custom.standardSeedBagsPerAcre ?? []).map(
          (e) => {
            if (e.variety !== variety) return e;
            const variants = new Set(dashKeyVariants(size));
            return {
              ...e,
              sizes: e.sizes.map((row) =>
                variants.has(row.name)
                  ? { ...row, ratePerBag: 0, bagsPerAcre: 0 }
                  : row
              ),
            };
          }
        ),
      },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!canMutatePreferences) return;
    try {
      const res = await mutateAsync({
        coldStorageId: data.coldStorageId,
        bagSizes: data.bagSizes,
        reportFormat: data.reportFormat,
        custom: data.custom as unknown as Record<string, unknown>,
      });
      if (!res.success) return;
      if (res.data) resetToServer(res.data);
      setDirty(false);
    } catch {
      // Toast + messaging handled by useUpdatePreferences.onError
    }
  };

  const handleReset = () => {
    resetToServer(baseline);
    setDirty(false);
  };

  return (
    <TooltipProvider
      key={`${data._id}-${data.updatedAt}-${data.coldStorageId}`}
    >
      <main className="font-custom mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-muted-foreground mb-2 flex items-center gap-2 font-mono text-xs">
              <span>Settings</span>
              <ChevronRight size={12} aria-hidden />
              <span className="text-foreground">Preferences</span>
            </div>
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              Cold Storage Preferences
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Last updated {formatDate(data.updatedAt)} · ID:{' '}
              <span className="font-mono">{data._id.slice(-8)}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {dirty && canUpdatePreferences && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground gap-1.5 transition-colors duration-200"
              >
                <RotateCcw size={14} /> Reset
              </Button>
            )}
            <Button
              size="sm"
              variant={dirty ? 'default' : 'secondary'}
              onClick={() => void handleSave()}
              disabled={!dirty || isPending || !canMutatePreferences}
              className="gap-1.5 transition-all duration-200"
            >
              <Save size={14} /> Save changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="h-auto w-full flex-wrap gap-1 p-1 sm:w-fit">
            <TabsTrigger
              value="general"
              className="gap-1.5 rounded-md text-xs data-[state=active]:shadow-sm"
            >
              <Settings2 size={13} /> General
            </TabsTrigger>
            <TabsTrigger
              value="varieties"
              className="gap-1.5 rounded-md text-xs data-[state=active]:shadow-sm"
            >
              <Wheat size={13} /> Varieties & Rates
            </TabsTrigger>
            <TabsTrigger
              value="bags"
              className="gap-1.5 rounded-md text-xs data-[state=active]:shadow-sm"
            >
              <Package size={13} /> Bag Config
            </TabsTrigger>
            <TabsTrigger
              value="graders"
              className="gap-1.5 rounded-md text-xs data-[state=active]:shadow-sm"
            >
              <Users size={13} /> Graders and Locations
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="gap-1.5 rounded-md text-xs data-[state=active]:shadow-sm"
            >
              <FileText size={13} /> Finance
            </TabsTrigger>
          </TabsList>

          {/* ── General Tab ── */}
          <TabsContent value="general" className="mt-0 space-y-5">
            <Card className="border-border/40 bg-card rounded-2xl border shadow-sm">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={Package}
                  title="Bag Sizes"
                  description="Define the weight categories used across the system"
                />
              </CardHeader>
              <CardContent>
                <BagSizesEditor
                  items={data.bagSizes}
                  onReorder={reorderBagSizes}
                  onRename={renameBagSize}
                  onRemove={removeBagSize}
                  onAdd={addBagSize}
                  canAdd={canCreatePreferences}
                  canReorder={canUpdatePreferences}
                  canRename={canUpdatePreferences}
                  canRemove={canUpdatePreferences}
                  addPlaceholder="e.g. 55-60"
                />
                <p className="text-muted-foreground mt-3 font-mono text-xs">
                  {data.bagSizes.length} sizes configured
                </p>

                <Separator className="my-6" />

                <div>
                  <SectionHeader
                    icon={Scale}
                    title="Standard Seed Bags Per Acre"
                    description="Per variety: only sizes with rate or bags/acre set are shown. Use Add more to show another size from your bag list. Remove clears values and hides the card."
                  />
                  {data.bagSizes.length === 0 ? (
                    <p className="text-muted-foreground font-custom text-xs">
                      Add bag sizes above to configure standard seed rows.
                    </p>
                  ) : standardSeedEntries.length === 0 ? (
                    <p className="text-muted-foreground font-custom text-xs">
                      Add potato varieties in the Varieties tab to set standard
                      seed bags per acre.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                      {standardSeedEntries.map((entry) => (
                        <StandardSeedBagsTable
                          key={entry.variety}
                          entry={entry}
                          bagSizes={data.bagSizes}
                          onChange={updateStandardSeed}
                          onClearRow={clearStandardSeedSize}
                          canEdit={canUpdatePreferences}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Temporarily hidden: report format configuration */}
            {/*
            <Card className="border-border/40 bg-card rounded-2xl border shadow-sm">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={Settings2}
                  title="Report Format"
                  description="Choose the default layout for generated reports"
                />
              </CardHeader>
              <CardContent>
                <Select
                  value={data.reportFormat}
                  onValueChange={(v) => {
                    updatePreferences((p) => ({ ...p, reportFormat: v }));
                    setDirty(true);
                  }}
                >
                  <SelectTrigger className="bg-background w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="summary">Summary</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            */}
          </TabsContent>

          {/* ── Varieties & Rates Tab ── */}
          <TabsContent value="varieties" className="mt-0 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Card className="border-border/40 bg-card rounded-2xl border shadow-sm">
                <CardHeader className="pb-2">
                  <SectionHeader
                    icon={Wheat}
                    title="Potato Varieties"
                    description="Active varieties in your system"
                  />
                </CardHeader>
                <CardContent>
                  <LabelValueList
                    items={data.custom.potatoVarieties}
                    onRemove={removeVariety}
                    onAdd={addVariety}
                    canAdd={canCreatePreferences}
                    canRemove={canUpdatePreferences}
                  />
                </CardContent>
              </Card>

              <Card className="border-border/40 bg-card rounded-2xl border shadow-sm">
                <CardHeader className="pb-2">
                  <SectionHeader icon={Scale} title="Seed Generations" />
                </CardHeader>
                <CardContent>
                  <LabelValueList
                    items={data.custom.farmerSeedGenerations}
                    onRemove={removeGeneration}
                    onAdd={addGeneration}
                    canAdd={canCreatePreferences}
                    canRemove={canUpdatePreferences}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Buy-Back Cost Tables */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h3 className="text-foreground text-sm font-semibold">
                  Buy-back Rates
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="About buy-back rates"
                    >
                      <Info size={13} aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Rates are per kg (₹). Edit any cell inline.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-4">
                {data.custom.potatoVarieties.map((v) => {
                  const entry =
                    data.custom.buyBackCost.find(
                      (e) => e.variety === v.value
                    ) ?? ({ variety: v.value, sizeRates: {} } as BuyBackCost);
                  return (
                    <BuyBackTable
                      key={v.value}
                      entry={entry}
                      bagSizes={data.bagSizes}
                      onChange={updateRate}
                      canEdit={canUpdatePreferences}
                    />
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ── Bag Config Tab ── */}
          <TabsContent value="bags" className="mt-0 space-y-5">
            <Card className="border-border/40 bg-card rounded-2xl border shadow-sm">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={Package}
                  title="Bag Weights"
                  description="Tare weights subtracted during net calculation"
                />
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { key: 'juteBagWeight' as const, label: 'Jute Bag Weight' },
                    { key: 'lenoBagWeight' as const, label: 'Leno Bag Weight' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-muted-foreground mb-2 block font-mono text-xs">
                        {label}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={data.custom.bagConfig[key]}
                          disabled={!canUpdatePreferences}
                          onChange={(e) =>
                            updateBagWeight(key, parseFloat(e.target.value))
                          }
                          className="bg-background h-9 w-28 font-mono text-sm"
                        />
                        <span className="text-muted-foreground text-xs">
                          kg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div>
                  <Label className="text-muted-foreground mb-3 block font-mono text-xs">
                    Enabled Bag Types
                  </Label>
                  <div className="flex gap-4">
                    {['JUTE', 'LENO'].map((type) => (
                      <div key={type} className="flex items-center gap-2.5">
                        <Switch
                          id={type}
                          disabled={!canUpdatePreferences}
                          checked={data.custom.bagConfig.bagTypes.includes(
                            type
                          )}
                          onCheckedChange={(checked) => {
                            updatePreferences((p) => ({
                              ...p,
                              custom: {
                                ...p.custom,
                                bagConfig: {
                                  ...p.custom.bagConfig,
                                  bagTypes: checked
                                    ? [...p.custom.bagConfig.bagTypes, type]
                                    : p.custom.bagConfig.bagTypes.filter(
                                        (t) => t !== type
                                      ),
                                },
                              },
                            }));
                            setDirty(true);
                          }}
                        />
                        <Label
                          htmlFor={type}
                          className="text-foreground cursor-pointer text-sm font-medium"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Graders Tab ── */}
          <TabsContent value="graders" className="mt-0">
            <Card className="border-border/40 bg-card rounded-2xl border shadow-sm">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={Users}
                  title="Grader Options"
                  description="Machines or operators available during grading"
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.custom.graderOptions.map((grader, i) => (
                    <div key={i} className="group flex items-center gap-2">
                      <Input
                        defaultValue={grader}
                        disabled={!canUpdatePreferences}
                        onChange={(e) => {
                          const updated = [...data.custom.graderOptions];
                          updated[i] = e.target.value;
                          updatePreferences((p) => ({
                            ...p,
                            custom: { ...p.custom, graderOptions: updated },
                          }));
                          setDirty(true);
                        }}
                        className="bg-background h-9 max-w-xs text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!canUpdatePreferences}
                        className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        onClick={() => removeGrader(grader)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canCreatePreferences}
                    className="text-muted-foreground hover:text-foreground mt-2 gap-1.5 border-dashed text-xs transition-colors duration-200"
                    onClick={() => addGrader('New Grader')}
                  >
                    <Plus size={12} /> Add Grader
                  </Button>
                </div>

                <Separator className="my-6" />

                <SectionHeader
                  icon={Settings2}
                  title="Incoming Locations"
                  description="Locations available in incoming gate pass forms"
                />
                <TagList
                  items={data.custom.incomingLocations ?? []}
                  onRemove={removeIncomingLocation}
                  onAdd={addIncomingLocation}
                  canAdd={canCreatePreferences}
                  canRemove={canUpdatePreferences}
                  addPlaceholder="e.g. Goyal Tarai Seed Shed"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Finance constants tab ── */}
          <TabsContent value="finance" className="mt-0 space-y-5">
            <Card className="border-border/40 bg-card rounded-2xl border shadow-sm">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={FileText}
                  title="Particulars & default rates"
                  description="Rows and rates used for the farmer finance (planting) report"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {data.custom.financeConstants.particulars.map((row, index) => (
                  <div
                    key={`finance-particular-${index}-${row.name.slice(0, 24)}`}
                    className="grid gap-2 sm:grid-cols-[1fr_180px_140px]"
                  >
                    <Input
                      defaultValue={row.name}
                      disabled={!canUpdatePreferences}
                      onChange={(e) =>
                        updateFinanceParticular(index, {
                          name: e.target.value,
                        })
                      }
                      className="bg-background h-9 text-sm"
                    />
                    <Select
                      value={row.costDriver}
                      disabled={!canUpdatePreferences}
                      onValueChange={(value) =>
                        updateFinanceParticular(index, {
                          costDriver: value as FinanceCostDriver,
                        })
                      }
                    >
                      <SelectTrigger className="bg-background h-9 w-full text-sm">
                        <SelectValue placeholder="Cost driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {FINANCE_COST_DRIVER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">
                        ₹
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={row.rate}
                        disabled={!canUpdatePreferences}
                        onChange={(e) =>
                          updateFinanceParticular(index, {
                            rate: parseFloat(e.target.value),
                          })
                        }
                        className="bg-background h-9 pl-6 font-mono text-sm"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-1">
              <Card className="border-border/40 bg-card rounded-2xl border shadow-sm">
                <CardHeader className="pb-2">
                  <SectionHeader
                    icon={Package}
                    title="Grading sizes (≥40 mm band)"
                    description="Used for storage-weight split and Paladaar-after-loading bag counts"
                  />
                </CardHeader>
                <CardContent>
                  {data.bagSizes.length === 0 ? (
                    <p className="text-muted-foreground font-custom text-xs">
                      Add bag sizes in the General tab first.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {data.bagSizes.map((size) => (
                        <div
                          key={size}
                          className="border-border/60 flex items-center gap-2.5 rounded-lg border px-3 py-2"
                        >
                          <Switch
                            id={`fc-40mm-${size}`}
                            disabled={!canUpdatePreferences}
                            checked={data.custom.financeConstants.gradingBagSizes40mmAndAbove.includes(
                              size
                            )}
                            onCheckedChange={(checked) =>
                              setFinanceGrading40mmSize(size, checked)
                            }
                          />
                          <Label
                            htmlFor={`fc-40mm-${size}`}
                            className="font-custom text-foreground cursor-pointer text-xs font-medium"
                          >
                            {size}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-foreground mb-3 text-sm font-semibold">
                Actual cost without subsidy (₹ / kg)
              </h3>
              <div className="space-y-4">
                {data.custom.potatoVarieties.map((v) => {
                  const entry =
                    data.custom.financeConstants.actualCostWithoutSubsidy.find(
                      (e) => e.variety === v.value
                    ) ?? ({ variety: v.value, sizeRates: {} } as BuyBackCost);
                  return (
                    <BuyBackTable
                      key={`fc-actual-${v.value}`}
                      entry={entry}
                      bagSizes={data.bagSizes}
                      onChange={(variety, size, rate) =>
                        updateFinanceVarietyMatrix(
                          'actualCostWithoutSubsidy',
                          variety,
                          size,
                          rate
                        )
                      }
                      unitCaption="₹ / kg"
                      canEdit={canUpdatePreferences}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-foreground mb-3 text-sm font-semibold">
                Sale price per bag
              </h3>
              <div className="space-y-4">
                {data.custom.potatoVarieties.map((v) => {
                  const entry =
                    data.custom.financeConstants.salePricePerBag.find(
                      (e) => e.variety === v.value
                    ) ?? ({ variety: v.value, sizeRates: {} } as BuyBackCost);
                  return (
                    <BuyBackTable
                      key={`fc-sale-${v.value}`}
                      entry={entry}
                      bagSizes={data.bagSizes}
                      onChange={(variety, size, rate) =>
                        updateFinanceVarietyMatrix(
                          'salePricePerBag',
                          variety,
                          size,
                          rate
                        )
                      }
                      unitCaption="₹ per bag"
                      canEdit={canUpdatePreferences}
                    />
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </TooltipProvider>
  );
}

function RouteComponent() {
  const hasPermission = usePermissionsStore((state) => state.hasPermission);
  const canReadPreferences = hasPermission('preferences', 'read');
  const { data } = useGetPreferences();
  const hydrated = usePreferencesStoreHydrated();
  const prefs = usePreferencesStore((s) => s.preferences);
  const syncFromServerIfNeeded = usePreferencesStore(
    (s) => s.syncFromServerIfNeeded
  );

  useEffect(() => {
    if (!data || !hydrated) return;
    syncFromServerIfNeeded(data);
  }, [data, hydrated, syncFromServerIfNeeded]);

  if (!canReadPreferences) {
    return (
      <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Settings2 />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              Access restricted for preferences
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              You do not have read permission for preferences.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  if (!data)
    return (
      <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-48 rounded-md" />
          <div className="bg-muted h-4 w-72 rounded-md" />
          <div className="bg-muted h-64 rounded-2xl" />
        </div>
      </main>
    );

  if (!hydrated || !prefs)
    return (
      <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-48 rounded-md" />
          <div className="bg-muted h-4 w-72 rounded-md" />
          <div className="bg-muted h-64 rounded-2xl" />
        </div>
      </main>
    );

  return <PreferencesEditor baseline={data} />;
}
