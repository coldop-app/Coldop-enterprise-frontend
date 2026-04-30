import type {
  IncomingPdfWorkerRequest,
  IncomingPdfWorkerResponse,
} from './pdf-worker.types';

let workerRuntimePromise: Promise<{
  React: typeof import('react');
  pdf: typeof import('@react-pdf/renderer').pdf;
  Font: typeof import('@react-pdf/renderer').Font;
  InwardLedgerReportDocument: unknown;
  prepareIncomingReportPdf: unknown;
}> | null = null;

function getWorkerRuntime() {
  if (workerRuntimePromise) return workerRuntimePromise;

  workerRuntimePromise = (async () => {
    const runtimeGlobal = globalThis as {
      window?: unknown;
      self?: unknown;
    };
    if (!runtimeGlobal.window) runtimeGlobal.window = runtimeGlobal;
    if (!runtimeGlobal.self) runtimeGlobal.self = runtimeGlobal;

    const [{ Font, pdf }, ReactModule, pdfModule, prepareModule] =
      await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./pdf/incoming-report-table-pdf'),
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
      InwardLedgerReportDocument: pdfModule.InwardLedgerReportDocument,
      prepareIncomingReportPdf: prepareModule.prepareIncomingReportPdf,
    };
  })();

  return workerRuntimePromise;
}

self.onmessage = async (event: MessageEvent<IncomingPdfWorkerRequest>) => {
  try {
    const runtime = await getWorkerRuntime();
    const { React, pdf, InwardLedgerReportDocument, prepareIncomingReportPdf } =
      runtime;
    const { rows, visibleColumnIds, grouping, coldStorageName, generatedAt } =
      event.data;

    const report = (prepareIncomingReportPdf as (options: unknown) => unknown)({
      rows: rows as unknown as import('./columns').IncomingReportRow[],
      visibleColumnIds,
      grouping,
    });

    const document = React.createElement(InwardLedgerReportDocument as never, {
      generatedAt,
      report,
      grouping,
      coldStorageName,
    });

    const blob = await pdf(document as never).toBlob();
    const response: IncomingPdfWorkerResponse = {
      status: 'success',
      blob,
    };
    self.postMessage(response);
  } catch (error) {
    const response: IncomingPdfWorkerResponse = {
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
  const response: IncomingPdfWorkerResponse = {
    status: 'error',
    message:
      reason instanceof Error
        ? `${reason.message}${reason.stack ? `\n${reason.stack}` : ''}`
        : String(reason ?? 'Unhandled worker rejection'),
  };
  self.postMessage(response);
});

self.addEventListener('error', (event) => {
  const response: IncomingPdfWorkerResponse = {
    status: 'error',
    message: `${event.message} (${event.filename}:${event.lineno}:${event.colno})`,
  };
  self.postMessage(response);
});
