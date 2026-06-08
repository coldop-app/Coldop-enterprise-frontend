import type ExcelJS from 'exceljs';

export const EXCEL_DATA_ROW_HEIGHT = 40;

/** MS Excel recalculates row heights on open unless sheetViews is present. */
export function configureWorksheetForMicrosoftExcel(
  worksheet: ExcelJS.Worksheet
): void {
  worksheet.views = [{}];
}

export function applyExcelRowHeight(row: ExcelJS.Row, height: number): void {
  row.height = height;
  row.hidden = false;
}

/** Re-apply heights after cell styling so MS Excel keeps custom heights on open. */
export function enforceExcelTableRowHeights(
  worksheet: ExcelJS.Worksheet,
  fromRowNumber: number,
  height = EXCEL_DATA_ROW_HEIGHT
): void {
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber >= fromRowNumber) {
      applyExcelRowHeight(row, height);
    }
  });
}
