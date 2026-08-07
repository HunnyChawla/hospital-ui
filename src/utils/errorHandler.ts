import { toast } from "sonner";

/**
 * Error response structure from API
 */
export interface ErrorDetail {
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

export interface ApiErrorResponse {
  detail: string | ErrorDetail[];
}

/**
 * Options for error handling
 */
export interface HandleErrorOptions {
  /**
   * Custom default error message if error parsing fails
   * @default "An error occurred. Please try again."
   */
  defaultMessage?: string;
  /**
   * Whether to show toast notification
   * @default true
   */
  showToast?: boolean;
  /**
   * Custom toast duration in milliseconds
   */
  toastDuration?: number;
  /**
   * Whether to log error to console
   * @default false
   */
  logError?: boolean;
  /**
   * Custom error handler callback
   */
  onError?: (error: any, message: string) => void;
}

/**
 * Turns a snake_case DB table name into a human-readable label,
 * e.g. "planned_surgeries" -> "Planned Surgeries".
 */
function prettifyTableName(table: string): string {
  return table
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Detects raw Postgres foreign-key-violation error text (leaked verbatim by
 * some backend endpoints on delete) and rewrites it into a user-facing
 * message. Falls back to the original message when it isn't a recognized
 * DB constraint error.
 */
function humanizeDbError(message: string): string {
  if (!message) return message;
  const lower = message.toLowerCase();
  if (!lower.includes("foreign key constraint")) {
    return message;
  }

  const referencingTablePatterns = [
    /referenced from table "([a-zA-Z0-9_]+)"/i,
    /foreign key constraint "[^"]+" on table "([a-zA-Z0-9_]+)"/i,
  ];
  for (const pattern of referencingTablePatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return `This item cannot be deleted because it is still used in ${prettifyTableName(
        match[1]
      )}. Please remove or update those references first.`;
    }
  }

  return "This item cannot be deleted because it is still referenced elsewhere. Please remove those references first.";
}

/**
 * Helper to parse detail field from API responses or error payloads
 */
function parseDetail(detail: any): string | null {
  if (!detail) return null;

  if (typeof detail === "string") {
    return humanizeDbError(detail);
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail.map((err: any) => {
      if (typeof err === "string") return humanizeDbError(err);
      if (err?.msg) return humanizeDbError(err.msg);
      if (err?.message) return humanizeDbError(err.message);
      if (err?.ctx) {
        const { resource_type, field, value } = err.ctx;
        if (resource_type && field) {
          return `${resource_type} with ${field} '${value || ""}' already exists`;
        }
      }
      return "Validation error";
    });
    return messages.join(", ");
  }

  if (typeof detail === "object" && detail !== null) {
    if ("message" in detail && typeof detail.message === "string") {
      return humanizeDbError(detail.message);
    }
    if ("msg" in detail && typeof detail.msg === "string") {
      return humanizeDbError(detail.msg);
    }
    if ("detail" in detail) {
      return parseDetail(detail.detail);
    }
  }

  return null;
}

/**
 * Extracts user-friendly error message from API error response
 * Handles both old format (string) and new format (array with structured errors)
 * Also handles Redux thunk errors (rejected actions & unwrapped payloads)
 */
export function getErrorMessage(error: any): string {
  if (!error) {
    return "An error occurred. Please try again.";
  }

  // Handle direct string errors
  if (typeof error === "string") {
    return error;
  }

  // Handle Redux thunk rejected actions
  let actualError = error;
  
  if (error?.payload) {
    actualError = error.payload;
  } else if (error?.error) {
    actualError = error.error;
  }

  if (typeof actualError === "string") {
    return actualError;
  }

  // 1. Check axios response structure (actualError.response.data.detail)
  if (actualError?.response?.data?.detail) {
    const msg = parseDetail(actualError.response.data.detail);
    if (msg) return msg;
  }
  if (actualError?.response?.statusText) {
    return actualError.response.statusText;
  }

  // 2. Check direct data object (actualError.data.detail)
  if (actualError?.data?.detail) {
    const msg = parseDetail(actualError.data.detail);
    if (msg) return msg;
  }

  // 3. Check direct detail property (Redux rejectWithValue / unwrapped API payload)
  if (actualError?.detail) {
    const msg = parseDetail(actualError.detail);
    if (msg) return msg;
  }

  // 4. Check message property
  if (actualError?.message && typeof actualError.message === "string") {
    return actualError.message;
  }

  // Default fallback
  return "An error occurred. Please try again.";
}

