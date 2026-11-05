"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useTenant } from "@/hooks/useTenant";
import { useSidebar } from "@/hooks/useSidebar";
import { Tooltip } from "@/components/common/Tooltip";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { usePermissions } from "@/hooks/usePermissions";
import { useFeatureFlags, useAbdmFlags } from "@/hooks/useFeatureFlags";
import { resolvePanelPathForUser } from "@/utils/panelRouting";
import { labBookingsApi } from "@/services/labBookingsApi";
import { getTodayDateLocal, getPastDateLocal } from "@/utils/format";
import {
  buildNavigationGroups,
  ResolvedNavGroup,
  NavItemConfig,
} from "@/config/navigationGroups";

// Loading skeleton for expanded navigation items
const NavLoadingSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 animate-pulse"
      >
        <div className="h-5 w-5 rounded bg-slate-200" />
        <div className="h-4 w-28 rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

// Loading skeleton for collapsed sidebar
const NavLoadingSkeletonCollapsed = () => (
  <div className="space-y-1.5">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="flex w-full h-8 sm:h-9 md:h-10 items-center justify-center rounded-xl animate-pulse"
      >
        <div className="h-4 w-4 sm:h-5 sm:w-5 rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

interface CollapsedGroupFlyoutProps {
  group: ResolvedNavGroup;
  pathname: string;
  onNavClick: () => void;
}

/**
 * Floating Flyout Popover for collapsed sidebar
 */
function CollapsedGroupFlyout({ group, pathname, onNavClick }: CollapsedGroupFlyoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAnyChildActive = group.items.some((i) => {
    const normalized = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
    return normalized === i.href;
  });

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    // Clamp top to avoid rendering off-screen
    const top = Math.min(rect.top, window.innerHeight - 320);
    setCoords({ top: Math.max(10, top), left: rect.right + 10 });
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const GroupIcon = group.icon;

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        aria-label={group.label}
        className={clsx(
          "flex w-full h-8 sm:h-9 md:h-10 items-center justify-center rounded-xl transition-all relative",
          isAnyChildActive
            ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md"
            : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
        )}
      >
        <GroupIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        {group.totalBadge && group.totalBadge > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white">
            {group.totalBadge}
          </span>
        ) : null}
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[9999] w-56 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-slate-100 mb-1">
            <GroupIcon className="h-4 w-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {group.label}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-0.5 scrollbar-thin">
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              const normalized = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
              const isActive = normalized === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setIsOpen(false);
                    onNavClick();
                  }}
                  className={clsx(
                    "flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-xs transition",
                    isActive
                      ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold shadow-xs"
                      : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span
                      className={clsx(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                        isActive ? "bg-white text-teal-600" : "bg-rose-500 text-white"
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { hospitalName } = useTenant();
  const {
    isDesktopCollapsed,
    isMobileMenuOpen,
    isMobile,
    closeMobileSidebar,
    toggleDesktopSidebar,
  } = useSidebar();
  const dispatch = useAppDispatch();
  const doctors = useAppSelector((state) => state.doctors.list);
  const { screenDetails, allowedScreens, userRole, initialized, loading } = usePermissions();
  const { enabled: abdmEnabled } = useAbdmFlags();
  const [pendingCount, setPendingCount] = useState(0);

  // Group accordion open/close state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (userRole === "doctor" && doctors.length === 0) {
      dispatch(fetchDoctors());
    }
  }, [userRole, doctors.length, dispatch]);

  // Panel filter: each doctor/examiner sees exactly one panel entry
  const { featureFlags: clinicPanelFlags } = useFeatureFlags("clinic_panel");
  const clinicPanelEnabled = (clinicPanelFlags?.enabled as boolean) ?? false;

  const resolvedDoctorPanelPath = useMemo(() => {
    if (userRole !== "doctor" && userRole !== "examiner" && userRole !== "optometrist") {
      return null;
    }
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    const currentDoctor = doctors.find((d) => d.user_id === userId);
    return resolvePanelPathForUser(userRole, currentDoctor?.specialization, clinicPanelEnabled);
  }, [userRole, doctors, clinicPanelEnabled]);

  // Build navigation groups from permissions
  const navigationData = useMemo(() => {
    if (!initialized || loading) {
      return { standaloneDashboard: null, groups: [] };
    }

    return buildNavigationGroups({
      screenDetails,
      userRole,
      allowedScreens,
      resolvedDoctorPanelPath,
      pendingLabCount: pendingCount,
      abdmEnabled,
    });
  }, [
    initialized,
    loading,
    screenDetails,
    userRole,
    allowedScreens,
    resolvedDoctorPanelPath,
    pendingCount,
    abdmEnabled,
  ]);

  // Fetch pending lab count if lab bookings screen is enabled
  const hasLabBookings = useMemo(() => {
    return (
      allowedScreens.includes("/lab-bookings") ||
      screenDetails.some((s) => s.path === "/lab-bookings")
    );
  }, [allowedScreens, screenDetails]);

  useEffect(() => {
    if (!hasLabBookings || userRole === "platform_owner") return;

    const fetchPendingCount = async () => {
      try {
        const today = getTodayDateLocal();
        const res = await labBookingsApi.getPatientsWithPendingTests({
          start_date: getPastDateLocal(2),
          end_date: today,
        });
        const pendingVisitsCount = (res.items || []).filter(
          (item) => item.pending_test_count > 0
        ).length;
        setPendingCount(pendingVisitsCount);
      } catch (error) {
        console.error("Failed to fetch pending lab tests count in sidebar", error);
      }
    };

    fetchPendingCount();

    const handleBookingChanged = () => {
      fetchPendingCount();
    };
    window.addEventListener("lab:booking:created", handleBookingChanged);
    window.addEventListener("lab:booking:cancelled", handleBookingChanged);

    return () => {
      window.removeEventListener("lab:booking:created", handleBookingChanged);
      window.removeEventListener("lab:booking:cancelled", handleBookingChanged);
    };
  }, [hasLabBookings, userRole]);

  // Initialize and persist group expansion states
  useEffect(() => {
    if (typeof window === "undefined") return;

    let savedState: Record<string, boolean> = {};
    try {
      const stored = localStorage.getItem("cura_sidebar_groups");
      if (stored) {
        savedState = JSON.parse(stored);
      }
    } catch {
      savedState = {};
    }

    // Auto-expand group that contains active route
    const normalizedPath =
      pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

    const initialMap: Record<string, boolean> = { ...savedState };

    for (const group of navigationData.groups) {
      if (!group.isStandalone) {
        const hasActiveChild = group.items.some((i) => i.href === normalizedPath);
        if (hasActiveChild) {
          initialMap[group.id] = true;
        } else if (initialMap[group.id] === undefined) {
          // Default: Platform Owner groups open; for others, default first group open
          initialMap[group.id] = userRole === "platform_owner";
        }
      }
    }

    setExpandedGroups(initialMap);
  }, [pathname, navigationData.groups, userRole]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const updated = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem("cura_sidebar_groups", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Handle navigation click - close mobile drawer if on mobile
  const handleNavClick = () => {
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  const displayName = userRole === "platform_owner" ? "Platform Admin" : hospitalName;

  // Render navigation content (shared between expanded desktop and mobile)
  const renderSidebarContent = (showCollapseButton: boolean = false) => (
    <>
      {/* Header with Logo */}
      <div className="mb-6 flex flex-shrink-0 items-center justify-between">
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
            <p className="text-lg font-semibold text-slate-900 truncate max-w-[150px]">
              {displayName}
            </p>
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

      {/* Navigation Groups List */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-hide min-h-0 pr-1">
        {!initialized || loading ? (
          <NavLoadingSkeleton />
        ) : (
          <>
            {/* Standalone Dashboard Link (if allowed) */}
            {navigationData.standaloneDashboard && (
              <div className="mb-2">
                {(() => {
                  const dash = navigationData.standaloneDashboard;
                  const DashIcon = dash.icon;
                  const normalizedPathname =
                    pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
                  const active = normalizedPathname === dash.href;

                  return (
                    <Link
                      href={dash.href}
                      className={clsx(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-700 transition-all font-medium hover:bg-sky-50 hover:text-sky-700",
                        active
                          ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold shadow-md hover:from-sky-600 hover:to-teal-600 hover:text-white"
                          : ""
                      )}
                      onClick={handleNavClick}
                    >
                      <DashIcon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 text-left">{dash.label}</span>
                    </Link>
                  );
                })()}
              </div>
            )}

            {/* Resolved Navigation Groups */}
            {navigationData.groups.map((group) => {
              const normalizedPathname =
                pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

              // If group is single-item standalone
              if (group.isStandalone && group.standaloneItem) {
                const item = group.standaloneItem;
                const ItemIcon = item.icon;
                const active = normalizedPathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-700 transition-all font-medium hover:bg-sky-50 hover:text-sky-700",
                      active
                        ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold shadow-md hover:from-sky-600 hover:to-teal-600 hover:text-white"
                        : ""
                    )}
                    onClick={handleNavClick}
                  >
                    <ItemIcon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={clsx(
                          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-xs",
                          active ? "bg-white text-teal-600" : "bg-rose-500 text-white"
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              }

              // Multi-Item Collapsible Accordion Group
              const isExpanded = Boolean(expandedGroups[group.id]);
              const GroupIcon = group.icon;
              const hasActiveChild = group.items.some((i) => normalizedPathname === i.href);

              return (
                <div key={group.id} className="pt-0.5">
                  {/* Group Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                      hasActiveChild
                        ? "text-sky-700 bg-sky-50/70"
                        : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <GroupIcon
                        className={clsx(
                          "h-4 w-4 shrink-0 transition-colors",
                          hasActiveChild ? "text-sky-600" : "text-slate-500"
                        )}
                      />
                      <span className="truncate text-xs font-bold uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isExpanded && group.totalBadge && group.totalBadge > 0 ? (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs">
                          {group.totalBadge}
                        </span>
                      ) : null}
                      <ChevronDown
                        className={clsx(
                          "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                          isExpanded ? "rotate-0" : "-rotate-90"
                        )}
                      />
                    </div>
                  </button>

                  {/* Collapsible Children List */}
                  {isExpanded && (
                    <div className="ml-4 pl-2.5 border-l border-slate-200/90 space-y-0.5 py-1 transition-all">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = normalizedPathname === item.href;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all",
                              active
                                ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold shadow-xs hover:text-white"
                                : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                            )}
                            onClick={handleNavClick}
                          >
                            <ItemIcon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {item.badge ? (
                              <span
                                className={clsx(
                                  "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-xs",
                                  active ? "bg-white text-teal-600" : "bg-rose-500 text-white"
                                )}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Systems Status Live Banner */}
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

  // Render collapsed sidebar (icons only with flyouts on hover)
  const renderCollapsedIcons = () => {
    const normalizedPathname =
      pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

    return (
      <>
        {/* Expand Button */}
        <div className="mb-2 flex flex-shrink-0 justify-center">
          <Tooltip content="Expand sidebar" side="right">
            <button
              onClick={toggleDesktopSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        {/* Logo Icon Only */}
        <div className="mb-2 flex flex-shrink-0 items-center justify-center sm:mb-3 md:mb-4">
          <Tooltip content={displayName} side="right">
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

        {/* Navigation Icons List */}
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide min-h-0">
          {!initialized || loading ? (
            <NavLoadingSkeletonCollapsed />
          ) : (
            <>
              {/* Standalone Dashboard Icon */}
              {navigationData.standaloneDashboard && (
                <Tooltip content={navigationData.standaloneDashboard.label} side="right">
                  <Link
                    href={navigationData.standaloneDashboard.href}
                    className={clsx(
                      "flex w-full h-8 sm:h-9 md:h-10 items-center justify-center rounded-xl transition-all relative",
                      normalizedPathname === navigationData.standaloneDashboard.href
                        ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md"
                        : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    )}
                    onClick={handleNavClick}
                  >
                    {(() => {
                      const DashIcon = navigationData.standaloneDashboard.icon;
                      return <DashIcon className="h-4 w-4 sm:h-5 sm:w-5" />;
                    })()}
                  </Link>
                </Tooltip>
              )}

              {/* Groups as Icons / Flyouts */}
              {navigationData.groups.map((group) => {
                // If single-item standalone: direct icon link with Tooltip
                if (group.isStandalone && group.standaloneItem) {
                  const item = group.standaloneItem;
                  const ItemIcon = item.icon;
                  const active = normalizedPathname === item.href;

                  return (
                    <Tooltip key={item.href} content={item.label} side="right">
                      <Link
                        href={item.href}
                        className={clsx(
                          "flex w-full h-8 sm:h-9 md:h-10 items-center justify-center rounded-xl transition-all relative",
                          active
                            ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md"
                            : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                        )}
                        onClick={handleNavClick}
                      >
                        <ItemIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        {item.badge ? (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </Tooltip>
                  );
                }

                // Multi-Item Group: CollapsedGroupFlyout popover
                return (
                  <CollapsedGroupFlyout
                    key={group.id}
                    group={group}
                    pathname={pathname}
                    onNavClick={handleNavClick}
                  />
                );
              })}
            </>
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
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          "glass fixed left-0 top-0 hidden h-screen flex-shrink-0 flex-col text-sm text-slate-700 transition-all duration-300 lg:flex overflow-hidden z-30",
          isDesktopCollapsed ? "w-16 px-2 py-6" : "w-64 px-5 py-6"
        )}
      >
        {isDesktopCollapsed ? renderCollapsedIcons() : renderSidebarContent(true)}
      </aside>

      {/* Mobile Drawer */}
      <aside
        className={clsx(
          "glass fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-shrink-0 flex-col px-5 py-6 text-sm text-slate-700 overflow-hidden",
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
