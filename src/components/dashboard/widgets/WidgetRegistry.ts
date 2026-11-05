import { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Ticket,
  HeartPulse,
  BedDouble,
  Coins,
  Currency,
  Zap,
  Calendar,
  ClipboardList,
  Receipt,
  LayoutGrid,
  Scissors,
  TrendingUp,
} from "lucide-react";

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: "header" | "clinical" | "stats" | "operations" | "finance" | "navigation";
  icon: LucideIcon;
  defaultColSpan: 1 | 2 | 3 | 4;
  defaultRowSpan?: 1 | 2 | 3 | 4;
  /**
   * Screen paths that enable this widget. If specified, the tenant MUST have access
   * to at least ONE of these screen paths in their allowedScreens.
   * If empty or undefined, the widget is available to all tenants.
   */
  requiredScreens?: string[];
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  welcome_header: {
    id: "welcome_header",
    name: "Welcome Banner",
    description: "Personalized greeting, shift status, and hospital name",
    category: "header",
    icon: Sparkles,
    defaultColSpan: 3,
    defaultRowSpan: 1,
    requiredScreens: [],
  },
  running_token: {
    id: "running_token",
    name: "Live Running Tokens",
    description: "Real-time active token counter, room numbers, and next in queue",
    category: "clinical",
    icon: Ticket,
    defaultColSpan: 2,
    defaultRowSpan: 2,
    requiredScreens: ["/queue", "/opd"],
  },
  stat_patients: {
    id: "stat_patients",
    name: "Total Patients",
    description: "Registered patients count and appointment overview",
    category: "stats",
    icon: HeartPulse,
    defaultColSpan: 1,
    defaultRowSpan: 1,
    requiredScreens: ["/patients", "/opd"],
  },
  stat_admissions: {
    id: "stat_admissions",
    name: "Active Admissions",
    description: "IPD patients admitted and bed occupancy ratio",
    category: "stats",
    icon: BedDouble,
    defaultColSpan: 1,
    defaultRowSpan: 1,
    requiredScreens: ["/admissions", "/ipd-workspace"],
  },
  stat_billing: {
    id: "stat_billing",
    name: "Pending Billing",
    description: "Outstanding invoices and total collected revenue",
    category: "stats",
    icon: Coins,
    defaultColSpan: 1,
    defaultRowSpan: 1,
    requiredScreens: ["/billing"],
  },
  stat_daily_revenue: {
    id: "stat_daily_revenue",
    name: "Daily Revenue",
    description: "Today's collections compared with yesterday",
    category: "stats",
    icon: Currency,
    defaultColSpan: 1,
    defaultRowSpan: 1,
    requiredScreens: ["/billing", "/analytics"],
  },
  quick_actions: {
    id: "quick_actions",
    name: "Action Shortcuts",
    description: "One-click shortcuts to add patients, book appointments, etc.",
    category: "navigation",
    icon: Zap,
    defaultColSpan: 4,
    defaultRowSpan: 1,
    requiredScreens: [],
  },
  today_appointments: {
    id: "today_appointments",
    name: "Today's Appointments",
    description: "Timeline of appointments scheduled, in consultation, and done",
    category: "clinical",
    icon: Calendar,
    defaultColSpan: 2,
    defaultRowSpan: 2,
    requiredScreens: ["/opd"],
  },
  recent_admissions: {
    id: "recent_admissions",
    name: "Recent Admissions",
    description: "Latest 5 IPD admissions with ward, doctor, and diagnosis",
    category: "operations",
    icon: ClipboardList,
    defaultColSpan: 2,
    defaultRowSpan: 2,
    requiredScreens: ["/admissions", "/ipd-workspace"],
  },
  bills_list: {
    id: "bills_list",
    name: "Recent Invoices",
    description: "Latest pending and paid invoices with quick collect & print",
    category: "finance",
    icon: Receipt,
    defaultColSpan: 2,
    defaultRowSpan: 4,
    requiredScreens: ["/billing"],
  },
  bed_occupancy_map: {
    id: "bed_occupancy_map",
    name: "Bed Occupancy Breakdown",
    description: "Ward-wise occupied vs available beds with progress bars",
    category: "operations",
    icon: LayoutGrid,
    defaultColSpan: 2,
    defaultRowSpan: 2,
    requiredScreens: ["/admissions", "/ipd-workspace"],
  },
  upcoming_surgeries: {
    id: "upcoming_surgeries",
    name: "Upcoming Surgeries",
    description: "Planned OT surgeries for today and tomorrow",
    category: "clinical",
    icon: Scissors,
    defaultColSpan: 2,
    defaultRowSpan: 2,
    requiredScreens: ["/planned-surgeries", "/surgeries"],
  },
  revenue_chart: {
    id: "revenue_chart",
    name: "Revenue Trend (7-Day)",
    description: "Mini 7-day sparkline of invoices and collections",
    category: "finance",
    icon: TrendingUp,
    defaultColSpan: 4,
    defaultRowSpan: 2,
    requiredScreens: ["/analytics"],
  },
};

/**
 * Filter widgets by user/tenant allowed screens.
 */
export function filterWidgetsByPermissions(
  widgetKeys: string[],
  hasAccess: (screenPath: string) => boolean
): string[] {
  return widgetKeys.filter((key) => {
    const def = WIDGET_REGISTRY[key];
    if (!def) return false;
    if (!def.requiredScreens || def.requiredScreens.length === 0) return true;
    return def.requiredScreens.some((path) => hasAccess(path));
  });
}
