export interface AnalyticsOverviewData {
  [key: string]: unknown;
}

export interface GetAnalyticsOverviewApiResponse {
  success: boolean;
  data: AnalyticsOverviewData | null;
  message?: string;
}
