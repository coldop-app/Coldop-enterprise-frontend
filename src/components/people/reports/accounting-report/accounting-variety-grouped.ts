/** Rows for one variety block inside a single accounting table. */
export type AccountingVarietyGroup<T> = {
  varietyKey: string;
  varietyLabel: string;
  rows: T[];
};
