import type { MutableRefObject } from 'react';

export type ExcelPreviewRow = {
  values: Array<string | number>;
  boldByColumn: boolean[];
  isGroupedOrAggregatedRow: boolean;
};

export type ExcelPreviewSection = {
  title: string;
  headers: string[];
  rows: ExcelPreviewRow[];
  footerRows: Array<Array<string | number>>;
};

export type ExcelPreview = {
  title: string;
  subtitle: string;
  dateLabel: string;
  exportedRowCount: number;
  metaLines?: string[];
  headers?: string[];
  rows?: ExcelPreviewRow[];
  totals?: Array<string | number>;
  footerRows?: Array<Array<string | number>>;
  sections?: ExcelPreviewSection[];
};

export type ExcelPreviewUrls = { html: string; xlsx: string };

export type ExcelPreviewExportResult = {
  buffer: BlobPart;
  fileName: string;
  preview: ExcelPreview;
};

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const GENERATING_HTML = `<!doctype html><html><head><meta charset="utf-8" /><title>Generating Excel...</title></head><body style="font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#f8fafc;color:#1f2937">Generating Excel preview...</body></html>`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPreviewCell(value: string | number): string {
  if (value === '' || value == null) return '';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return String(value);
}

function formatPreviewCellHtml(value: string | number): string {
  return escapeHtml(formatPreviewCell(value)).replace(/\n/g, '<br />');
}

function renderHeaderCells(headers: string[]): string {
  return headers
    .map(
      (header) =>
        `<th style="border:1px solid #B8DEC9;padding:8px 12px;text-align:left;font-weight:600;white-space:nowrap">${escapeHtml(header)}</th>`
    )
    .join('');
}

function renderBodyRows(rows: ExcelPreviewRow[]): string {
  return rows
    .map((row, rowIndex) => {
      const rowBg = row.isGroupedOrAggregatedRow
        ? '#EFF8F3'
        : rowIndex % 2 === 0
          ? '#FFFFFF'
          : 'rgba(239,248,243,0.5)';
      const cells = row.values
        .map((cell, colIndex) => {
          const align = typeof cell === 'number' ? 'right' : 'left';
          const weight = row.boldByColumn[colIndex] ? '600' : '400';
          return `<td style="border:1px solid #B8DEC9;padding:6px 12px;text-align:${align};font-weight:${weight};color:#1F2937;background:${rowBg};white-space:pre-wrap">${formatPreviewCellHtml(cell)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
}

function renderFooterRows(footerRows: Array<Array<string | number>>): string {
  return footerRows
    .map((footer) => {
      const cells = footer
        .map((cell) => {
          const align = typeof cell === 'number' ? 'right' : 'left';
          return `<td style="border:1px solid #B8DEC9;padding:8px 12px;text-align:${align};font-weight:600;color:#1A4731;background:#DCEFE4">${escapeHtml(formatPreviewCell(cell))}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
}

function renderTableSection(
  headers: string[],
  rows: ExcelPreviewRow[],
  footerRows: Array<Array<string | number>>
): string {
  return `<table>
      <thead><tr>${renderHeaderCells(headers)}</tr></thead>
      <tbody>${renderBodyRows(rows)}</tbody>
      <tfoot>${renderFooterRows(footerRows)}</tfoot>
    </table>`;
}

export function buildExcelPreviewHtml(
  preview: ExcelPreview,
  fileName: string,
  xlsxDownloadUrl: string
): string {
  const metaBlock = (preview.metaLines ?? [])
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');

  let tablesHtml = '';
  if (preview.sections && preview.sections.length > 0) {
    tablesHtml = preview.sections
      .map(
        (section) => `
      <div class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        <div class="table-wrap section-table">
          ${renderTableSection(section.headers, section.rows, section.footerRows)}
        </div>
      </div>`
      )
      .join('');
  } else if (preview.headers && preview.rows) {
    const footers =
      preview.footerRows ?? (preview.totals ? [preview.totals] : []);
    tablesHtml = `<div class="table-wrap">${renderTableSection(preview.headers, preview.rows, footers)}</div>`;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(preview.subtitle)} — ${escapeHtml(preview.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #1f2937;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 20px;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .toolbar-meta { flex: 1; min-width: 200px; }
    .toolbar h1 { margin: 0; font-size: 1.125rem; font-weight: 700; color: #333; }
    .toolbar p { margin: 4px 0 0; font-size: 0.75rem; color: #6b7280; }
    .toolbar .hint { font-style: italic; }
    .download-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #fff;
      background: oklch(0.63 0.17 149.2);
      border: none;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
    }
    .download-btn:hover { opacity: 0.9; }
    .content { padding: 0 0 16px; }
    .table-wrap {
      margin: 16px;
      overflow: auto;
      max-height: calc(100vh - 120px);
      border: 1px solid #B8DEC9;
      border-radius: 8px;
      background: #fff;
    }
    .section { margin-bottom: 8px; }
    .section-title {
      margin: 16px 16px 8px;
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
    }
    .section-table { max-height: none; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    thead th {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #2D7A50;
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-meta">
      <h1>${escapeHtml(preview.title)}</h1>
      <p><strong>${escapeHtml(preview.subtitle)}</strong> · Generated on: ${escapeHtml(preview.dateLabel)} · Exported rows: ${preview.exportedRowCount}</p>
      ${metaBlock}
      <p class="hint">Download to open in Excel with full formatting.</p>
      <p>${escapeHtml(fileName)}</p>
    </div>
    <a class="download-btn" href="${xlsxDownloadUrl}" download="${escapeHtml(fileName)}">Download Excel</a>
  </div>
  <div class="content">${tablesHtml}</div>
</body>
</html>`;
}

export function revokeExcelPreviewUrls(urls: ExcelPreviewUrls | null): void {
  if (!urls) return;
  URL.revokeObjectURL(urls.html);
  URL.revokeObjectURL(urls.xlsx);
}

export async function openExcelPreviewInNewTab(
  previewUrlsRef: MutableRefObject<ExcelPreviewUrls | null>,
  generate: () => Promise<ExcelPreviewExportResult>
): Promise<void> {
  const previewTab = window.open('', '_blank');
  if (!previewTab) {
    window.alert(
      'Popup blocked by your browser. Please allow popups and try again.'
    );
    return;
  }

  previewTab.opener = null;
  previewTab.document.write(GENERATING_HTML);
  previewTab.document.close();

  try {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const { buffer, fileName, preview } = await generate();

    const xlsxBlob = new Blob([buffer], { type: XLSX_MIME });
    const xlsxUrl = URL.createObjectURL(xlsxBlob);
    const html = buildExcelPreviewHtml(preview, fileName, xlsxUrl);
    const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const htmlUrl = URL.createObjectURL(htmlBlob);

    revokeExcelPreviewUrls(previewUrlsRef.current);
    previewUrlsRef.current = { html: htmlUrl, xlsx: xlsxUrl };

    if (!previewTab.closed) {
      previewTab.location.replace(htmlUrl);
    } else {
      window.open(htmlUrl, '_blank');
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    window.alert(`Failed to generate Excel: ${message}`);
    if (!previewTab.closed) {
      previewTab.close();
    }
    throw error;
  }
}
