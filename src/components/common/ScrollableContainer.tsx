"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ScrollableContainerProps {
  children: React.ReactNode;
  /**
   * Tailwind class for the outer wrapper container.
   */
  className?: string;
  /**
   * Tailwind class for the inner scrollable container that wraps children.
   */
  contentClassName?: string;
  /**
   * Distance in pixels to scroll on each arrow button click (default: 240).
   */
  scrollAmount?: number;
  /**
   * When true, arrow buttons will only appear in the DOM if children overflow the container.
   * When false (default), arrow buttons are always rendered and disabled/faded when bounds are reached.
   */
  hideButtonsWhenNoOverflow?: boolean;
  /**
   * Custom class applied to both left and right arrow buttons.
   */
  buttonClassName?: string;
  /**
   * Custom class applied only to the left arrow button.
   */
  leftButtonClassName?: string;
  /**
   * Custom class applied only to the right arrow button.
   */
  rightButtonClassName?: string;
  /**
   * Whether to display scroll buttons (default: true).
   */
  showScrollButtons?: boolean;
}

/**
 * Generic horizontal scroll container with smooth left/right arrow navigation,
 * mouse-wheel horizontal scrolling, and hidden scrollbars.
 */
export function ScrollableContainer({
  children,
  className = "flex items-center gap-1 sm:gap-1.5",
  contentClassName = "flex flex-1 items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide min-w-0",
  scrollAmount = 240,
  hideButtonsWhenNoOverflow = false,
  buttonClassName = "",
  leftButtonClassName = "",
  rightButtonClassName = "",
  showScrollButtons = true,
}: ScrollableContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const isOverflowing = scrollWidth > clientWidth + 2;
    setHasOverflow(isOverflowing);
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        checkScroll();
      });
      resizeObserver.observe(el);
      Array.from(el.children).forEach((child) => resizeObserver?.observe(child));
    }

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      resizeObserver?.disconnect();
    };
  }, [checkScroll]);

  // Re-check when children change or mount
  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    return () => clearTimeout(timer);
  }, [children, checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const defaultButtonClass =
    "flex h-7.5 sm:h-8 w-7.5 sm:w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white transition cursor-pointer shadow-2xs";

  const shouldRenderButtons = showScrollButtons && (!hideButtonsWhenNoOverflow || hasOverflow);

  return (
    <div className={className}>
      {shouldRenderButtons && (
        <button
          type="button"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className={`${defaultButtonClass} ${buttonClassName} ${leftButtonClassName} ${
            !canScrollLeft
              ? "opacity-25 cursor-not-allowed text-slate-300 pointer-events-none"
              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
          }`}
          title="Scroll left"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      <div
        ref={containerRef}
        onWheel={(e) => {
          if (e.deltaY !== 0 && containerRef.current) {
            containerRef.current.scrollLeft += e.deltaY;
          }
        }}
        className={contentClassName}
      >
        {children}
      </div>

      {shouldRenderButtons && (
        <button
          type="button"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className={`${defaultButtonClass} ${buttonClassName} ${rightButtonClassName} ${
            !canScrollRight
              ? "opacity-25 cursor-not-allowed text-slate-300 pointer-events-none"
              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
          }`}
          title="Scroll right"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
