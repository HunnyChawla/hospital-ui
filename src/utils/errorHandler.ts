/**
 * Error response structure from API
 */
interface ErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
  ctx?: {
    resource_type?: string;
    field?: string;
    value?: string;
    [key: string]: any;
  };
}

interface ApiErrorResponse {
  detail: string | ErrorDetail[];
}

/**
 * Extracts user-friendly error message from API error response
 * Handles both old format (string) and new format (array with structured errors)
 * Also handles Redux thunk errors (rejected actions)
 */
export function getErrorMessage(error: any): string {
  // Handle Redux thunk rejected actions
  // When using rejectWithValue, the error is in error.payload
  // When using .unwrap(), the error structure is: { payload: ..., error: ... }
  let actualError = error;
  
  if (error?.payload) {
    // Redux thunk with rejectWithValue - payload contains the original error
    actualError = error.payload;
  } else if (error?.error) {
    // Redux thunk without rejectWithValue
    actualError = error.error;
  }
  
  // Check if we have a response (API error)
  if (actualError?.response) {
    const response = actualError.response;
    const data = response.data as ApiErrorResponse | undefined;

    if (!data?.detail) {
      // Fallback to status text or generic message
      return response.statusText || `Request failed with status ${response.status}`;
    }

    const detail = data.detail;

    // Handle string error messages (old format)
    if (typeof detail === "string") {
      return detail;
    }

    // Handle array of error details (new format)
    if (Array.isArray(detail) && detail.length > 0) {
      // Extract messages from all errors
      const messages = detail.map((err: ErrorDetail) => {
        // Use the msg field which contains the user-friendly message
        if (err.msg) {
          return err.msg;
        }
        // Fallback: construct message from context if available
        if (err.ctx) {
          const { resource_type, field, value } = err.ctx;
          if (resource_type && field) {
            return `${resource_type} with ${field} '${value || ""}' already exists`;
          }
        }
        // Last fallback
        return "Validation error";
      });

      // Join multiple errors with newlines or commas
      return messages.join(", ");
    }

    // Handle object with message property
    if (typeof detail === "object" && "message" in detail) {
      return (detail as any).message;
    }
  }
  
  // Handle network errors or errors without response
  if (actualError?.message) {
    return actualError.message;
  }
  
  // Default fallback
  return "An error occurred. Please try again.";
}

/**
 * Extracts field-specific errors from API error response
 * Returns a map of field names to error messages
 */
export function getFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!error?.response?.data?.detail) {
    return fieldErrors;
  }

  const detail = error.response.data.detail;

  // Handle array of error details
  if (Array.isArray(detail)) {
    detail.forEach((err: ErrorDetail) => {
      // Extract field name from location array
      // loc format: ["body", "field_name"] or ["query", "param_name"]
      const location = err.loc || [];
      const fieldName = location[location.length - 1]; // Get last element (field name)
      
      if (fieldName && typeof fieldName === "string") {
        // Use the msg field for the error message
        fieldErrors[fieldName] = err.msg || "Invalid value";
      }
    });
  }

  return fieldErrors;
}

/**
 * Checks if error is a specific type (e.g., "duplicate_error", "validation_error")
 */
export function isErrorType(error: any, errorType: string): boolean {
  if (!error?.response?.data?.detail) {
    return false;
  }

  const detail = error.response.data.detail;

  if (Array.isArray(detail)) {
    return detail.some((err: ErrorDetail) => err.type === errorType);
  }

  return false;
}

/**
 * Gets the first error of a specific type
 */
export function getErrorByType(error: any, errorType: string): ErrorDetail | null {
  if (!error?.response?.data?.detail) {
    return null;
  }

  const detail = error.response.data.detail;

  if (Array.isArray(detail)) {
    return detail.find((err: ErrorDetail) => err.type === errorType) || null;
  }

  return null;
}

