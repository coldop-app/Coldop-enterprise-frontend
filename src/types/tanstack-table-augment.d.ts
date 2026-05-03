import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  interface ColumnMeta<_TData, _TValue> {
    /** Grading report: first column emits one tbody row per incoming pass; merge columns rowspan the block */
    gradingReportRowSpan?: 'split' | 'merge';
    /** Left border emphasizes where incoming-linked columns end and grading gate pass columns begin */
    gradingReportGradingSectionStart?: boolean;
  }
}
