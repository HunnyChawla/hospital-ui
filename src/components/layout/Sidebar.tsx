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
  ChevronLeft,
  ChevronRight,
  Radio,
  Eye,
  MonitorPlay,
  Building2,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useTenant } from "@/hooks/useTenant";
import { useSidebar } from "@/hooks/useSidebar";
import { Tooltip } from "@/components/common/Tooltip";

// Navigation items
const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Patients", href: "/patients", icon: Users2 },
  { label: "Appointments/OPD", href: "/opd", icon: Activity },
  { label: "Queue", href: "/queue", icon: LayoutList },
  { label: "Live Queue", href: "/queue/live", icon: Radio },
  { label: "TV Display", href: "/queue/tv-display", icon: MonitorPlay },
  { label: "IPD", href: "/admissions", icon: BedDouble },
  { label: "Lab Bookings", href: "/lab-bookings", icon: FlaskConical },
  { label: "Lab Reports", href: "/lab-technician", icon: FlaskConical, roles: ["lab_technician", "admin"] },
  { label: "Lab Test Catalog", href: "/labs", icon: Beaker },
  { label: "Service Master", href: "/services", icon: Package },
  { label: "Surgeries", href: "/surgeries", icon: Activity, roles: ["admin", "receptionist"] },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "MRD Documents", href: "/mrd", icon: FileText },
  { label: "Doctors", href: "/doctors", icon: Stethoscope },
  { label: "My Panel", href: "/doctor-panel", icon: Stethoscope, roles: ["doctor"] },
  { label: "Optometry Panel", href: "/optometrist-panel", icon: Eye, roles: ["optometrist", "admin", "doctor"] },
  { label: "Staff", href: "/users", icon: UserCog },
  { label: "Tenants", href: "/tenants", icon: Building2, roles: ["platform_owner"] },
];

export function Sidebar() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const { hospitalName } = useTenant();
  const { isDesktopCollapsed, isMobileMenuOpen, isMobile, closeMobileSidebar, toggleDesktopSidebar } = useSidebar();

  useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role");
      setUserRole(role);
    }
  }, []);

  const isRoleAllowed = (item: typeof navItems[0]): boolean => {
    if (!item.roles) return true; // No role restriction
    if (!userRole) return false;
    return item.roles.includes(userRole);
  };

  // Handle navigation click - close mobile drawer if on mobile
  const handleNavClick = () => {
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  // Render navigation content (shared between desktop and mobile)
  const renderSidebarContent = (showCollapseButton: boolean = false) => (
    <>
      <div className="mb-8 flex flex-shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
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
        {showCollapseButton && (
          <button
            onClick={toggleDesktopSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide min-h-0">
        {navItems.map((item) => {
          if (!isRoleAllowed(item)) return null;

          const Icon = item.icon;
          const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
          const active = normalizedPathname === item.href;

          const baseClassName = clsx(
            "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-700 transition-all hover:bg-sky-50 hover:text-sky-700",
            active ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold shadow-md hover:from-sky-600 hover:to-teal-600 hover:text-white" : ""
          );

          return (
            <Link
              key={item.label}
              href={item.href}
              className={baseClassName}
              onClick={handleNavClick}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex-shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 p-[1px] shadow-lg">
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

  // Render collapsed sidebar with icons only
  const renderCollapsedIcons = () => {
    // Get filtered nav items (same logic as expanded)
    const filteredNavItems = navItems.filter(isRoleAllowed);

    return (
      <>
        {/* Expand Button */}
        <div className="mb-2 flex flex-shrink-0 justify-center">
          <Tooltip content="Expand sidebar" side="right">
            <button
              onClick={toggleDesktopSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        {/* Logo Icon Only */}
        <div className="mb-2 flex flex-shrink-0 items-center justify-center sm:mb-3 md:mb-4">
          <Tooltip content="CURA" side="right">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm sm:h-10 sm:w-10 md:h-11 md:w-11">
              <Image
                src="/cura-logo-v2.png"
                alt="CURA Logo"
                width={44}
                height={44}
                className="h-full w-full object-contain"
                priority
                unoptimized
              />
            </div>
          </Tooltip>
        </div>

        {/* Navigation Icons - Scrollable with dynamic sizing */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-hide min-h-0">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const normalizedPathname = pathname.endsWith('/') && pathname !== '/'
              ? pathname.slice(0, -1)
              : pathname;
            const active = normalizedPathname === item.href;

            const iconButtonClass = clsx(
              "flex w-full h-8 sm:h-9 md:h-10 items-center justify-center rounded-xl transition-all",
              active
                ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md"
                : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
            );

            return (
              <Tooltip key={item.label} content={item.label} side="right">
                <Link
                  href={item.href}
                  className={iconButtonClass}
                  onClick={handleNavClick}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Tooltip>
            );
          })}
        </nav>

        {/* Status Icon at Bottom */}
        <div className="mt-1 flex-shrink-0 sm:mt-2">
          <Tooltip content="Systems Healthy (99.9%)" side="right">
            <div className="rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 p-[1px] shadow-lg">
              <div className="flex h-8 w-full items-center justify-center rounded-[11px] bg-white sm:h-9 md:h-10">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 sm:h-2 sm:w-2" />
              </div>
            </div>
          </Tooltip>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Desktop Sidebar - Always visible, width changes based on isDesktopCollapsed */}
      <aside className={clsx(
        "glass fixed left-0 top-0 hidden h-screen flex-shrink-0 flex-col text-sm text-slate-700 transition-all duration-300 lg:flex overflow-hidden",
        isDesktopCollapsed ? "w-16 px-2 py-8" : "w-64 px-6 py-8"
      )}>
        {isDesktopCollapsed ? renderCollapsedIcons() : renderSidebarContent(true)}
      </aside>

      {/* Mobile Drawer - Slides in from left */}
      <aside
        className={clsx(
          "glass fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-shrink-0 flex-col px-6 py-8 text-sm text-slate-700 overflow-hidden",
          "transition-transform duration-300 ease-in-out lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {renderSidebarContent(false)}
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

