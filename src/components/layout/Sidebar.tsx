"use client";

import {
  Activity,
  BedDouble,
  Beaker,
  CreditCard,
  Home,
  LayoutList,
  Users2,
  Stethoscope,
  FlaskConical,
  BarChart3,
  UserCog,
  Package,
  FileText,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useTenant } from "@/hooks/useTenant";
import { useSidebar } from "@/hooks/useSidebar";
import { FEATURES } from "@/lib/feature-flags";

// Navigation items with both legacy hash and new route paths
const navItems = [
  { label: "Dashboard", legacyHref: "#dashboard", newRoute: "/", icon: Home, featureFlag: "NEW_DASHBOARD" },
  { label: "Analytics", legacyHref: "#analytics", newRoute: "/analytics", icon: BarChart3, featureFlag: "NEW_ANALYTICS" },
  { label: "Patients", legacyHref: "#patients", newRoute: "/patients", icon: Users2, featureFlag: "NEW_PATIENTS" },
  { label: "Appointments/OPD", legacyHref: "#opd", newRoute: "/opd", icon: Activity, featureFlag: "NEW_OPD" },
  { label: "Queue", legacyHref: "#queue", newRoute: "/queue", icon: LayoutList, featureFlag: "NEW_QUEUE" },
  { label: "IPD", legacyHref: "#admissions", newRoute: "/admissions", icon: BedDouble, featureFlag: "NEW_ADMISSIONS" },
  { label: "Lab Bookings", legacyHref: "#lab-bookings", newRoute: "/lab-bookings", icon: FlaskConical, featureFlag: "NEW_LAB_BOOKINGS" },
  { label: "Lab Reports", legacyHref: "#lab-technician", newRoute: "/lab-technician", icon: FlaskConical, roles: ["lab_technician", "admin"], featureFlag: "NEW_LAB_TECHNICIAN" },
  { label: "Lab Test Catalog", legacyHref: "#labs", newRoute: "/labs", icon: Beaker, featureFlag: "NEW_LABS" },
  { label: "Service Master", legacyHref: "#services", newRoute: "/services", icon: Package, featureFlag: "NEW_SERVICES" },
  { label: "Billing", legacyHref: "#billing", newRoute: "/billing", icon: CreditCard, featureFlag: "NEW_BILLING" },
  { label: "MRD Documents", legacyHref: "#mrd", newRoute: "/mrd", icon: FileText, featureFlag: "NEW_MRD" },
  { label: "Doctors", legacyHref: "#doctors", newRoute: "/doctors", icon: Stethoscope, featureFlag: "NEW_DOCTORS" },
  { label: "My Panel", legacyHref: "#doctor-panel", newRoute: "/doctor-panel", icon: Stethoscope, roles: ["doctor"], featureFlag: "NEW_DOCTOR_PANEL" },
  { label: "Staff", legacyHref: "#users", newRoute: "/users", icon: UserCog, featureFlag: "NEW_USERS" },
];

export function Sidebar() {
  const [hash, setHash] = useState<string>("#dashboard");
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const { hospitalName } = useTenant();
  const { isDesktopCollapsed, isMobileMenuOpen, isMobile, closeMobileSidebar } = useSidebar();

  useEffect(() => {
    const updateHash = () => {
      const newHash = window.location.hash || "#dashboard";
      setHash(newHash);
    };
    updateHash();
    window.addEventListener("hashchange", updateHash);

    // Get user role from localStorage
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role");
      setUserRole(role);
    }

    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const isRoleAllowed = (item: typeof navItems[0]): boolean => {
    if (!item.roles) return true; // No role restriction
    if (!userRole) return false;
    return item.roles.includes(userRole);
  };

  // Check if feature flag is enabled for a given nav item
  const isNewRouteEnabled = (item: typeof navItems[0]): boolean => {
    if (!item.featureFlag) return false;
    return FEATURES[item.featureFlag as keyof typeof FEATURES] === true;
  };

  // Handle navigation click - close mobile drawer if on mobile
  const handleNavClick = () => {
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  // Render navigation content (shared between desktop and mobile)
  const renderSidebarContent = () => (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm">
          <Image
            src="/cura-logo-v2.png"
            alt="CURA Logo"
            width={500}
            height={500}
            className="h-full w-full object-contain"
            priority
            unoptimized
          />
        </div>
        <div>
          <p className="text-base font-bold uppercase tracking-wide text-teal-600">
            CURA
          </p>
          <p className="text-lg font-semibold text-slate-900">{hospitalName}</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          if (!isRoleAllowed(item)) return null;

          const Icon = item.icon;
          const useNewRoute = isNewRouteEnabled(item);

          // For new routes: check pathname match (handle trailing slashes)
          // For legacy routes: check hash match
          const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
          const active = useNewRoute
            ? normalizedPathname === item.newRoute
            : hash === item.legacyHref || (hash === "" && item.legacyHref === "#dashboard");

          const baseClassName = clsx(
            "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-700 transition-all hover:bg-sky-50 hover:text-sky-700",
            active ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold shadow-md hover:from-sky-600 hover:to-teal-600 hover:text-white" : ""
          );

          // Render Next.js Link for new routes, button for legacy hash routing
          if (useNewRoute) {
            return (
              <Link
                key={item.label}
                href={item.newRoute}
                className={baseClassName}
                onClick={handleNavClick}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          } else {
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (window.location.hash !== item.legacyHref) {
                    window.location.hash = item.legacyHref;
                  }
                  setHash(item.legacyHref);
                  handleNavClick();
                }}
                className={baseClassName}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          }
        })}
      </nav>

      <div className="mt-auto rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 p-[1px] shadow-lg">
        <div className="rounded-[11px] bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Live
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <p className="text-slate-800 font-semibold">Systems Healthy</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">99.9% uptime</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - Conditionally rendered based on isDesktopCollapsed */}
      {!isDesktopCollapsed && (
        <aside className="glass fixed left-0 top-0 hidden h-screen w-64 flex-shrink-0 flex-col px-6 py-8 text-sm text-slate-700 transition-all duration-300 lg:flex">
          {renderSidebarContent()}
        </aside>
      )}

      {/* Mobile Drawer - Slides in from left */}
      <aside
        className={clsx(
          "glass fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-shrink-0 flex-col px-6 py-8 text-sm text-slate-700",
          "transition-transform duration-300 ease-in-out lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {renderSidebarContent()}
      </aside>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobileSidebar}
          aria-label="Close menu"
        />
      )}
    </>
  );
}

