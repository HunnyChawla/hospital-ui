import { useEffect, useRef, useState, useCallback } from "react";
import { getEnv } from "../utils/env";

export type SSEConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting" | "error";

export interface UseSSEOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useSSE(
  url: string | null,
  options: UseSSEOptions = {}
): {
  data: any;
  status: SSEConnectionStatus;
  error: Event | Error | null;
  reconnect: () => void;
} {
  const {
    onMessage,
    onError,
    onOpen,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<SSEConnectionStatus>("disconnected");
  const [error, setError] = useState<Event | Error | null>(null);

  // Keep latest callback references in refs to avoid reconnection churn on parent re-renders
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualCloseRef = useRef(false);

  const connect = useCallback(function connectToSSE() {
    if (!url) {
      setStatus("disconnected");
      return;
    }

    // Close existing connection if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      setStatus("connecting");
      setError(null);

      // Get base URL at runtime to ensure window.__ENV is available
      const baseURL = getEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000");
      const fullUrl = url.startsWith("http") ? url : `${baseURL}${url}`;

      // Get auth token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

      // Create AbortController for this connection
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Use fetch with ReadableStream to support custom headers
      fetch(fullUrl, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        signal: abortController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            const httpError = new Error(`HTTP error! status: ${response.status}`);
            (httpError as any).status = response.status;
            (httpError as any).isClientError = response.status >= 400 && response.status < 500;
            throw httpError;
          }

          if (!response.body) {
            throw new Error("ReadableStream not supported");
          }

          setStatus("connected");
          reconnectAttemptsRef.current = 0;
          onOpenRef.current?.();

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let currentData: string[] = [];

          const readStream = (): Promise<void> => {
            return reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  // Stream ended normally from server side
                  if (!isManualCloseRef.current && autoReconnect) {
                    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                      reconnectAttemptsRef.current += 1;
                      setStatus("reconnecting");

                      // Exponential backoff capped at 15s
                      const delay = Math.min(
                        reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
                        15000
                      );
                      reconnectTimeoutRef.current = setTimeout(() => {
                        connectToSSE();
                      }, delay);
                    } else {
                      setStatus("error");
                    }
                  } else {
                    setStatus("disconnected");
                  }
                  return;
                }

                // Decode chunk and add to buffer
                buffer += decoder.decode(value, { stream: true });

                // Process SSE messages (events are separated by double newlines)
                const parts = buffer.split("\n\n");
                // Keep the last incomplete part in buffer
                buffer = parts.pop() || "";

                for (const part of parts) {
                  // Reset current data for each event
                  currentData = [];

                  // Process each line of the event
                  const lines = part.split("\n");
                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      // Collect data lines (can be multiple)
                      currentData.push(line.slice(6)); // Remove "data: " prefix
                    }
                  }

                  // If we have data, process it
                  if (currentData.length > 0) {
                    const dataStr = currentData.join("\n");
                    try {
                      const parsedData = JSON.parse(dataStr);
                      setData(parsedData);
                      onMessageRef.current?.(parsedData);
                    } catch {
                      setData(dataStr);
                      onMessageRef.current?.(dataStr);
                    }
                  }
                }

                // Continue reading
                return readStream();
              })
              .catch((err) => {
                if (err.name === "AbortError") {
                  // Connection was intentionally closed
                  setStatus("disconnected");
                  return;
                }

                setError(err);
                onErrorRef.current?.(err);

                // Do NOT reconnect on 4xx client errors (400, 401, 403, 404, etc.)
                if (err?.isClientError) {
                  setStatus("error");
                  return;
                }

                // Attempt to reconnect on transient stream/network error
                if (!isManualCloseRef.current && autoReconnect) {
                  if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1;
                    setStatus("reconnecting");

                    const delay = Math.min(
                      reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
                      15000
                    );
                    reconnectTimeoutRef.current = setTimeout(() => {
                      connectToSSE();
                    }, delay);
                  } else {
                    setStatus("error");
                  }
                } else {
                  setStatus("disconnected");
                }
              });
          };

          return readStream();
        })
        .catch((err) => {
          if (err.name === "AbortError") {
            setStatus("disconnected");
            return;
          }

          setError(err);
          setStatus("error");
          onErrorRef.current?.(err);

          // Do NOT reconnect on 4xx client errors (400, 401, 403, 404, etc.)
          if (err?.isClientError) {
            return;
          }

          // Attempt to reconnect on transient network error with backoff
          if (!isManualCloseRef.current && autoReconnect) {
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current += 1;
              setStatus("reconnecting");

              const delay = Math.min(
                reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
                15000
              );
              reconnectTimeoutRef.current = setTimeout(() => {
                connectToSSE();
              }, delay);
            } else {
              setStatus("error");
            }
          }
        });
    } catch (err) {
      const standardErr = err instanceof Error ? err : new Error(String(err));
      setError(standardErr);
      setStatus("error");
      onErrorRef.current?.(standardErr as unknown as Event);
    }
  }, [url, autoReconnect, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const reconnect = useCallback(() => {
    isManualCloseRef.current = false;
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    if (url) {
      isManualCloseRef.current = false;
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    data,
    status,
    error,
    reconnect,
  };
}

