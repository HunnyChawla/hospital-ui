/**
 * Feature Flags for Gradual Migration
 *
 * These flags control the rollout of new Next.js App Router routes
 * vs. the legacy hash-based routing. This allows us to migrate module
 * by module with zero downtime.
 *
 * Set these via environment variables:
 * - Development: Add to .env.local
 * - Production: Set via GitHub Secrets / deployment config
 */

export const FEATURES = {
  // Patients Module - Phase 1
  NEW_PATIENTS: process.env.NEXT_PUBLIC_FF_PATIENTS === 'true',

  // Doctors Module - Phase 2
  NEW_DOCTORS: process.env.NEXT_PUBLIC_FF_DOCTORS === 'true',

  // OPD Module - Phase 2
  NEW_OPD: process.env.NEXT_PUBLIC_FF_OPD === 'true',

  // Admissions (IPD) Module - Phase 3
  NEW_ADMISSIONS: process.env.NEXT_PUBLIC_FF_ADMISSIONS === 'true',

  // Billing Module - Phase 3
  NEW_BILLING: process.env.NEXT_PUBLIC_FF_BILLING === 'true',

  // Analytics Module - Phase 4
  NEW_ANALYTICS: process.env.NEXT_PUBLIC_FF_ANALYTICS === 'true',

  // Lab Bookings Module - Phase 4
  NEW_LAB_BOOKINGS: process.env.NEXT_PUBLIC_FF_LAB_BOOKINGS === 'true',

  // Lab Technician Module - Phase 4
  NEW_LAB_TECHNICIAN: process.env.NEXT_PUBLIC_FF_LAB_TECHNICIAN === 'true',

  // Lab Tests Catalog Module - Phase 4
  NEW_LABS: process.env.NEXT_PUBLIC_FF_LABS === 'true',

  // Services Master Module - Phase 4
  NEW_SERVICES: process.env.NEXT_PUBLIC_FF_SERVICES === 'true',

  // Queue Module - Phase 4
  NEW_QUEUE: process.env.NEXT_PUBLIC_FF_QUEUE === 'true',

  // MRD Module - Phase 4
  NEW_MRD: process.env.NEXT_PUBLIC_FF_MRD === 'true',

  // Users/Staff Management Module - Phase 4
  NEW_USERS: process.env.NEXT_PUBLIC_FF_USERS === 'true',

  // Doctor Panel Module - Phase 2
  NEW_DOCTOR_PANEL: process.env.NEXT_PUBLIC_FF_DOCTOR_PANEL === 'true',

  // Optometrist Panel Module - Phase 5
  NEW_OPTOMETRIST_PANEL: process.env.NEXT_PUBLIC_FF_OPTOMETRIST_PANEL === 'true',

  // Dashboard Module - Phase 1
  NEW_DASHBOARD: process.env.NEXT_PUBLIC_FF_DASHBOARD === 'true',
} as const;

/**
 * Helper to check if ANY feature flag is enabled
 * Useful for showing migration progress indicator
 */
export function hasAnyNewFeature(): boolean {
  return Object.values(FEATURES).some(flag => flag === true);
}

/**
 * Helper to check if ALL feature flags are enabled
 * Indicates migration is complete
 */
export function allFeaturesEnabled(): boolean {
  return Object.values(FEATURES).every(flag => flag === true);
}

/**
 * Get list of enabled features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name);
}
