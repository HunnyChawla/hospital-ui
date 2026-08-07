export { };

declare global {
    interface Window {
        __ENV?: {
            NEXT_PUBLIC_API_BASE_URL?: string;
            NEXT_PUBLIC_DOMAIN_URL?: string;
            [key: string]: string | undefined;
        };
    }
}

export const getEnv = (key: string, fallback: string = ""): string => {
    if (typeof window !== "undefined" && window.__ENV && window.__ENV[key]) {
        return window.__ENV[key]!;
    }

    // Next.js requires literal process.env.VAR_NAME to inline variables for the browser.
    // Dynamic lookups like process.env[key] will return undefined in the browser.
    if (key === "NEXT_PUBLIC_API_BASE_URL") {
        return process.env.NEXT_PUBLIC_API_BASE_URL || fallback;
    }
    if (key === "NEXT_PUBLIC_DOMAIN_URL") {
        return process.env.NEXT_PUBLIC_DOMAIN_URL || fallback;
    }

    return process.env[key] || fallback;
};

// Typed exports for common variables  
// These call getEnv() which checks window.__ENV (set by env-config.js) first
// Note: If these are used before env-config.js loads, they will fallback to process.env or defaults
export const API_BASE_URL = getEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000");
export const DOMAIN_URL = getEnv("NEXT_PUBLIC_DOMAIN_URL", "http://localhost:3000");


