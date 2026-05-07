import { Fragment } from 'react';
import { Plus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/date-picker';

const GRADER_OPTIONS = ['Grader 1', 'Grader 2', 'Grader 3'] as const;
const GRADING_SIZES = [
  'Ration',
  'Seed',
  'Goli',
  'Number-8',
  'Number-10',
  'Number-12',
  'Number-6/4',
  'Cut',
] as const;
const BAG_TYPES = ['JUTE', 'PP', 'HDPE'] as const;

const SELECTED_INCOMING_PASSES = [{ _id: '1', gatePassNo: 159, bags: 127 }];

const GradingDetailsStep = () => {
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {SELECTED_INCOMING_PASSES.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-custom text-foreground text-base font-semibold sm:text-lg">
              Selected incoming gate passes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-0 pb-6">
            <div className="border-border/60 overflow-hidden rounded-lg border">
              <table className="font-custom w-full text-sm">
                <thead>
                  <tr className="border-border/60 bg-muted/50">
                    <th className="text-muted-foreground px-4 py-3 text-left font-semibold">
                      Gate Pass #
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-right font-semibold">
                      Bags
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SELECTED_INCOMING_PASSES.map((pass) => (
                    <tr
                      key={pass._id}
                      className="border-border/40 border-b last:border-0"
                    >
                      <td className="text-foreground px-4 py-2.5 font-medium">
                        #{pass.gatePassNo}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                        {pass.bags}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-border/60 bg-muted/30 font-semibold">
                    <td className="text-foreground px-4 py-3">Total</td>
                    <td className="text-foreground px-4 py-3 text-right tabular-nums">
                      127
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <FieldGroup className="space-y-6">
        <Field>
          <FieldLabel
            htmlFor="grading-grader"
            className="font-custom text-base font-semibold"
          >
            Grader
          </FieldLabel>
          <select
            id="grading-grader"
            defaultValue=""
            className="border-input bg-background focus-visible:ring-primary font-custom h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <option value="">Select grader</option>
            {GRADER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>

        <Field>
          <FieldLabel
            htmlFor="grading-manualGatePassNumber"
            className="font-custom text-base font-semibold"
          >
            Manual Gate Pass Number
          </FieldLabel>
          <Input
            id="grading-manualGatePassNumber"
            type="number"
            min={0}
            placeholder=""
            className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </Field>

        <Field>
          <DatePicker label="Date" id="grading-date" />
        </Field>

        <div className="space-y-4">
          <h3 className="font-custom text-foreground text-base font-semibold sm:text-lg">
            Enter Quantities
          </h3>
          <p className="text-muted-foreground font-custom text-sm">
            Enter size-wise quantities and weights for this grading pass.
          </p>

          <div className="space-y-4 md:space-y-0">
            <div className="hidden md:grid md:grid-cols-[minmax(5rem,1fr)_7rem_8rem_6rem] md:gap-x-6 md:gap-y-3 lg:grid-cols-[minmax(6rem,1.25fr)_8rem_9rem_7rem] lg:gap-x-8 lg:gap-y-4">
              <span className="font-custom text-muted-foreground border-border/60 border-b pb-2 text-xs font-medium tracking-wide uppercase">
                Size
              </span>
              <span className="font-custom text-muted-foreground border-border/60 border-b pb-2 text-xs font-medium tracking-wide uppercase">
                Qty
              </span>
              <span className="font-custom text-muted-foreground border-border/60 border-b pb-2 text-xs font-medium tracking-wide uppercase">
                Bag Type
              </span>
              <span className="font-custom text-muted-foreground border-border/60 border-b pb-2 text-xs font-medium tracking-wide uppercase">
                Wt (kg)
              </span>
              {GRADING_SIZES.map((sizeLabel) => (
                <Fragment key={sizeLabel}>
                  <span className="font-custom text-foreground text-sm font-medium md:text-base">
                    {sizeLabel}
                  </span>
                  <Field className="min-w-0">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Qty"
                      className="font-custom h-9 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </Field>
                  <Field className="min-w-0">
                    <select
                      defaultValue="JUTE"
                      className="border-input bg-background focus-visible:ring-primary font-custom h-9 w-full rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      {BAG_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field className="min-w-0">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Wt"
                      className="font-custom h-9 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </Field>
                </Fragment>
              ))}
              <div className="col-span-4 lg:col-span-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-custom"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Size
                </Button>
              </div>
            </div>

            <div className="space-y-4 md:hidden">
              {GRADING_SIZES.map((sizeLabel, index) => (
                <div
                  key={sizeLabel}
                  className="border-border/40 bg-muted/20 flex flex-col gap-4 rounded-lg border p-4"
                >
                  <span className="font-custom text-foreground text-base font-semibold">
                    {sizeLabel}
                  </span>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field>
                      <label
                        htmlFor={`qty-m-${index}`}
                        className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                      >
                        Quantity
                      </label>
                      <Input
                        id={`qty-m-${index}`}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="Qty"
                        className="font-custom h-10 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </Field>
                    <Field>
                      <label
                        htmlFor={`bag-m-${index}`}
                        className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                      >
                        Bag Type
                      </label>
                      <select
                        id={`bag-m-${index}`}
                        defaultValue="JUTE"
                        className="border-input bg-background focus-visible:ring-primary font-custom h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        {BAG_TYPES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field>
                      <label
                        htmlFor={`wt-m-${index}`}
                        className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                      >
                        Weight (kg)
                      </label>
                      <Input
                        id={`wt-m-${index}`}
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="Wt"
                        className="font-custom h-10 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-custom w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Size
              </Button>
            </div>
          </div>

          <div className="border-border/60 bg-muted/30 flex items-center justify-between rounded-lg border px-4 py-2.5">
            <span className="font-custom text-foreground text-sm font-semibold">
              Total bags
            </span>
            <span className="font-custom font-medium tabular-nums">0</span>
          </div>

          <span className="text-muted-foreground block text-xs">
            Quantity / Approx Weight (kg)
          </span>
        </div>

        <Field>
          <FieldLabel
            htmlFor="grading-remarks"
            className="font-custom text-base font-semibold"
          >
            Remarks
          </FieldLabel>
          <textarea
            id="grading-remarks"
            placeholder="Max 500 characters"
            maxLength={500}
            rows={3}
            className="border-input bg-background ring-offset-background focus-visible:ring-primary font-custom flex w-full rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end sm:gap-4">
        <Button
          type="button"
          variant="outline"
          className="font-custom order-3 w-full sm:order-1 sm:w-auto"
        >
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          className="font-custom order-2 w-full sm:order-2 sm:w-auto"
        >
          Reset
        </Button>
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="font-custom order-1 w-full px-8 font-bold sm:order-3 sm:w-auto"
        >
          Review & Create
        </Button>
      </div>
    </form>
  );
};

export default GradingDetailsStep;
