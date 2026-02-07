/**
 * Get the current origin (protocol + host + port) from the browser
 * This ensures the port is always included in URLs
 * 
 * @returns The full origin URL (e.g., "http://localhost:3000" or "https://example.com")
 */
export function getCurrentOrigin(): string {
    if (typeof window === "undefined") {
        return "";
    }

    // window.location.origin includes protocol, hostname, and port
    return window.location.origin;
}

/**
 * Construct a full URL with the current origin
 * This ensures the port is preserved in the URL
 * 
 * @param path - The path to append to the origin (should start with /)
 * @returns The full URL with origin and path
 */
export function getFullUrl(path: string): string {
    const origin = getCurrentOrigin();
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${origin}${normalizedPath}`;
}
