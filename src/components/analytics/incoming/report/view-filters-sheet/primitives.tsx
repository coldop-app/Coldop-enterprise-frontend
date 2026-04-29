import * as React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export const SortableColumnRow = React.memo(function SortableColumnRow({
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
});

export const SortableGroupingRow = React.memo(function SortableGroupingRow({
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
});

export const GroupingDropZone = React.memo(function GroupingDropZone({
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
});

export const EmptyState = React.memo(function EmptyState({
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
});

export const SectionLabel = React.memo(function SectionLabel({
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
});
