import type { IncomingReportRow } from './columns';

export type IncomingPdfWorkerRequest = {
  rows: IncomingReportRow[];
  visibleColumnIds: string[];
  grouping: string[];
  coldStorageName: string;
  generatedAt: string;
};

export type IncomingPdfWorkerResponse =
  | {
      status: 'success';
      blob: Blob;
    }
  | {
      status: 'error';
      message: string;
    };
