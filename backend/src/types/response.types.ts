export interface ErrorDetail {
  field: string;
  code: string;
  message: string;
  location: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  error_code: string | null;
  detail: ErrorDetail[];
  payload: T | null;
}
