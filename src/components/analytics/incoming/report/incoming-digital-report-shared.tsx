export type IncomingStatus = 'NOT_GRADED' | 'GRADED';

export type IncomingRecord = {
  gatePassNo: number;
  manualGatePassNumber: number | null;
  date: string;
  variety: string;
  location: string | null;
  truckNumber: string;
  bagsReceived: number;
  slipNumber: string | null;
  grossWeightKg: number | null;
  tareWeightKg: number | null;
  status: IncomingStatus;
  remarks: string | null;
};

export const INCOMING_GATE_PASSES: IncomingRecord[] = [
  {
    gatePassNo: 10021,
    manualGatePassNumber: 451,
    date: '2026-04-25',
    variety: 'FC-5',
    location: 'Store Gate - 2',
    truckNumber: 'PB10GH2255',
    bagsReceived: 92,
    slipNumber: 'WS-8821',
    grossWeightKg: 6640,
    tareWeightKg: 1840,
    status: 'NOT_GRADED',
    remarks: 'Bag stitching pending for 2 bags.',
  },
  {
    gatePassNo: 10022,
    manualGatePassNumber: null,
    date: '2026-04-26',
    variety: 'Khyati',
    location: 'Main Dock',
    truckNumber: 'HR68AF1902',
    bagsReceived: 74,
    slipNumber: 'WS-8822',
    grossWeightKg: 5410,
    tareWeightKg: 1590,
    status: 'GRADED',
    remarks: 'Moisture within accepted limits.',
  },
  {
    gatePassNo: 10023,
    manualGatePassNumber: 453,
    date: '2026-04-27',
    variety: 'Lady Rosetta',
    location: null,
    truckNumber: 'PB02AZ9011',
    bagsReceived: 58,
    slipNumber: null,
    grossWeightKg: null,
    tareWeightKg: null,
    status: 'NOT_GRADED',
    remarks: null,
  },
];

export type FilterField =
  | 'gatePassNo'
  | 'date'
  | 'variety'
  | 'truckNumber'
  | 'bagsReceived'
  | 'slipNumber'
  | 'grossWeightKg'
  | 'tareWeightKg'
  | 'status';
export type FilterOperator =
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<=';
export type FilterConditionNode = {
  id: string;
  type: 'condition';
  field: FilterField;
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
export type GlobalFilterValue = string | FilterGroupNode;

export const numericFilterFields: FilterField[] = [
  'gatePassNo',
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
];

const generateId = () => Math.random().toString(36).slice(2, 10);

export const defaultCondition = (): FilterConditionNode => ({
  id: generateId(),
  type: 'condition',
  field: 'status',
  operator: '=',
  value: '',
});

export const defaultFilterGroup = (): FilterGroupNode => ({
  id: generateId(),
  type: 'group',
  operator: 'AND',
  conditions: [],
});

export const isAdvancedFilterGroup = (
  value: unknown
): value is FilterGroupNode =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as { type?: string }).type === 'group'
  );

const isValuePresent = (value: string) => value.trim().length > 0;

export const hasAnyUsableFilter = (group: FilterGroupNode): boolean =>
  group.conditions.some((node) =>
    node.type === 'group'
      ? hasAnyUsableFilter(node)
      : isValuePresent(node.value)
  );

export const getDefaultOperatorForField = (
  field: FilterField
): FilterOperator => (numericFilterFields.includes(field) ? '=' : 'contains');

const getComparableValue = (
  record: IncomingRecord,
  field: FilterField
): string | number => {
  const value = record[field];
  if (value === null || value === undefined) return '';
  return typeof value === 'number' ? value : String(value);
};

