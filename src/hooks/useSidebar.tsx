"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "sidebar_collapsed";
const MOBILE_BREAKPOINT = 1024; // lg: breakpoint
const RESIZE_DEBOUNCE_MS = 300;

interface SidebarContextType {
  // State
  isDesktopCollapsed: boolean;
  isMobileMenuOpen: boolean;
  isMobile: boolean;

  // Actions
  toggleDesktopSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // Initialize desktop collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsDesktopCollapsed(stored === "true");
      }
    } catch (error) {
      console.error("Failed to load sidebar state from localStorage:", error);
    }
  }, []);

  // Initialize isMobile state and listen for window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    checkMobile();

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkMobile, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen, isMobile]);

  // Close mobile drawer on navigation (pathname change)
  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close mobile drawer on hash change
  useEffect(() => {
    const handleHashChange = () => {
      if (isMobile && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [isMobile, isMobileMenuOpen]);

  // Toggle desktop sidebar and persist to localStorage
  const toggleDesktopSidebar = useCallback(() => {
    setIsDesktopCollapsed((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(newValue));
      } catch (error) {
        console.error("Failed to save sidebar state to localStorage:", error);
      }
      return newValue;
    });
  }, []);

  // Toggle mobile drawer
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  // Close mobile drawer
  const closeMobileSidebar = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC closes mobile drawer
      if (e.key === "Escape" && isMobileMenuOpen && isMobile) {
        setIsMobileMenuOpen(false);
      }

      // Ctrl+B or Cmd+B toggles desktop sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b" && !isMobile) {
        e.preventDefault();
        toggleDesktopSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isMobileMenuOpen, toggleDesktopSidebar]);

  const value: SidebarContextType = {
    isDesktopCollapsed,
    isMobileMenuOpen,
    isMobile,
    toggleDesktopSidebar,
    toggleMobileSidebar,
    closeMobileSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextType {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
