import { AvailableScreen, UserRole } from "@/types";

/**
 * Registry of all available screens in the application
 * Used for RBAC permission management
 */
export const AVAILABLE_SCREENS: AvailableScreen[] = [
  // Main screens
  { path: "/", label: "Dashboard", icon: "Home", category: "main" },
  { path: "/patients", label: "Patients", icon: "Users2", category: "main" },
  { path: "/billing", label: "Billing", icon: "CreditCard", category: "main" },
  { path: "/queue/tv-display", label: "TV Display", icon: "MonitorPlay", category: "main" },

  // Clinical screens
  { path: "/opd", label: "Appointments/OPD", icon: "Activity", category: "clinical" },
  { path: "/admissions", label: "IPD", icon: "BedDouble", category: "clinical" },
  { path: "/lab-bookings", label: "Lab Bookings", icon: "FlaskConical", category: "clinical" },
  { path: "/lab-technician", label: "Lab Reports", icon: "FlaskConical", category: "clinical" },
  { path: "/surgeries", label: "Surgeries", icon: "Activity", category: "clinical" },
  { path: "/planned-surgeries", label: "Planned Surgeries", icon: "CalendarDays", category: "clinical" },
  { path: "/doctor-panel", label: "My Panel (Doctor)", icon: "Stethoscope", category: "clinical" },
  { path: "/optometrist-panel", label: "My Panel (Optometrist)", icon: "Eye", category: "clinical" },

  // Admin screens
  { path: "/labs", label: "Lab Test Catalog", icon: "Beaker", category: "admin" },
  { path: "/services", label: "Service Master", icon: "Package", category: "admin" },
  { path: "/doctors", label: "Doctors", icon: "Stethoscope", category: "admin" },
  { path: "/users", label: "Staff", icon: "UserCog", category: "admin" },
  { path: "/tenants", label: "Tenants", icon: "Building2", category: "admin" },
  { path: "/permissions", label: "Permissions", icon: "Shield", category: "admin" },

  // Reports screens
  { path: "/analytics", label: "Analytics", icon: "BarChart3", category: "reports" },
  { path: "/mrd", label: "MRD Documents", icon: "FileText", category: "reports" },
];

/**
 * All available user roles in the system
 */
export const ALL_ROLES: UserRole[] = [
  "admin",
  "doctor",
  "nurse",
  "receptionist",
  "optometrist",
  "lab_technician",
  "platform_owner",
];

/**
 * Human-readable labels for each role
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  optometrist: "Optometrist",
  lab_technician: "Lab Technician",
  platform_owner: "Platform Owner",
};

/**
 * Human-readable labels for screen categories
 */
export const CATEGORY_LABELS: Record<string, string> = {
  main: "Main",
  clinical: "Clinical",
  admin: "Administration",
  reports: "Reports",
};

/**
 * Default permissions for each role
 * Used for initial seeding
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    "/",
    "/analytics",
    "/patients",
    "/opd",
    "/admissions",
    "/lab-bookings",
    "/lab-technician",
    "/labs",
    "/services",
    "/surgeries",
    "/planned-surgeries",
    "/billing",
    "/mrd",
    "/doctors",
    "/users",
    "/permissions",
  ],
  doctor: [
    "/",
    "/patients",
    "/opd",
    "/admissions",
    "/lab-bookings",
    "/billing",
    "/doctor-panel",
    "/planned-surgeries",
  ],
  nurse: ["/", "/patients", "/opd", "/admissions", "/queue/tv-display"],
  receptionist: [
    "/",
    "/patients",
    "/opd",
    "/queue/tv-display",
    "/billing",
    "/surgeries",
    "/planned-surgeries",
  ],
  optometrist: ["/", "/patients", "/opd", "/optometrist-panel"],
  lab_technician: ["/", "/lab-bookings", "/lab-technician"],
  platform_owner: AVAILABLE_SCREENS.map((s) => s.path), // All screens
};

/**
 * Get screens grouped by category
 */
export function getScreensByCategory(): Record<string, AvailableScreen[]> {
  return AVAILABLE_SCREENS.reduce(
    (acc, screen) => {
      if (!acc[screen.category]) {
        acc[screen.category] = [];
      }
      acc[screen.category].push(screen);
      return acc;
    },
    {} as Record<string, AvailableScreen[]>
  );
}

/**
 * Get screen details by path
 */
export function getScreenByPath(path: string): AvailableScreen | undefined {
  return AVAILABLE_SCREENS.find((s) => s.path === path);
}
