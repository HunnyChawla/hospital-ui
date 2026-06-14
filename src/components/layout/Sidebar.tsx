"use client";

import {
  Activity,
  BedDouble,
  Beaker,
  CreditCard,
  Home,
  LayoutList,
  Users2,
  Users,
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
  CalendarDays,
  Shield,
  Monitor,
  Link as LinkIcon,
  LayoutTemplate,
  Settings,
  LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useTenant } from "@/hooks/useTenant";
import { useSidebar } from "@/hooks/useSidebar";
import { Tooltip } from "@/components/common/Tooltip";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { usePermissions } from "@/hooks/usePermissions";

// Icon mapping from string names to Lucide components
const iconMap: Record<string, LucideIcon> = {
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
  LayoutList,
  LayoutTemplate,
  Radio,
  Monitor,
  Settings,
  Link: LinkIcon,
};

// Loading skeleton for navigation items
const NavLoadingSkeleton = () => (
  <div className="space-y-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 animate-pulse"
      >
        <div className="h-5 w-5 rounded bg-slate-200" />
        <div className="h-4 w-24 rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

// Loading skeleton for collapsed sidebar
const NavLoadingSkeletonCollapsed = () => (
  <div className="space-y-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="flex w-full h-8 sm:h-9 md:h-10 items-center justify-center rounded-xl animate-pulse"
      >
        <div className="h-4 w-4 sm:h-5 sm:w-5 rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

export function Sidebar() {
  const pathname = usePathname();
  const { hospitalName } = useTenant();
  const { isDesktopCollapsed, isMobileMenuOpen, isMobile, closeMobileSidebar, toggleDesktopSidebar } = useSidebar();
  const dispatch = useAppDispatch();
  const doctors = useAppSelector((state) => state.doctors.list);
  const { screenDetails, userRole, initialized, loading } = usePermissions();

  useEffect(() => {
    if (userRole === "doctor" && doctors.length === 0) {
      dispatch(fetchDoctors());
    }
  }, [userRole, doctors.length, dispatch]);

  // Build navigation items from permissions
  const navItems = useMemo(() => {
    // If permissions not loaded, return empty array (skeleton will be shown)
    if (!initialized || loading || screenDetails.length === 0) {
      return [];
    }

    // Map screen details to nav items with icon components
    let items = screenDetails.map((screen) => ({
      label: screen.label,
      href: screen.path,
      icon: iconMap[screen.icon] || Home,
    }));

    // Ensure Day Care is in the navigation items fallback
    if (!items.find((i) => i.href === "/day-care") && ["admin", "receptionist", "nurse", "doctor", "platform_owner"].includes(userRole || "")) {
      items.push({ label: "Day Care Surgery", href: "/day-care", icon: Activity });
    }

    // Platform Owner only screens
    const platformOwnerScreens = ["/screens", "/tenants"];

    if (userRole !== "platform_owner") {
      items = items.filter((i) => !platformOwnerScreens.includes(i.href));
    }

    // Add Platform Owner screens if not present
    if (userRole === "platform_owner") {
      if (!items.find((i) => i.href === "/screens")) {
        items.push({ label: "Screens", href: "/screens", icon: Monitor });
      }
      if (!items.find((i) => i.href === "/tenants")) {
        items.push({ label: "Tenants", href: "/tenants", icon: Building2 });
      }
      if (!items.find((i) => i.href === "/feature-flags")) {
        items.push({ label: "Feature Flags", href: "/feature-flags", icon: Settings });
      }
    }

    // Admin & Platform Owner screens
    const adminScreens = ["/optometrist-mappings"];
    if (userRole === "admin" || userRole === "platform_owner") {
      if (!items.find((i) => i.href === "/optometrist-mappings")) {
        items.push({ label: "Optometrist Mappings", href: "/optometrist-mappings", icon: LinkIcon });
      }
    }

    return items;
  }, [screenDetails, initialized, loading, userRole]);

  // Filter for ophthalmologist vs regular doctor panel
  const filteredNavItems = useMemo(() => {
    if (userRole !== "doctor") return navItems;

    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    const currentDoctor = doctors.find((d) => d.user_id === userId);
    const isOphthalmologist = currentDoctor?.specialization === "Ophthalmology";

    return navItems.filter((item) => {
      if (item.href === "/optometrist-panel") return isOphthalmologist;
      if (item.href === "/doctor-panel") return !isOphthalmologist;
      return true;
    });
  }, [navItems, userRole, doctors]);

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
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/cura-logo-v2.png`}
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
        {(!initialized || loading) ? (
          <NavLoadingSkeleton />
        ) : (
          filteredNavItems.map((item) => {
            const Icon = item.icon;
            const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
            const active = normalizedPathname === item.href;

            const baseClassName = clsx(
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-700 transition-all hover:bg-sky-50 hover:text-sky-700",
              active ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold shadow-md hover:from-sky-600 hover:to-teal-600 hover:text-white" : ""
            );

            if (!item.href) return null;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={baseClassName}
                onClick={handleNavClick}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })
        )}
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
                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/cura-logo-v2.png`}
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
          {(!initialized || loading) ? (
            <NavLoadingSkeletonCollapsed />
          ) : (
            filteredNavItems.map((item) => {
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

              if (!item.href) return null;

              return (
                <Tooltip key={item.href} content={item.label} side="right">
                  <Link
                    href={item.href}
                    className={iconButtonClass}
                    onClick={handleNavClick}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                </Tooltip>
              );
            })
          )}
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

