import type { ContractFarmingReportRow } from './columns';
export type ContractFarmingPdfWorkerRequest = {
  rows: ContractFarmingReportRow[];
  visibleColumnIds: string[];
  grouping: string[];
  coldStorageName: string;
  generatedAt: string;
};

export type ContractFarmingPdfWorkerResponse =
  | {
      status: 'success';
      blob: Blob;
    }
  | {
      status: 'error';
      message: string;
    };

let workerRuntimePromise: Promise<{
  React: typeof import('react');
  pdf: typeof import('@react-pdf/renderer').pdf;
  Font: typeof import('@react-pdf/renderer').Font;
  ContractFarmingReportDocument: typeof import('./pdf/contract-farming-report-table-pdf').ContractFarmingReportDocument;
  prepareContractFarmingReportPdf: typeof import('./pdf/pdf-prepare').prepareContractFarmingReportPdf;
}> | null = null;

function getWorkerRuntime() {
  if (workerRuntimePromise) return workerRuntimePromise;

  workerRuntimePromise = (async () => {
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

    const [{ Font, pdf }, ReactModule, pdfModule, prepareModule] =
      await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./pdf/contract-farming-report-table-pdf'),
        import('./pdf/pdf-prepare'),
      ]);

    Font.register({
      family: 'Oswald',
      src: '/fonts/Oswald-Regular.ttf',
    });

    return {
      React: ReactModule,
      pdf,
      Font,
      ContractFarmingReportDocument: pdfModule.ContractFarmingReportDocument,
      prepareContractFarmingReportPdf:
        prepareModule.prepareContractFarmingReportPdf,
    };
  })();

  return workerRuntimePromise;
}

self.onmessage = async (
  event: MessageEvent<ContractFarmingPdfWorkerRequest>
) => {
  try {
    const {
      React,
      pdf,
      ContractFarmingReportDocument,
      prepareContractFarmingReportPdf,
    } = await getWorkerRuntime();
    const { rows, visibleColumnIds, grouping, coldStorageName, generatedAt } =
      event.data;

    const report = prepareContractFarmingReportPdf({
      rows,
      visibleColumnIds,
      grouping,
    });

    const document = React.createElement(ContractFarmingReportDocument, {
      generatedAt,
      report,
      grouping,
      coldStorageName,
    });

    const blob = await pdf(document as Parameters<typeof pdf>[0]).toBlob();
    const response: ContractFarmingPdfWorkerResponse = {
      status: 'success',
      blob,
    };
    self.postMessage(response);
  } catch (error) {
    const response: ContractFarmingPdfWorkerResponse = {
      status: 'error',
      message:
        error instanceof Error
          ? `${error.message}${error.stack ? `\n${error.stack}` : ''}`
          : 'Unknown PDF worker error',
    };
    self.postMessage(response);
  }
};

self.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const response: ContractFarmingPdfWorkerResponse = {
    status: 'error',
    message:
      reason instanceof Error
        ? `${reason.message}${reason.stack ? `\n${reason.stack}` : ''}`
        : String(reason ?? 'Unhandled worker rejection'),
  };
  self.postMessage(response);
});

self.addEventListener('error', (event) => {
  const response: ContractFarmingPdfWorkerResponse = {
    status: 'error',
    message: `${event.message} (${event.filename}:${event.lineno}:${event.colno})`,
  };
  self.postMessage(response);
});
