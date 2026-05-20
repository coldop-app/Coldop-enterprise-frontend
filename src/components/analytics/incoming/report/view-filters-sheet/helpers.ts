import type { FilterGroupNode, FilterNode } from '@/lib/advanced-filters';

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

export const parseGroupingColumnId = (id: string) =>
  id.replace('grouping-item:', '');

export const parseGroupingSlotIndex = (id: string) =>
  Number(id.replace('grouping-slot:', ''));
