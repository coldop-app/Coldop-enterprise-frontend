import {
  GRADING_BAG_SIZE_COLUMN_ORDER,
  getGradingBagSizeColumnId,
  type GradingFilterField,
} from '../column-meta';

export type { GradingFilterField };

export type GradingFilterOperator =
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<=';

export type GradingFilterConditionNode = {
  id: string;
  type: 'condition';
  field: GradingFilterField;
  operator: GradingFilterOperator;
  value: string;
};

export type GradingFilterGroupNode = {
  id: string;
  type: 'group';
  operator: 'AND' | 'OR';
  conditions: GradingFilterNode[];
};

export type GradingFilterNode =
  | GradingFilterConditionNode
  | GradingFilterGroupNode;

export const numericGradingFilterFields: GradingFilterField[] = [
  'gatePassNo',
  'incomingSystemGatePassNo',
  'incomingBagsReceived',
  'gradedBags',
  ...GRADING_BAG_SIZE_COLUMN_ORDER.map((s) => getGradingBagSizeColumnId(s)),
];

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createDefaultGradingCondition = (
  field: GradingFilterField = 'manualGatePassNumber'
): GradingFilterConditionNode => ({
  id: generateId(),
  type: 'condition',
  field,
  operator: getDefaultOperatorForGradingField(field),
  value: '',
});

export const createDefaultGradingFilterGroup = (): GradingFilterGroupNode => ({
  id: generateId(),
  type: 'group',
  operator: 'AND',
  conditions: [createDefaultGradingCondition()],
});

export const getDefaultOperatorForGradingField = (
  field: GradingFilterField
): GradingFilterOperator =>
  numericGradingFilterFields.includes(field) ? '=' : 'contains';

const hasConditionValue = (node: GradingFilterConditionNode) =>
  node.value.trim().length > 0;

export const hasAnyUsableGradingFilter = (
  group: GradingFilterGroupNode
): boolean =>
  group.conditions.some((node) => {
    if (node.type === 'condition') return hasConditionValue(node);
    return hasAnyUsableGradingFilter(node);
  });

const compareStrings = (
  inputValue: string,
  operator: GradingFilterOperator,
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
  operator: GradingFilterOperator,
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

const evaluateCondition = (
  row: Record<string, unknown>,
  node: GradingFilterConditionNode
) => {
  if (!hasConditionValue(node)) return true;
  const rawValue = row[node.field];
  const conditionValue = node.value.trim();

  if (numericGradingFilterFields.includes(node.field)) {
    const inputNumber = Number(rawValue);
    const targetNumber = Number(conditionValue);
    if (Number.isNaN(inputNumber) || Number.isNaN(targetNumber)) return false;
    return compareNumbers(inputNumber, node.operator, targetNumber);
  }

  return compareStrings(String(rawValue ?? ''), node.operator, conditionValue);
};

const evaluateNode = (
  row: Record<string, unknown>,
  node: GradingFilterNode
): boolean => {
  if (node.type === 'condition') return evaluateCondition(row, node);
  if (node.conditions.length === 0) return true;

  const results = node.conditions.map((child) => evaluateNode(row, child));
  return node.operator === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
};

export const evaluateGradingFilterGroup = (
  row: Record<string, unknown>,
  group: GradingFilterGroupNode
) => evaluateNode(row, group);

export const isGradingAdvancedFilterGroup = (
  value: unknown
): value is GradingFilterGroupNode =>
  Boolean(
    value &&
    typeof value === 'object' &&
    'type' in value &&
    (value as { type?: unknown }).type === 'group'
  );
