import * as React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  FilterConditionNode,
  FilterField,
  FilterGroupNode,
  FilterOperator,
} from '@/lib/advanced-filters';
import { numericFilterFields } from '@/lib/advanced-filters';
import {
  advancedFilterFields,
  filterOperatorLabels,
  numberOperators,
  stringOperators,
} from './constants';

type LogicBuilderProps = {
  group: FilterGroupNode;
  advancedFieldValueOptions: Partial<Record<FilterField, string[]>>;
  onSetGroupOperator: (groupId: string, operator: 'AND' | 'OR') => void;
  onAddConditionToGroup: (groupId: string) => void;
  onAddNestedGroup: (groupId: string) => void;
  onSetConditionField: (conditionId: string, field: FilterField) => void;
  onSetConditionOperator: (
    conditionId: string,
    operator: FilterOperator
  ) => void;
  onSetConditionValue: (conditionId: string, value: string) => void;
  onRemoveNode: (nodeId: string) => void;
};

export const LogicBuilder = React.memo(function LogicBuilder({
  group,
  advancedFieldValueOptions,
  onSetGroupOperator,
  onAddConditionToGroup,
  onAddNestedGroup,
  onSetConditionField,
  onSetConditionOperator,
  onSetConditionValue,
  onRemoveNode,
}: LogicBuilderProps) {
  function renderGroup(nodeGroup: FilterGroupNode, depth = 0): React.ReactNode {
    return (
      <div
        key={nodeGroup.id}
        className={`space-y-2 rounded-lg border p-3 ${depth > 0 ? 'bg-muted/30 border-border' : 'bg-background border-primary/20'}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Match</span>
          <div className="flex overflow-hidden rounded-md border">
            {(['AND', 'OR'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onSetGroupOperator(nodeGroup.id, op)}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  nodeGroup.operator === op
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                {op === 'AND' ? 'All' : 'Any'}
              </button>
            ))}
          </div>
          <span className="text-muted-foreground text-xs">
            of these conditions
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onAddConditionToGroup(nodeGroup.id)}
            >
              <Plus className="h-3 w-3" /> Condition
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onAddNestedGroup(nodeGroup.id)}
            >
              <Plus className="h-3 w-3" /> Group
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          {nodeGroup.conditions.length === 0 ? (
            <div className="border-border text-muted-foreground/70 rounded border border-dashed py-3 text-center text-xs">
              No conditions yet — add one above
            </div>
          ) : (
            nodeGroup.conditions.map((node) => {
              if (node.type === 'group') {
                return (
                  <div key={node.id}>
                    {renderGroup(node, depth + 1)}
                    <div className="mt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onRemoveNode(node.id)}
                        className="text-destructive/80 hover:text-destructive flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="h-3 w-3" /> Remove group
                      </button>
                    </div>
                  </div>
                );
              }

              const isNumeric = numericFilterFields.includes(node.field);
              const operators = isNumeric ? numberOperators : stringOperators;
              const valueOptions = advancedFieldValueOptions[node.field] ?? [];

              return (
                <div
                  key={node.id}
                  className="bg-muted/20 grid grid-cols-12 items-center gap-1.5 rounded-md border p-1.5"
                >
                  <div className="col-span-4">
                    <Select
                      value={node.field}
                      onValueChange={(value) =>
                        onSetConditionField(node.id, value as FilterField)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {advancedFilterFields.map((field) => (
                          <SelectItem
                            key={field.id}
                            value={field.id}
                            className="text-xs"
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={node.operator}
                      onValueChange={(value) =>
                        onSetConditionOperator(
                          node.id,
                          value as FilterConditionNode['operator']
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op} value={op} className="text-xs">
                            {filterOperatorLabels[op]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={node.value}
                      onChange={(event) =>
                        onSetConditionValue(node.id, event.target.value)
                      }
                      list={`logic-value-options-${node.id}`}
                      placeholder={
                        valueOptions.length > 0
                          ? 'Select or type value...'
                          : 'Type value...'
                      }
                      className="h-8 text-xs"
                    />
                    <datalist id={`logic-value-options-${node.id}`}>
                      {valueOptions.map((opt) => (
                        <option key={`${node.id}-${opt}`} value={opt} />
                      ))}
                    </datalist>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveNode(node.id)}
                    className="text-muted-foreground hover:text-destructive col-span-1 flex items-center justify-center transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return renderGroup(group);
});
