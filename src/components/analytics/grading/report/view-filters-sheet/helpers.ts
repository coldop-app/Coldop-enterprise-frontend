import type {
  GradingFilterGroupNode,
  GradingFilterNode,
} from './advanced-filters';

export const mutateGradingFilterNodeById = (
  group: GradingFilterGroupNode,
  targetId: string,
  updater: (node: GradingFilterNode) => GradingFilterNode
): GradingFilterGroupNode => {
  if (group.id === targetId) {
    const updated = updater(group);
    return updated.type === 'group' ? updated : group;
  }
  return {
    ...group,
    conditions: group.conditions.map((node) => {
      if (node.id === targetId) return updater(node);
      if (node.type === 'group')
        return mutateGradingFilterNodeById(node, targetId, updater);
      return node;
    }),
  };
};

export const removeGradingFilterNodeById = (
  group: GradingFilterGroupNode,
  nodeId: string
): GradingFilterGroupNode => ({
  ...group,
  conditions: group.conditions
    .filter((node) => node.id !== nodeId)
    .map((node) =>
      node.type === 'group' ? removeGradingFilterNodeById(node, nodeId) : node
    ),
});

export const parseGroupingColumnId = (id: string) =>
  id.replace('grouping-item:', '');

export const parseGroupingSlotIndex = (id: string) =>
  Number(id.replace('grouping-slot:', ''));
