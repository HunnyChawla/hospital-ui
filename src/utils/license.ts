/**
 * Calculate the number of days until license expiry
 * @param expiryDate - The license expiry date as a string (ISO format or YYYY-MM-DD)
 * @returns Number of days until expiry (negative if expired, 0 if today, positive if future)
 */
export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  
  // Set time to midnight for accurate day calculation
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if license expires within the specified number of days
 * @param expiryDate - The license expiry date as a string
 * @param daysThreshold - Number of days threshold (default: 7)
 * @returns true if license expires within the threshold, false otherwise
 */
export function isExpiringSoon(expiryDate: string | null, daysThreshold: number = 7): boolean {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  if (daysUntil === null) return false;
  
  return daysUntil <= daysThreshold && daysUntil >= 0;
}

/**
 * Check if license is already expired
 * @param expiryDate - The license expiry date as a string
 * @returns true if license is expired, false otherwise
 */
export function isExpired(expiryDate: string | null): boolean {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  if (daysUntil === null) return false;
  
  return daysUntil < 0;
}

/**
 * Get a human-readable message about license expiry status
 * @param expiryDate - The license expiry date as a string
 * @returns A message describing the expiry status
 */
export function getExpiryMessage(expiryDate: string | null): string | null {
  if (!expiryDate) return null;
  
  const daysUntil = getDaysUntilExpiry(expiryDate);
  if (daysUntil === null) return null;
  
  if (daysUntil < 0) {
    return `License expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`;
  } else if (daysUntil === 0) {
    return 'License expires today';
  } else if (daysUntil === 1) {
    return 'License expires tomorrow';
  } else if (daysUntil <= 7) {
    return `License expires in ${daysUntil} days`;
  } else {
    return null; // More than 7 days, no urgent message needed
  }
}

