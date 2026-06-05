import type { SortingState } from '@tanstack/react-table';
import {
  compareNikasiColumnValues,
  isNikasiVarietySplitColumn,
} from './columns';
import type { NikasiReportDisplayRow } from './nikasi-report-flatten';

function getBlockSortValue(
  block: NikasiReportDisplayRow[],
  columnId: string,
  bagSizeColumnIds: ReadonlySet<string>
): unknown {
  const head = block.find((row) => row.varietyRowIndex === 0) ?? block[0];

  if (isNikasiVarietySplitColumn(columnId, bagSizeColumnIds)) {
    if (columnId === 'variety') {
      return [...block]
        .map((row) => row.variety ?? '')
        .sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        )[0];
    }

    return Math.max(
      0,
      ...block.map((row) => row.bagSizeFields[columnId]?.quantity ?? 0)
    );
  }

  if (columnId in head) {
    return head[columnId as keyof NikasiReportDisplayRow];
  }

  return head.bagSizeFields[columnId]?.quantity ?? 0;
}

function compareGatePassBlocks(
  blockA: NikasiReportDisplayRow[],
  blockB: NikasiReportDisplayRow[],
  sorting: SortingState,
  bagSizeColumnIds: ReadonlySet<string>
): number {
  for (const { id: columnId, desc } of sorting) {
    const comparison = compareNikasiColumnValues(
      columnId,
      getBlockSortValue(blockA, columnId, bagSizeColumnIds),
      getBlockSortValue(blockB, columnId, bagSizeColumnIds),
      bagSizeColumnIds
    );

    if (comparison !== 0) {
      return desc ? -comparison : comparison;
    }
  }

  const headA = blockA[0];
  const headB = blockB[0];
  return headA.gatePassId.localeCompare(headB.gatePassId);
}

/** Keeps variety sub-rows attached to their gate pass when sorting. */
export function sortNikasiDisplayRowsByGatePassBlocks(
  rows: NikasiReportDisplayRow[],
  sorting: SortingState,
  bagSizeColumnIds: ReadonlySet<string>
): NikasiReportDisplayRow[] {
  if (sorting.length === 0 || rows.length === 0) {
    return rows;
  }

  const blocksByGatePassId = new Map<string, NikasiReportDisplayRow[]>();
  const gatePassOrder: string[] = [];

  for (const row of rows) {
    if (!blocksByGatePassId.has(row.gatePassId)) {
      gatePassOrder.push(row.gatePassId);
      blocksByGatePassId.set(row.gatePassId, []);
    }
    blocksByGatePassId.get(row.gatePassId)!.push(row);
  }

  for (const block of blocksByGatePassId.values()) {
    block.sort((a, b) => a.varietyRowIndex - b.varietyRowIndex);
  }

  const sortedGatePassIds = [...gatePassOrder].sort((gatePassA, gatePassB) =>
    compareGatePassBlocks(
      blocksByGatePassId.get(gatePassA)!,
      blocksByGatePassId.get(gatePassB)!,
      sorting,
      bagSizeColumnIds
    )
  );

  return sortedGatePassIds.flatMap(
    (gatePassId) => blocksByGatePassId.get(gatePassId)!
  );
}
