import {
  Home,
  BarChart3,
  Users2,
  Users,
  Activity,
  MonitorPlay,
  BedDouble,
  FlaskConical,
  Beaker,
  Package,
  CalendarDays,
  CreditCard,
  FileText,
  Stethoscope,
  Eye,
  UserCog,
  Building2,
  Shield,
  Monitor,
  Settings,
  UserX,
  Gauge,
  Pill,
  Truck,
  ShoppingCart,
  PackageCheck,
  Boxes,
  Receipt,
  RotateCcw,
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Scale,
  Database,
  Link as LinkIcon,
  LucideIcon,
} from "lucide-react";
import { UserRole, ScreenDetail } from "@/types";
import { ScreenResponse } from "@/services/screensApi";
import { PANEL_PATHS } from "@/utils/panelRouting";

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
}

export interface NavGroupDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  isPlatform?: boolean;
  // If true, will render as direct item if only 1 child exists
  allowStandaloneSingle?: boolean;
  items: {
    path: string;
    label: string;
    icon: LucideIcon;
  }[];
}

export interface ResolvedNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  isStandalone: boolean;
  standaloneItem?: NavItemConfig;
  items: NavItemConfig[];
  totalBadge?: number;
}

// Icon mapping from string names (database icons) to Lucide components
export const iconMap: Record<string, LucideIcon> = {
  Home,
  BarChart3,
  Users2,
  Users,
  Activity,
  MonitorPlay,
  BedDouble,
  FlaskConical,
  Beaker,
  Package,
  CalendarDays,
  CreditCard,
  FileText,
  Stethoscope,
  Eye,
  UserCog,
  Building2,
  Shield,
  ShieldCheck,
  Monitor,
  Settings,
  UserX,
  Gauge,
  Pill,
  Truck,
  ShoppingCart,
  PackageCheck,
  Boxes,
  Receipt,
  RotateCcw,
  LayoutDashboard,
  ClipboardList,
  Scale,
  Database,
  Link: LinkIcon,
};

// All Platform Owner screen paths
export const PLATFORM_OWNER_SCREENS: readonly string[] = [
  "/tenants",
  "/subscription-plans",
  "/rate-limits",
  "/session-policies",
  "/platform-billing",
  "/feature-flags",
  "/api-permissions",
  "/screens",
  "/master-data",
  "/terms-conditions",
  "/platform-patient-management",
] as const;

// Definition of Platform Owner Groups
export const PLATFORM_OWNER_GROUPS: NavGroupDefinition[] = [
  {
    id: "platform_tenants",
    label: "Tenant Management",
    icon: Building2,
    isPlatform: true,
    allowStandaloneSingle: false,
    items: [
      { path: "/tenants", label: "Tenants", icon: Building2 },
      { path: "/users", label: "Tenant Staff", icon: Users },
      { path: "/subscription-plans", label: "Plans & Modules", icon: Boxes },
      { path: "/rate-limits", label: "Rate Limits", icon: Gauge },
      { path: "/session-policies", label: "Session Policies", icon: ShieldCheck },
    ],
  },
  {
    id: "platform_system",
    label: "Platform Administration",
    icon: Settings,
    isPlatform: true,
    allowStandaloneSingle: false,
    items: [
      { path: "/feature-flags", label: "Feature Flags", icon: Settings },
      { path: "/api-permissions", label: "API Permissions", icon: Shield },
      { path: "/screens", label: "Screens", icon: Monitor },
      { path: "/dashboard-config", label: "Dashboard Settings", icon: LayoutDashboard },
      { path: "/master-data", label: "Master Data", icon: Package },
      { path: "/platform-patient-management", label: "Patient Data Cleanup", icon: UserX },
    ],
  },
  {
    id: "platform_billing_legal",
    label: "Billing & Compliance",
    icon: Scale,
    isPlatform: true,
    allowStandaloneSingle: false,
    items: [
      { path: "/platform-billing", label: "Platform Billing", icon: FileText },
      { path: "/terms-conditions", label: "Terms & Privacy", icon: Scale },
    ],
  },
];

