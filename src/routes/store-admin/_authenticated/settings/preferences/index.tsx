/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import {
  useGetPreferences,
  type PreferencesData,
  type PreferenceOption,
  type BuyBackCost,
} from '@/services/store-admin/preferences/useGetPreferences';
import { useUpdatePreferences } from '@/services/store-admin/preferences/useUpdatePreferences';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  X,
  Plus,
  Save,
  RotateCcw,
  Package,
  Wheat,
  Users,
  Scale,
  Settings2,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePreferencesStore,
  usePreferencesStoreHydrated,
} from '@/stores/usePreferencesStore';

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
  addPlaceholder = 'Add item…',
}: {
  items: string[];
  onRemove: (item: string) => void;
  onAdd: (item: string) => void;
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
        </Badge>
      ))}
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
    </div>
  );
}

function LabelValueList({
  items,
  onRemove,
  onAdd,
}: {
  items: PreferenceOption[];
  onRemove: (value: string) => void;
  onAdd: (item: PreferenceOption) => void;
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
        </Badge>
      ))}
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
    </div>
  );
}

function BuyBackTable({
  entry,
  bagSizes,
  onChange,
}: {
  entry: BuyBackCost;
  bagSizes: string[];
  onChange: (variety: string, size: string, rate: number) => void;
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
          <span className="text-muted-foreground text-xs">₹ per kg</span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {bagSizes.map((size) => {
            const rate =
              entry.sizeRates[size] ??
              entry.sizeRates[size.replace('-', '–')] ??
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

// ─── Main Component ───────────────────────────────────────────────────────────

function PreferencesEditor({ baseline }: { baseline: PreferencesData }) {
  const data = usePreferencesStore((s) => s.preferences);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);
  const resetToServer = usePreferencesStore((s) => s.resetToServer);
  const { mutateAsync, isPending } = useUpdatePreferences();
  const [dirty, setDirty] = useState(false);

  if (!data) return null;

  // Bag sizes
  const removeBagSize = (size: string) => {
    updatePreferences((p) => ({
      ...p,
      bagSizes: p.bagSizes.filter((s) => s !== size),
    }));
    setDirty(true);
  };
  const addBagSize = (size: string) => {
    updatePreferences((p) => ({ ...p, bagSizes: [...p.bagSizes, size] }));
    setDirty(true);
  };

  // Varieties
  const removeVariety = (val: string) => {
    updatePreferences((p) => {
      const { [val]: _removed, ...restBags } = p.custom.standardBagsPerAcre;
      return {
        ...p,
        custom: {
          ...p.custom,
          potatoVarieties: p.custom.potatoVarieties.filter(
            (v) => v.value !== val
          ),
          standardBagsPerAcre: restBags,
          buyBackCost: p.custom.buyBackCost.filter((e) => e.variety !== val),
        },
      };
    });
    setDirty(true);
  };
  const addVariety = (item: PreferenceOption) => {
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        potatoVarieties: [...p.custom.potatoVarieties, item],
        standardBagsPerAcre: {
          ...p.custom.standardBagsPerAcre,
          [item.value]: p.custom.standardBagsPerAcre[item.value] ?? 0,
        },
        buyBackCost: p.custom.buyBackCost.some((e) => e.variety === item.value)
          ? p.custom.buyBackCost
          : [...p.custom.buyBackCost, { variety: item.value, sizeRates: {} }],
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
    updatePreferences((p) => ({
      ...p,
      custom: { ...p.custom, graderOptions: [...p.custom.graderOptions, g] },
    }));
    setDirty(true);
  };

  // Buy-back rates
  const updateRate = (variety: string, size: string, rate: number) => {
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

  // Bag config
  const updateBagWeight = (
    key: 'juteBagWeight' | 'lenoBagWeight',
    val: number
  ) => {
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        bagConfig: { ...p.custom.bagConfig, [key]: val },
      },
    }));
    setDirty(true);
  };

  // Standard bags per acre
  const updateBagsPerAcre = (variety: string, val: number) => {
    updatePreferences((p) => ({
      ...p,
      custom: {
        ...p.custom,
        standardBagsPerAcre: {
          ...p.custom.standardBagsPerAcre,
          [variety]: val,
        },
      },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
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
            {dirty && (
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
              disabled={!dirty || isPending}
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
              <Users size={13} /> Graders
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
                <TagList
                  items={data.bagSizes}
                  onRemove={removeBagSize}
                  onAdd={addBagSize}
                  addPlaceholder="e.g. 55-60"
                />
                <p className="text-muted-foreground mt-3 font-mono text-xs">
                  {data.bagSizes.length} sizes configured
                </p>
              </CardContent>
            </Card>

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
                  />
                </CardContent>
              </Card>
            </div>

            {/* Standard Bags Per Acre */}
            <Card className="border-border/40 bg-card rounded-2xl border shadow-sm">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={Scale}
                  title="Standard Bags per Acre"
                  description="Benchmark yield used for reporting"
                />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  {data.custom.potatoVarieties.map((v) => {
                    const count = data.custom.standardBagsPerAcre[v.value] ?? 0;
                    const display = v.label;
                    return (
                      <div key={v.value}>
                        <Label
                          className={cn(
                            'mb-2 block w-fit rounded border px-2 py-0.5 text-xs font-semibold',
                            VARIETY_COLORS[display] ??
                              'border-border bg-muted text-foreground'
                          )}
                        >
                          {display}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            defaultValue={count}
                            onChange={(e) =>
                              updateBagsPerAcre(
                                v.value,
                                parseInt(e.target.value, 10)
                              )
                            }
                            className="bg-background h-9 w-24 font-mono text-sm"
                          />
                          <span className="text-muted-foreground text-xs">
                            bags/acre
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

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
                    className="text-muted-foreground hover:text-foreground mt-2 gap-1.5 border-dashed text-xs transition-colors duration-200"
                    onClick={() => addGrader('New Grader')}
                  >
                    <Plus size={12} /> Add Grader
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </TooltipProvider>
  );
}

function RouteComponent() {
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