const evaluateCondition = (
  record: IncomingRecord,
  condition: FilterConditionNode
): boolean => {
  if (!isValuePresent(condition.value)) return true;
  const raw = getComparableValue(record, condition.field);
  const isNumeric = numericFilterFields.includes(condition.field);

  if (isNumeric) {
    const left = Number(raw);
    const right = Number(condition.value);
    if (Number.isNaN(left) || Number.isNaN(right)) return false;

    switch (condition.operator) {
      case '=':
        return left === right;
      case '!=':
        return left !== right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      default:
        return false;
    }
  }

  const left = String(raw).toLowerCase();
  const right = condition.value.toLowerCase();

  switch (condition.operator) {
    case 'contains':
      return left.includes(right);
    case 'startsWith':
      return left.startsWith(right);
    case 'endsWith':
      return left.endsWith(right);
    case '=':
      return left === right;
    case '!=':
      return left !== right;
    default:
      return false;
  }
};

export const evaluateFilterGroup = (
  record: IncomingRecord,
  group: FilterGroupNode
): boolean => {
  const conditions = group.conditions.filter((node) =>
    node.type === 'group'
      ? hasAnyUsableFilter(node)
      : isValuePresent(node.value)
  );

  if (conditions.length === 0) return true;

  const predicate = (node: FilterNode) =>
    node.type === 'group'
      ? evaluateFilterGroup(record, node)
      : evaluateCondition(record, node);

  return group.operator === 'AND'
    ? conditions.every(predicate)
    : conditions.some(predicate);
};

export const mutateFilterNodeById = (
  group: FilterGroupNode,
  targetId: string,
  updater: (node: FilterNode) => FilterNode
): FilterGroupNode => {
  if (group.id === targetId) {
    const updated = updater(group);
    return updated.type === 'group' ? updated : group;
  }

  return {
    ...group,
    conditions: group.conditions.map((node) => {
      if (node.id === targetId) return updater(node);
      if (node.type === 'group')
        return mutateFilterNodeById(node, targetId, updater);
      return node;
    }),
  };
};

export const removeFilterNodeById = (
  group: FilterGroupNode,
  nodeId: string
): FilterGroupNode => ({
  ...group,
  conditions: group.conditions
    .filter((node) => node.id !== nodeId)
    .map((node) =>
      node.type === 'group' ? removeFilterNodeById(node, nodeId) : node
    ),
});

export const filterableColumns = [
  { id: 'gatePassNo', label: 'Gate Pass' },
  { id: 'date', label: 'Date' },
  { id: 'variety', label: 'Variety' },
  { id: 'truckNumber', label: 'Truck No.' },
  { id: 'bagsReceived', label: 'Bags' },
  { id: 'slipNumber', label: 'Slip No.' },
  { id: 'grossWeightKg', label: 'Gross (kg)' },
  { id: 'tareWeightKg', label: 'Tare (kg)' },
] as const;

export const advancedFilterFields: Array<{
  id: FilterField;
  label: string;
  type: 'string' | 'number';
}> = [
  { id: 'gatePassNo', label: 'Gate Pass', type: 'number' },
  { id: 'date', label: 'Date', type: 'string' },
  { id: 'variety', label: 'Variety', type: 'string' },
  { id: 'truckNumber', label: 'Truck No.', type: 'string' },
  { id: 'bagsReceived', label: 'Bags', type: 'number' },
  { id: 'slipNumber', label: 'Slip No.', type: 'string' },
  { id: 'grossWeightKg', label: 'Gross (kg)', type: 'number' },
  { id: 'tareWeightKg', label: 'Tare (kg)', type: 'number' },
  { id: 'status', label: 'Status', type: 'string' },
];

export const filterOperatorLabels: Record<FilterOperator, string> = {
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  '=': 'equals',
  '!=': 'not equal',
  '>': 'greater than',
  '>=': '>= greater or equal',
  '<': 'less than',
  '<=': '<= less or equal',
};

export const stringOperators: FilterOperator[] = [
  'contains',
  '=',
  '!=',
  'startsWith',
  'endsWith',
];
export const numberOperators: FilterOperator[] = [
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
];
