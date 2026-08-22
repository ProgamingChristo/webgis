import type { ApplicationErrorCode } from "@/src/lib/errors";

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  request_id?: string;
};

export type ApiListMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type ApiListResponse<T> = {
  success: true;
  data: T[];
  meta: ApiListMeta;
  request_id?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: ApplicationErrorCode | string;
    message: string;
    retryable?: boolean;
    details?: unknown;
  };
  request_id?: string;
};
