/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { useGetPreferences } from '@/services/store-admin/preferences/useGetPreferences';
import { useState } from 'react';
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

export const Route = createFileRoute(
  '/store-admin/_authenticated/settings/preferences/'
)({
  component: RouteComponent,
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface LabelValue {
  label: string;
  value: string;
}
interface BuyBackEntry {
  variety: string;
  sizeRates: Record<string, number>;
}
interface BagConfig {
  juteBagWeight: number;
  lenoBagWeight: number;
  bagTypes: string[];
}

interface PreferencesData {
  _id: string;
  coldStorageId: string;
  bagSizes: string[];
  reportFormat: string;
  custom: {
    potatoVarieties: LabelValue[];
    farmerSeedGenerations: LabelValue[];
    graderOptions: string[];
    bagConfig: BagConfig;
    standardBagsPerAcre: Record<string, number>;
    buyBackCost: BuyBackEntry[];
  };
  updatedAt: string;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const VARIETY_COLORS: Record<string, string> = {
  Himalini: 'bg-blue-50 text-blue-700 border-blue-200',
  Jyoti: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  B101: 'bg-orange-50 text-orange-700 border-orange-200',
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
    <div className="mb-6 flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-stone-100 p-2 text-stone-600">
        <Icon size={16} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-stone-500">{description}</p>
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
          className="gap-1.5 rounded-full border border-stone-200 bg-stone-100 py-1.5 pr-2 pl-3 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-200"
        >
          {item}
          <button
            onClick={() => onRemove(item)}
            className="rounded-full transition-colors hover:text-red-500"
            aria-label={`Remove ${item}`}
          >
            <X size={12} />
          </button>
        </Badge>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full border-dashed px-3 text-xs text-stone-500 hover:text-stone-800"
          >
            <Plus size={12} className="mr-1" /> Add
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs">
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
  items: LabelValue[];
  onRemove: (value: string) => void;
  onAdd: (item: LabelValue) => void;
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
            'gap-1.5 rounded-full border py-1.5 pr-2 pl-3 text-xs font-medium transition-colors',
            VARIETY_COLORS[item.label] ??
              'border-stone-200 bg-stone-100 text-stone-700'
          )}
        >
          {item.label}
          <button
            onClick={() => onRemove(item.value)}
            className="rounded-full transition-colors hover:text-red-500"
          >
            <X size={12} />
          </button>
        </Badge>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full border-dashed px-3 text-xs text-stone-500"
          >
            <Plus size={12} className="mr-1" /> Add
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs">
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
  entry: BuyBackEntry;
  bagSizes: string[];
  onChange: (variety: string, size: string, rate: number) => void;
}) {
  const colorClass =
    VARIETY_COLORS[entry.variety] ??
    'bg-stone-50 text-stone-700 border-stone-200';

  return (
    <Card className="border border-stone-200 shadow-none">
      <CardHeader className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <Badge
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold',
              colorClass
            )}
          >
            {entry.variety}
          </Badge>
          <span className="text-xs text-stone-400">₹ per kg</span>
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
                <Label className="mb-1.5 block font-mono text-xs text-stone-400">
                  {size}
                </Label>
                <div className="relative">
                  <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-stone-400">
                    ₹
                  </span>
                  <Input
                    type="number"
                    step="0.25"
                    defaultValue={rate}
                    onChange={(e) =>
                      onChange(entry.variety, size, parseFloat(e.target.value))
                    }
                    className="h-8 border-stone-200 bg-stone-50 pl-6 font-mono text-sm focus:bg-white"
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

