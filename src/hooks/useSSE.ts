import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "../utils/env";

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
  error: Event | null;
  reconnect: () => void;
} {
  const {
    onMessage,
    onError,
    onOpen,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<SSEConnectionStatus>("disconnected");
  const [error, setError] = useState<Event | null>(null);

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

      // Get base URL from environment or use the provided URL
      const baseURL = API_BASE_URL;
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
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          if (!response.body) {
            throw new Error("ReadableStream not supported");
          }

          setStatus("connected");
          reconnectAttemptsRef.current = 0;
          onOpen?.();

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let currentData: string[] = [];

          const readStream = (): Promise<void> => {
            return reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  // Stream ended
                  if (!isManualCloseRef.current && autoReconnect) {
                    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                      reconnectAttemptsRef.current += 1;
                      setStatus("reconnecting");

                      // Exponential backoff
                      const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
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
                    // Ignore other SSE fields like "event:", "id:", etc.
                  }

                  // If we have data, process it
                  if (currentData.length > 0) {
                    // Join multiple data lines (if any)
                    const dataStr = currentData.join("\n");
                    try {
                      const parsedData = JSON.parse(dataStr);
                      setData(parsedData);
                      onMessage?.(parsedData);
                    } catch (parseError) {
                      // If parsing fails, use raw data
                      setData(dataStr);
                      onMessage?.(dataStr);
                    }
                  }
                }

                // Continue reading
                return readStream();
              })
              .catch((err) => {
                if (err.name === "AbortError") {
                  // Connection was manually closed
                  setStatus("disconnected");
                  return;
                }

                setError(err as Event);
                onError?.(err as Event);

                // Attempt to reconnect on error
                if (!isManualCloseRef.current && autoReconnect) {
                  if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1;
                    setStatus("reconnecting");

                    // Exponential backoff
                    const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
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
            // Connection was manually closed
            setStatus("disconnected");
            return;
          }

          setError(err as Event);
          setStatus("error");
          onError?.(err as Event);

          // Attempt to reconnect on error
          if (!isManualCloseRef.current && autoReconnect) {
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current += 1;
              setStatus("reconnecting");

              // Exponential backoff
              const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
              reconnectTimeoutRef.current = setTimeout(() => {
                connectToSSE();
              }, delay);
            } else {
              setStatus("error");
            }
          }
        });
    } catch (err) {
      setError(err as Event);
      setStatus("error");
      onError?.(err as Event);
    }
  }, [url, autoReconnect, reconnectInterval, maxReconnectAttempts, onMessage, onError, onOpen]);

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

