import type { FarmerSeedReportRow } from './columns';

export type FilterOperator =
  | 'contains'
  | '='
  | '!='
  | 'startsWith'
  | 'endsWith'
  | '>'
  | '>='
  | '<'
  | '<=';

export type FilterConditionNode = {
  id: string;
  type: 'condition';
  field: string;
  operator: FilterOperator;
  value: string;
};

export type FilterGroupNode = {
  id: string;
  type: 'group';
  operator: 'AND' | 'OR';
  conditions: FilterNode[];
};

export type FilterNode = FilterConditionNode | FilterGroupNode;

export const numericFilterFields = [
  'accountNumber',
  'gatePassNo',
  'totalBags',
  'rate',
  'totalSeedAmount',
];

const uid = () => `f_${Math.random().toString(36).slice(2, 10)}`;

export const createDefaultCondition = (): FilterConditionNode => ({
  id: uid(),
  type: 'condition',
  field: 'farmerName',
  operator: 'contains',
  value: '',
});

export const createDefaultFilterGroup = (): FilterGroupNode => ({
  id: uid(),
  type: 'group',
  operator: 'AND',
  conditions: [createDefaultCondition()],
});

export const isAdvancedFilterGroup = (
  value: unknown
): value is FilterGroupNode =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  (value as { type?: string }).type === 'group' &&
  Array.isArray((value as { conditions?: unknown[] }).conditions);

export const getDefaultOperatorForField = (
  field: string,
  allNumericFields: readonly string[]
): FilterOperator => (allNumericFields.includes(field) ? '=' : 'contains');

const matchesString = (
  actual: string,
  operator: FilterOperator,
  expected: string
): boolean => {
  const lhs = actual.toLowerCase();
  const rhs = expected.toLowerCase();

  switch (operator) {
    case 'contains':
      return lhs.includes(rhs);
    case '=':
      return lhs === rhs;
    case '!=':
      return lhs !== rhs;
    case 'startsWith':
      return lhs.startsWith(rhs);
    case 'endsWith':
      return lhs.endsWith(rhs);
    default:
      return true;
  }
};

const matchesNumber = (
  actual: number,
  operator: FilterOperator,
  expected: number
): boolean => {
  switch (operator) {
    case '=':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '>':
      return actual > expected;
    case '>=':
      return actual >= expected;
    case '<':
      return actual < expected;
    case '<=':
      return actual <= expected;
    default:
      return true;
  }
};

type EvaluateOptions = {
  getFieldValue: (row: FarmerSeedReportRow, field: string) => unknown;
  numericFields: readonly string[];
};

const evaluateCondition = (
  row: FarmerSeedReportRow,
  condition: FilterConditionNode,
  options: EvaluateOptions
): boolean => {
  const rawExpected = condition.value.trim();
  if (!rawExpected) return true;

  const rowValue = options.getFieldValue(row, condition.field);

  if (options.numericFields.includes(condition.field)) {
    const lhs = Number(rowValue);
    const rhs = Number(rawExpected);
    if (Number.isNaN(lhs) || Number.isNaN(rhs)) return false;
    return matchesNumber(lhs, condition.operator, rhs);
  }

  return matchesString(String(rowValue ?? ''), condition.operator, rawExpected);
};

export const evaluateFilterGroup = (
  row: FarmerSeedReportRow,
  group: FilterGroupNode,
  options: EvaluateOptions
): boolean => {
  if (group.conditions.length === 0) return true;
  const evaluator = group.operator === 'AND' ? 'every' : 'some';
  return group.conditions[evaluator]((node) => {
    if (node.type === 'group') {
      return evaluateFilterGroup(row, node, options);
    }
    return evaluateCondition(row, node, options);
  });
};

export const hasAnyUsableFilter = (group: FilterGroupNode): boolean =>
  group.conditions.some((node) => {
    if (node.type === 'group') return hasAnyUsableFilter(node);
    return node.value.trim().length > 0;
  });