function PreferencesEditor({ data: initial }: { data: PreferencesData }) {
  const [data, setData] = useState<PreferencesData>(initial);
  const [dirty, setDirty] = useState(false);

  // Bag sizes
  const removeBagSize = (size: string) => {
    setData((p) => ({ ...p, bagSizes: p.bagSizes.filter((s) => s !== size) }));
    setDirty(true);
  };
  const addBagSize = (size: string) => {
    setData((p) => ({ ...p, bagSizes: [...p.bagSizes, size] }));
    setDirty(true);
  };

  // Varieties
  const removeVariety = (val: string) => {
    setData((p) => ({
      ...p,
      custom: {
        ...p.custom,
        potatoVarieties: p.custom.potatoVarieties.filter(
          (v) => v.value !== val
        ),
      },
    }));
    setDirty(true);
  };
  const addVariety = (item: LabelValue) => {
    setData((p) => ({
      ...p,
      custom: {
        ...p.custom,
        potatoVarieties: [...p.custom.potatoVarieties, item],
      },
    }));
    setDirty(true);
  };

  // Seed generations
  const removeGeneration = (val: string) => {
    setData((p) => ({
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
  const addGeneration = (item: LabelValue) => {
    setData((p) => ({
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
    setData((p) => ({
      ...p,
      custom: {
        ...p.custom,
        graderOptions: p.custom.graderOptions.filter((o) => o !== g),
      },
    }));
    setDirty(true);
  };
  const addGrader = (g: string) => {
    setData((p) => ({
      ...p,
      custom: { ...p.custom, graderOptions: [...p.custom.graderOptions, g] },
    }));
    setDirty(true);
  };

  // Buy-back rates
  const updateRate = (variety: string, size: string, rate: number) => {
    setData((p) => ({
      ...p,
      custom: {
        ...p.custom,
        buyBackCost: p.custom.buyBackCost.map((e) =>
          e.variety === variety
            ? { ...e, sizeRates: { ...e.sizeRates, [size]: rate } }
            : e
        ),
      },
    }));
    setDirty(true);
  };

  // Bag config
  const updateBagWeight = (
    key: 'juteBagWeight' | 'lenoBagWeight',
    val: number
  ) => {
    setData((p) => ({
      ...p,
      custom: { ...p.custom, bagConfig: { ...p.custom.bagConfig, [key]: val } },
    }));
    setDirty(true);
  };

  // Standard bags per acre
  const updateBagsPerAcre = (variety: string, val: number) => {
    setData((p) => ({
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

  const handleSave = () => {
    // TODO: wire to your mutation hook
    console.log('Saving preferences:', data);
    setDirty(false);
  };

  const handleReset = () => {
    setData(initial);
    setDirty(false);
  };

  return (
    <TooltipProvider>
      <main className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-xs text-stone-400">
              <span>Settings</span>
              <ChevronRight size={12} />
              <span className="text-stone-600">Preferences</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Cold Storage Preferences
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Last updated {formatDate(data.updatedAt)} · ID:{' '}
              <span className="font-mono">{data._id.slice(-8)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-stone-500"
              >
                <RotateCcw size={14} /> Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty}
              className={cn(
                'gap-1.5 transition-all',
                dirty
                  ? 'bg-stone-900 text-white hover:bg-stone-700'
                  : 'bg-stone-100 text-stone-400'
              )}
            >
              <Save size={14} /> Save changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="h-auto gap-1 rounded-lg bg-stone-100 p-1">
            <TabsTrigger
              value="general"
              className="gap-1.5 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Settings2 size={13} /> General
            </TabsTrigger>
            <TabsTrigger
              value="varieties"
              className="gap-1.5 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Wheat size={13} /> Varieties & Rates
            </TabsTrigger>
            <TabsTrigger
              value="bags"
              className="gap-1.5 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Package size={13} /> Bag Config
            </TabsTrigger>
            <TabsTrigger
              value="graders"
              className="gap-1.5 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Users size={13} /> Graders
            </TabsTrigger>
          </TabsList>

          {/* ── General Tab ── */}
          <TabsContent value="general" className="mt-0 space-y-5">
            <Card className="border-stone-200 shadow-none">
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
                <p className="mt-3 font-mono text-xs text-stone-400">
                  {data.bagSizes.length} sizes configured
                </p>
              </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-none">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={Settings2}
                  title="Report Format"
                  description="Choose the default layout for generated reports"
                />
              </CardHeader>
              <CardContent>
                <Select
                  defaultValue={data.reportFormat}
                  onValueChange={(v) => {
                    setData((p) => ({ ...p, reportFormat: v }));
                    setDirty(true);
                  }}
                >
                  <SelectTrigger className="w-48 bg-stone-50">
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
              <Card className="border-stone-200 shadow-none">
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

              <Card className="border-stone-200 shadow-none">
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
            <Card className="border-stone-200 shadow-none">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={Scale}
                  title="Standard Bags per Acre"
                  description="Benchmark yield used for reporting"
                />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  {Object.entries(data.custom.standardBagsPerAcre).map(
                    ([variety, count]) => (
                      <div key={variety}>
                        <Label
                          className={cn(
                            'mb-2 block w-fit rounded border px-2 py-0.5 text-xs font-semibold',
                            VARIETY_COLORS[variety] ?? 'bg-stone-100'
                          )}
                        >
                          {variety}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            defaultValue={count}
                            onChange={(e) =>
                              updateBagsPerAcre(
                                variety,
                                parseInt(e.target.value)
                              )
                            }
                            className="h-9 w-24 bg-stone-50 font-mono text-sm"
                          />
                          <span className="text-xs text-stone-400">
                            bags/acre
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Buy-Back Cost Tables */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-stone-700">
                  Buy-back Rates
                </h3>
                <Tooltip>
                  <TooltipTrigger>
                    <Info size={13} className="text-stone-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Rates are per kg (₹). Edit any cell inline.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-4">
                {data.custom.buyBackCost.map((entry) => (
                  <BuyBackTable
                    key={entry.variety}
                    entry={entry}
                    bagSizes={data.bagSizes}
                    onChange={updateRate}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Bag Config Tab ── */}
          <TabsContent value="bags" className="mt-0 space-y-5">
            <Card className="border-stone-200 shadow-none">
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
                      <Label className="mb-2 block font-mono text-xs text-stone-500">
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
                          className="h-9 w-28 bg-stone-50 font-mono text-sm"
                        />
                        <span className="text-xs text-stone-400">kg</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div>
                  <Label className="mb-3 block font-mono text-xs text-stone-500">
                    Enabled Bag Types
                  </Label>
                  <div className="flex gap-4">
                    {['JUTE', 'LENO'].map((type) => (
                      <div key={type} className="flex items-center gap-2.5">
                        <Switch
                          id={type}
                          defaultChecked={data.custom.bagConfig.bagTypes.includes(
                            type
                          )}
                          onCheckedChange={(checked) => {
                            setData((p) => ({
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
                          className="cursor-pointer text-sm font-medium text-stone-700"
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
            <Card className="border-stone-200 shadow-none">
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
                          setData((p) => ({
                            ...p,
                            custom: { ...p.custom, graderOptions: updated },
                          }));
                          setDirty(true);
                        }}
                        className="h-9 max-w-xs border-stone-200 bg-stone-50 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-stone-400 opacity-0 group-hover:opacity-100 hover:text-red-500"
                        onClick={() => removeGrader(grader)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1.5 border-dashed text-xs text-stone-500 hover:text-stone-800"
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
  if (!data)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-stone-100" />
          <div className="h-4 w-72 rounded bg-stone-100" />
          <div className="h-64 rounded-xl bg-stone-100" />
        </div>
      </main>
    );
  return <PreferencesEditor data={data} />;
}
