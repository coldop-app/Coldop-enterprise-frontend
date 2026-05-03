import type { Table } from '@tanstack/react-table';
import type {
  GradingFilterGroupNode,
  GradingFilterNode,
} from './advanced-filters';

/**
 * Collect distinct cell values for many columns in a single pass over core rows.
 * Avoids per-column `getFacetedUniqueValues()` / full-table rescans when opening the filters sheet.
 */
export function buildGradingSheetUniqueValuesByColumn<TRow>(
  table: Table<TRow>,
  columnIds: readonly string[]
): Map<string, string[]> {
  const sets = new Map<string, Set<string>>();
  for (const id of columnIds) {
    sets.set(id, new Set());
  }

  const rows = table.getCoreRowModel().rows;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    for (let j = 0; j < columnIds.length; j++) {
      const id = columnIds[j]!;
      const rawValue = row.getValue(id);
      if (rawValue === undefined || rawValue === null) continue;
      const normalized = String(rawValue).trim();
      if (normalized.length === 0) continue;
      sets.get(id)!.add(normalized);
    }
  }

  const out = new Map<string, string[]>();
  for (const id of columnIds) {
    const arr = Array.from(sets.get(id) ?? []);
    arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    out.set(id, arr);
  }
  return out;
}

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
