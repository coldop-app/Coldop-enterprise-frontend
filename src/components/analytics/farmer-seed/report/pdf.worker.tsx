import type { FarmerSeedReportRow } from './columns';

export type FarmerSeedPdfWorkerRequest = {
  rows: FarmerSeedReportRow[];
  visibleColumnIds: string[];
  grouping?: string[];
  coldStorageName: string;
  generatedAt: string;
};

export type FarmerSeedPdfWorkerResponse =
  | { status: 'success'; blob: Blob }
  | { status: 'error'; message: string };

type WorkerRuntime = {
  React: typeof import('react');
  pdf: typeof import('@react-pdf/renderer').pdf;
  FarmerSeedReportDocument: typeof import('./pdf/farmer-seed-report-table-pdf').FarmerSeedReportDocument;
  prepareFarmerSeedReportPdf: typeof import('./pdf/pdf-prepare').prepareFarmerSeedReportPdf;
};

let runtimePromise: Promise<WorkerRuntime> | null = null;

function getWorkerRuntime(): Promise<WorkerRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const runtimeGlobal = globalThis as {
        window?: unknown;
        self?: unknown;
      };
      if (!runtimeGlobal.window) {
        runtimeGlobal.window = globalThis;
      }
      if (!runtimeGlobal.self) {
        runtimeGlobal.self = globalThis;
      }

      const [React, reactPdf, pdfDocument, pdfPrepare] = await Promise.all([
        import('react'),
        import('@react-pdf/renderer'),
        import('./pdf/farmer-seed-report-table-pdf'),
        import('./pdf/pdf-prepare'),
      ]);

      return {
        React,
        pdf: reactPdf.pdf,
        FarmerSeedReportDocument: pdfDocument.FarmerSeedReportDocument,
        prepareFarmerSeedReportPdf: pdfPrepare.prepareFarmerSeedReportPdf,
      };
    })();
  }
  return runtimePromise;
}

self.onmessage = async (event: MessageEvent<FarmerSeedPdfWorkerRequest>) => {
  try {
    const { React, pdf, FarmerSeedReportDocument, prepareFarmerSeedReportPdf } =
      await getWorkerRuntime();

    const { rows, visibleColumnIds, grouping, coldStorageName, generatedAt } =
      event.data;

    const report = prepareFarmerSeedReportPdf({
      rows,
      visibleColumnIds,
      grouping,
    });

    const document = React.createElement(FarmerSeedReportDocument, {
      generatedAt,
      report,
      grouping,
      coldStorageName,
    });

    const blob = await pdf(document as Parameters<typeof pdf>[0]).toBlob();
    const response: FarmerSeedPdfWorkerResponse = { status: 'success', blob };
    self.postMessage(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? `${error.message}${error.stack ? `\n${error.stack}` : ''}`
        : 'Unknown worker error';
    const response: FarmerSeedPdfWorkerResponse = { status: 'error', message };
    self.postMessage(response);
  }
};