// Definition of Hospital Groups
export const HOSPITAL_GROUPS: NavGroupDefinition[] = [
  {
    id: "clinical",
    label: "Clinical & OPD",
    icon: Activity,
    allowStandaloneSingle: true,
    items: [
      { path: "/opd", label: "Appointments/OPD", icon: Activity },
      { path: "/patients", label: "Patients", icon: Users2 },
      { path: "/doctor-panel", label: "My Panel (Doctor)", icon: Stethoscope },
      { path: "/optometrist-panel", label: "My Panel (Optometrist)", icon: Eye },
      { path: "/clinic-panel", label: "Clinic Panel", icon: Stethoscope },
      { path: "/queue/tv-display", label: "TV Display", icon: MonitorPlay },
    ],
  },
  {
    id: "inpatient",
    label: "Inpatient & Day Care",
    icon: BedDouble,
    allowStandaloneSingle: true,
    items: [
      { path: "/ipd-workspace", label: "IPD Workspace", icon: BedDouble },
      { path: "/admissions", label: "IPD", icon: BedDouble },
      { path: "/day-care", label: "Day Care Surgery", icon: Activity },
    ],
  },
  {
    id: "surgeries",
    label: "Surgeries & OT",
    icon: CalendarDays,
    allowStandaloneSingle: true,
    items: [
      { path: "/planned-surgeries", label: "Planned Surgeries", icon: CalendarDays },
      { path: "/surgeries", label: "Surgery Catalog", icon: Activity },
    ],
  },
  {
    id: "laboratory",
    label: "Laboratory",
    icon: FlaskConical,
    allowStandaloneSingle: true,
    items: [
      { path: "/lab-bookings", label: "Lab Bookings", icon: FlaskConical },
      { path: "/lab-technician", label: "Lab Reports", icon: FlaskConical },
      { path: "/labs", label: "Lab Test Catalog", icon: Beaker },
    ],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    icon: Pill,
    allowStandaloneSingle: false,
    items: [
      { path: "/pharmacy", label: "Overview", icon: LayoutDashboard },
      { path: "/pharmacy/dispensing", label: "Dispensing", icon: ClipboardList },
      { path: "/pharmacy/inventory", label: "Inventory", icon: Boxes },
      { path: "/pharmacy/medicines", label: "Medicine Master", icon: Pill },
      { path: "/pharmacy/suppliers", label: "Suppliers", icon: Truck },
      { path: "/pharmacy/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { path: "/pharmacy/grn", label: "Goods Receipt", icon: PackageCheck },
      { path: "/pharmacy/invoices", label: "Invoices", icon: Receipt },
      { path: "/pharmacy/returns", label: "Returns", icon: RotateCcw },
      { path: "/pharmacy/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    id: "billing",
    label: "Billing & Finance",
    icon: CreditCard,
    allowStandaloneSingle: true,
    items: [
      { path: "/billing", label: "Billing", icon: CreditCard },
      { path: "/invoice-templates", label: "Invoice Templates", icon: FileText },
    ],
  },
  {
    id: "records",
    label: "Records & Analytics",
    icon: BarChart3,
    allowStandaloneSingle: true,
    items: [
      { path: "/analytics", label: "Analytics", icon: BarChart3 },
      { path: "/mrd", label: "MRD Documents", icon: FileText },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: UserCog,
    allowStandaloneSingle: true,
    items: [
      { path: "/users", label: "Staff Management", icon: UserCog },
      { path: "/doctors", label: "Doctors", icon: Stethoscope },
      { path: "/doctor-groups", label: "Doctor Groups", icon: Users },
      { path: "/permissions", label: "Permissions", icon: Shield },
      { path: "/dashboard-config", label: "Dashboard Settings", icon: LayoutDashboard },
      { path: "/master-data", label: "Master Data", icon: Package },
      { path: "/services", label: "Service Master", icon: Package },
      { path: "/abdm-settings", label: "ABDM Settings", icon: ShieldCheck },
      { path: "/panel-config", label: "Panel Configuration", icon: Settings },
      { path: "/optometrist-mappings", label: "Optometrist Mappings", icon: LinkIcon },
      { path: "/examiner-mappings", label: "Examiner Mappings", icon: LinkIcon },
      { path: "/backup", label: "Data Backup", icon: Database },
    ],
  },
];

interface BuildNavigationOptions {
  screenDetails: ScreenDetail[];
  userRole: UserRole | null;
  allowedScreens: string[];
  resolvedDoctorPanelPath?: string | null;
  pendingLabCount?: number;
  abdmEnabled?: boolean;
}

/**
 * Builds the resolved navigation groups according to the user's role and screen permissions.
 */
export function buildNavigationGroups({
  screenDetails,
  userRole,
  allowedScreens,
  resolvedDoctorPanelPath,
  pendingLabCount = 0,
  abdmEnabled = true,
}: BuildNavigationOptions): {
  standaloneDashboard: NavItemConfig | null;
  groups: ResolvedNavGroup[];
} {
  // 1. Platform Owner Navigation
  if (userRole === "platform_owner") {
    const groups: ResolvedNavGroup[] = [];

    // Ensure all platform owner screens are accessible
    const accessiblePaths = new Set(
      screenDetails.length > 0
        ? screenDetails.map((s) => s.path)
        : PLATFORM_OWNER_SCREENS
    );

    // Also include canonical fallback and cross-tenant staff route for platform owner
    PLATFORM_OWNER_SCREENS.forEach((p) => accessiblePaths.add(p));
    accessiblePaths.add("/users");

    for (const groupDef of PLATFORM_OWNER_GROUPS) {
      const activeItems: NavItemConfig[] = [];
      for (const item of groupDef.items) {
        if (accessiblePaths.has(item.path)) {
          activeItems.push({
            href: item.path,
            label: item.label,
            icon: item.icon,
          });
        }
      }

      if (activeItems.length > 0) {
        groups.push({
          id: groupDef.id,
          label: groupDef.label,
          icon: groupDef.icon,
          isStandalone: false,
          items: activeItems,
        });
      }
    }

    return {
      standaloneDashboard: null, // Platform owner lands on /tenants, no hospital dashboard
      groups,
    };
  }

  // 2. Hospital Tenant Navigation
  const labelMap = new Map<string, string>();
  const iconOverrideMap = new Map<string, LucideIcon>();

  // Populate from screenDetails
  for (const s of screenDetails) {
    labelMap.set(s.path, s.label);
    if (s.icon && iconMap[s.icon]) {
      iconOverrideMap.set(s.path, iconMap[s.icon]);
    }
  }

  // Set of allowed screen paths
  const allowedSet = new Set(allowedScreens);
  // Also include any in screenDetails
  screenDetails.forEach((s) => allowedSet.add(s.path));

  // Check if Dashboard (/) is allowed
  const hasDashboard = allowedSet.has("/");
  const standaloneDashboard: NavItemConfig | null = hasDashboard
    ? {
        href: "/",
        label: labelMap.get("/") || "Dashboard",
        icon: Home,
      }
    : null;

  // If ABDM is disabled, remove /abdm-settings from allowed set
  if (!abdmEnabled) {
    allowedSet.delete("/abdm-settings");
  }

  // Track assigned screens to detect unassigned/other screens
  const assignedPaths = new Set<string>(["/"]);
  const resolvedGroups: ResolvedNavGroup[] = [];

  for (const groupDef of HOSPITAL_GROUPS) {
    const activeItems: NavItemConfig[] = [];

    for (const item of groupDef.items) {
      // Check if this is a doctor/examiner panel path
      if ((PANEL_PATHS as readonly string[]).includes(item.path)) {
        // If doctor/examiner, only include their specific resolved panel
        if (userRole === "doctor" || userRole === "examiner" || userRole === "optometrist") {
          if (resolvedDoctorPanelPath && item.path !== resolvedDoctorPanelPath) {
            continue;
          }
        }
      }

      if (allowedSet.has(item.path)) {
        assignedPaths.add(item.path);

        const badge =
          item.path === "/lab-bookings" && pendingLabCount > 0
            ? pendingLabCount
            : undefined;

        activeItems.push({
          href: item.path,
          label: labelMap.get(item.path) || item.label,
          icon: iconOverrideMap.get(item.path) || item.icon,
          badge,
        });
      }
    }

    if (activeItems.length > 0) {
      // Check if group has badges
      const totalBadge = activeItems.reduce((acc, curr) => {
        if (typeof curr.badge === "number") return acc + curr.badge;
        return acc;
      }, 0);

      // If group allows standalone when single, and only 1 item exists
      const isStandalone = Boolean(groupDef.allowStandaloneSingle && activeItems.length === 1);

      resolvedGroups.push({
        id: groupDef.id,
        label: groupDef.label,
        icon: groupDef.icon,
        isStandalone,
        standaloneItem: isStandalone ? activeItems[0] : undefined,
        items: activeItems,
        totalBadge: totalBadge > 0 ? totalBadge : undefined,
      });
    }
  }

  // Check for any unassigned screen from screenDetails (ensures 100% backward compatibility)
  const unassignedItems: NavItemConfig[] = [];
  for (const screen of screenDetails) {
    if (
      !assignedPaths.has(screen.path) &&
      allowedSet.has(screen.path) &&
      !PLATFORM_OWNER_SCREENS.includes(screen.path)
    ) {
      unassignedItems.push({
        href: screen.path,
        label: screen.label,
        icon: iconMap[screen.icon] || Package,
      });
    }
  }

  if (unassignedItems.length > 0) {
    resolvedGroups.push({
      id: "other_screens",
      label: "Other Modules",
      icon: Package,
      isStandalone: unassignedItems.length === 1,
      standaloneItem: unassignedItems.length === 1 ? unassignedItems[0] : undefined,
      items: unassignedItems,
    });
  }

  return {
    standaloneDashboard,
    groups: resolvedGroups,
  };
}

export interface PermissionScreenGroupConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  screenPaths: string[];
}

export const PERMISSION_GROUPS: PermissionScreenGroupConfig[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Home,
    screenPaths: ["/"],
  },
  {
    id: "clinical",
    label: "Clinical & OPD",
    icon: Activity,
    screenPaths: [
      "/opd",
      "/patients",
      "/doctor-panel",
      "/optometrist-panel",
      "/clinic-panel",
      "/queue/tv-display",
    ],
  },
  {
    id: "inpatient",
    label: "Inpatient & Day Care",
    icon: BedDouble,
    screenPaths: ["/ipd-workspace", "/admissions", "/day-care"],
  },
  {
    id: "surgeries",
    label: "Surgeries & OT",
    icon: CalendarDays,
    screenPaths: ["/planned-surgeries", "/surgeries"],
  },
  {
    id: "laboratory",
    label: "Laboratory",
    icon: FlaskConical,
    screenPaths: ["/lab-bookings", "/lab-technician", "/labs"],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    icon: Pill,
    screenPaths: [
      "/pharmacy",
      "/pharmacy/dispensing",
      "/pharmacy/inventory",
      "/pharmacy/medicines",
      "/pharmacy/suppliers",
      "/pharmacy/purchase-orders",
      "/pharmacy/grn",
      "/pharmacy/invoices",
      "/pharmacy/returns",
      "/pharmacy/reports",
    ],
  },
  {
    id: "billing",
    label: "Billing & Finance",
    icon: CreditCard,
    screenPaths: ["/billing", "/invoice-templates"],
  },
  {
    id: "records",
    label: "Records & Analytics",
    icon: BarChart3,
    screenPaths: ["/analytics", "/mrd"],
  },
  {
    id: "admin",
    label: "Hospital Administration",
    icon: UserCog,
    screenPaths: [
      "/users",
      "/doctors",
      "/doctor-groups",
      "/permissions",
      "/dashboard-config",
      "/master-data",
      "/services",
      "/abdm-settings",
      "/panel-config",
      "/optometrist-mappings",
      "/examiner-mappings",
      "/backup",
    ],
  },
  {
    id: "platform",
    label: "Platform Management",
    icon: Building2,
    screenPaths: [
      "/tenants",
      "/rate-limits",
      "/session-policies",
      "/feature-flags",
      "/api-permissions",
      "/screens",
      "/platform-patient-management",
      "/platform-billing",
      "/terms-conditions",
    ],
  },
];

export interface GroupedPermissionScreens {
  id: string;
  label: string;
  icon: LucideIcon;
  screens: ScreenResponse[];
}

/**
 * Groups screens for the permissions management panels matching the menu groups 1:1.
 */
export function groupScreensForPermissions(
  screens: ScreenResponse[],
  isPlatformOwner: boolean = false
): GroupedPermissionScreens[] {
  const assignedPaths = new Set<string>();
  const result: GroupedPermissionScreens[] = [];

  const screenMap = new Map<string, ScreenResponse>();
  screens.forEach((s) => screenMap.set(s.path, s));

  for (const group of PERMISSION_GROUPS) {
    if (group.id === "platform" && !isPlatformOwner) {
      continue;
    }

    const groupScreens: ScreenResponse[] = [];
    for (const path of group.screenPaths) {
      const screen = screenMap.get(path);
      if (screen) {
        groupScreens.push(screen);
        assignedPaths.add(path);
      }
    }

    if (groupScreens.length > 0) {
      result.push({
        id: group.id,
        label: group.label,
        icon: group.icon,
        screens: groupScreens,
      });
    }
  }

  // Any unassigned screens go into "Other Modules"
  const otherScreens = screens.filter(
    (s) =>
      !assignedPaths.has(s.path) &&
      (isPlatformOwner || !PLATFORM_OWNER_SCREENS.includes(s.path))
  );

  if (otherScreens.length > 0) {
    result.push({
      id: "other",
      label: "Other Modules",
      icon: Package,
      screens: otherScreens,
    });
  }

  return result;
}
