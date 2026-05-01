export type FilterField =
  | 'gatePassNo'
  | 'manualGatePassNumber'
  | 'date'
  | 'farmerName'
  | 'variety'
  | 'totalBags'
  | 'bagsReceived'
  | 'netWeightKg'
  | 'status'
  | 'location'
  | 'truckNumber'
  | 'farmerMobile'
  | 'farmerAddress'
  | 'varietyName'
  | 'generation'
  | 'sizeName'
  | 'sizeQuantity'
  | 'sizeAcres'
  | 'sizeAmount'
  | 'buyBackBags'
  | 'buyBackNetWeightKg';

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

export const numericFilterFields: FilterField[] = [
  'gatePassNo',
  'totalBags',
  'bagsReceived',
  'netWeightKg',
  'sizeQuantity',
  'sizeAcres',
  'sizeAmount',
  'buyBackBags',
  'buyBackNetWeightKg',
];

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createDefaultCondition = (
  field: FilterField = 'farmerName'
): FilterConditionNode => ({
  id: generateId(),
  type: 'condition',
  field,
  operator: getDefaultOperatorForField(field),
  value: '',
});

export const createDefaultFilterGroup = (): FilterGroupNode => ({
  id: generateId(),
  type: 'group',
  operator: 'AND',
  conditions: [createDefaultCondition()],
});

export const getDefaultOperatorForField = (
  field: FilterField
): FilterOperator => (numericFilterFields.includes(field) ? '=' : 'contains');

const hasConditionValue = (node: FilterConditionNode) =>
  node.value.trim().length > 0;

export const hasAnyUsableFilter = (group: FilterGroupNode): boolean =>
  group.conditions.some((node) => {
    if (node.type === 'condition') return hasConditionValue(node);
    return hasAnyUsableFilter(node);
  });

const compareStrings = (
  inputValue: string,
  operator: FilterOperator,
  conditionValue: string
) => {
  const source = inputValue.toLowerCase();
  const target = conditionValue.toLowerCase();
  switch (operator) {
    case 'contains':
      return source.includes(target);
    case 'startsWith':
      return source.startsWith(target);
    case 'endsWith':
      return source.endsWith(target);
    case '=':
      return source === target;
    case '!=':
      return source !== target;
    default:
      return false;
  }
};

const compareNumbers = (
  inputValue: number,
  operator: FilterOperator,
  conditionValue: number
) => {
  switch (operator) {
    case '=':
      return inputValue === conditionValue;
    case '!=':
      return inputValue !== conditionValue;
    case '>':
      return inputValue > conditionValue;
    case '>=':
      return inputValue >= conditionValue;
    case '<':
      return inputValue < conditionValue;
    case '<=':
      return inputValue <= conditionValue;
    default:
      return false;
  }
};

const evaluateCondition = <TRecord extends Record<string, unknown>>(
  row: TRecord,
  node: FilterConditionNode
) => {
  if (!hasConditionValue(node)) return true;
  const rawValue = row[node.field];
  const conditionValue = node.value.trim();

  if (numericFilterFields.includes(node.field)) {
    const inputNumber = Number(rawValue);
    const targetNumber = Number(conditionValue);
    if (Number.isNaN(inputNumber) || Number.isNaN(targetNumber)) return false;
    return compareNumbers(inputNumber, node.operator, targetNumber);
  }

  return compareStrings(String(rawValue ?? ''), node.operator, conditionValue);
};

const evaluateNode = <TRecord extends Record<string, unknown>>(
  row: TRecord,
  node: FilterNode
): boolean => {
  if (node.type === 'condition') return evaluateCondition(row, node);
  if (node.conditions.length === 0) return true;

  const results = node.conditions.map((child) => evaluateNode(row, child));
  return node.operator === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
};

export const evaluateFilterGroup = <TRecord extends Record<string, unknown>>(
  row: TRecord,
  group: FilterGroupNode
) => evaluateNode(row, group);

export const isAdvancedFilterGroup = (
  value: unknown
): value is FilterGroupNode =>
  Boolean(
    value &&
    typeof value === 'object' &&
    'type' in value &&
    (value as { type?: unknown }).type === 'group'
  );