/**
 * Generic error handler that extracts error message and optionally shows toast
 * This is the main utility function that should be used across all modules
 * 
 * @param error - The error object from catch block or React Query mutation
 * @param options - Configuration options for error handling
 * @returns The extracted error message
 * 
 * @example
 * // In try-catch block
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   handleError(error, { defaultMessage: "Failed to save data" });
 * }
 * 
 * @example
 * // In React Query mutation
 * useMutation({
 *   mutationFn: async (data) => await api.create(data),
 *   onError: (error) => handleError(error, { defaultMessage: "Failed to create" }),
 * })
 */
export function handleError(
  error: any,
  options: HandleErrorOptions = {}
): string {
  const {
    defaultMessage = "An error occurred. Please try again.",
    showToast = true,
    toastDuration,
    logError = false,
    onError,
  } = options;

  const errorMessage = getErrorMessage(error) || defaultMessage;

  // Log error if requested
  if (logError) {
    console.error(`[ErrorHandler] ${errorMessage}`, error);
  }

  // Show toast notification
  if (showToast) {
    if (toastDuration) {
      toast.error(errorMessage, { duration: toastDuration });
    } else {
      toast.error(errorMessage);
    }
  }

  // Call custom error handler if provided
  if (onError) {
    onError(error, errorMessage);
  }

  return errorMessage;
}

/**
 * Creates a React Query mutation error handler
 * Use this as the onError callback in useMutation hooks
 * 
 * @param defaultMessage - Default error message if parsing fails
 * @param options - Additional error handling options
 * @returns Error handler function for React Query mutations
 * 
 * @example
 * useMutation({
 *   mutationFn: async (data) => await api.create(data),
 *   onError: createMutationErrorHandler("Failed to create item"),
 * })
 */
export function createMutationErrorHandler(
  defaultMessage: string = "Operation failed",
  options: Omit<HandleErrorOptions, "defaultMessage"> = {}
) {
  return (error: any) => {
    handleError(error, {
      defaultMessage,
      ...options,
    });
  };
}

/**
 * Wraps an async function with automatic error handling
 * Catches errors, shows toast, and optionally re-throws
 * 
 * @param fn - Async function to wrap
 * @param options - Error handling options
 * @param rethrow - Whether to re-throw the error after handling
 * @returns Wrapped function
 * 
 * @example
 * const safeApiCall = withErrorHandling(
 *   async () => await api.dangerousCall(),
 *   { defaultMessage: "Failed to call API" }
 * );
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: HandleErrorOptions = {},
  rethrow: boolean = false
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, options);
      if (rethrow) {
        throw error;
      }
    }
  }) as T;
}

/**
 * Extracts field-specific errors from API error response
 * Returns a map of field names to error messages
 */
export function getFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  // Support both axios error structure and unwrapped rejectWithValue payload
  const detail = error?.response?.data?.detail || error?.detail;

  if (!detail) {
    return fieldErrors;
  }

  // Handle array of error details
  if (Array.isArray(detail)) {
    detail.forEach((err: ErrorDetail) => {
      // Extract field name from location array
      // loc format: ["body", "field_name"] or ["query", "param_name"] or nested e.g. ["body", "refraction", "os", "add_power"]
      const location = err.loc || [];
      // Clean prefixes to support nested UI state names (e.g. refraction_os_add_power -> os_add_power)
      const cleanPath = location.filter(
        (x) =>
          x !== "body" &&
          x !== "refraction" &&
          x !== "current_specs" &&
          x !== "ar_data" &&
          x !== "vision" &&
          x !== "existing_ids" &&
          typeof x === "string"
      );
      const fieldName = cleanPath.join("_") || (location[location.length - 1] as string);
      
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

