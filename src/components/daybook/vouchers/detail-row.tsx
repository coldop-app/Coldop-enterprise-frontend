import { memo } from 'react';

interface DetailRowProps {
  label: string;
  value: string;
  icon?: React.ElementType;
}

const DetailRow = memo(function DetailRow({
  label,
  value,
  icon: Icon,
}: DetailRowProps) {
  return (
    <div className="flex items-start gap-2">
      {Icon != null ? (
        <Icon className="text-muted-foreground/60 mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground/70 mb-0.5 text-[10px] font-medium tracking-wider uppercase">
          {label}
        </div>
        <div className="text-foreground wrap-break-word text-sm font-semibold sm:truncate">
          {value ?? '—'}
        </div>
      </div>
    </div>
  );
});

export { DetailRow };
