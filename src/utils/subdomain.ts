import { DOMAIN_URL } from "./env";

/**
 * Extract subdomain from the current URL
 * 
 * @returns The subdomain string if found, null otherwise
 * 
 * Examples:
 * - "demo-hospital.cura.com" → "demo-hospital" (when DOMAIN_URL=cura.com)
 * - "localhost:3000" → null
 * - "cura.com" → null
 */
export function extractSubdomain(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hostname = window.location.hostname;
  const domainUrl = DOMAIN_URL;

  // Handle IP addresses (no subdomain)
  if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return null;
  }

  // Handle localhost subdomains (e.g., demo-hospital.localhost)
  if (hostname.endsWith(".localhost")) {
    const subdomain = hostname.replace(".localhost", "");
    // If there's a dot in the subdomain, it means we have subdomain.localhost
    if (subdomain && subdomain !== "localhost") {
      return subdomain;
    }
    return null;
  }

  // Handle exact localhost (no subdomain)
  if (hostname === "localhost") {
    return null;
  }

  // If DOMAIN_URL is configured, use it to extract subdomain
  if (domainUrl) {
    // Remove protocol if present and get just the domain
    const baseDomain = domainUrl.replace(/^https?:\/\//, "").split("/")[0].trim();

    // Check if hostname ends with base domain
    if (hostname.endsWith(baseDomain)) {
      // Extract subdomain (everything before the base domain)
      const subdomain = hostname.replace(`.${baseDomain}`, "");

      // If subdomain is same as base domain or hostname, no subdomain exists
      if (subdomain && subdomain !== baseDomain && subdomain !== hostname) {
        return subdomain;
      }
    }
    return null;
  }

  // If no DOMAIN_URL is configured, try to extract subdomain from hostname
  // This handles cases like demo-hospital.localhost
  const parts = hostname.split(".");
  // If we have at least 3 parts (subdomain.domain.tld), extract subdomain
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}
