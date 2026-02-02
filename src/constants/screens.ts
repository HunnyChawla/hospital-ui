import { UserRole } from "@/types";

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
