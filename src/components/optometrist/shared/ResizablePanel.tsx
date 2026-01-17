"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";

interface ResizablePanelProps {
    leftContent: React.ReactNode;
    rightContent: React.ReactNode;
    bottomContent?: React.ReactNode; // Optional full-width bottom section
    defaultLeftWidthPercent?: number; // percentage (e.g., 67 for 2/3)
    minLeftWidthPercent?: number; // percentage minimum
    maxLeftWidthPercent?: number; // percentage maximum
    storageKey?: string; // localStorage key for persistence
    className?: string;
}

export function ResizablePanel({
    leftContent,
    rightContent,
    bottomContent,
    defaultLeftWidthPercent = 67,
    minLeftWidthPercent = 40,
    maxLeftWidthPercent = 85,
    storageKey,
    className,
}: ResizablePanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [leftWidthPercent, setLeftWidthPercent] = useState(defaultLeftWidthPercent);
    const [isDragging, setIsDragging] = useState(false);
    const [isLargeScreen, setIsLargeScreen] = useState(true);

    // Load saved width from localStorage on mount
    useEffect(() => {
        if (storageKey && typeof window !== "undefined") {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = parseFloat(saved);
                if (!isNaN(parsed) && parsed >= minLeftWidthPercent && parsed <= maxLeftWidthPercent) {
                    setLeftWidthPercent(parsed);
                }
            }
        }
    }, [storageKey, minLeftWidthPercent, maxLeftWidthPercent]);

    // Check screen size for responsive behavior
    useEffect(() => {
        const checkScreenSize = () => {
            setIsLargeScreen(window.innerWidth >= 1024); // lg breakpoint
        };

        checkScreenSize();
        window.addEventListener("resize", checkScreenSize);
        return () => window.removeEventListener("resize", checkScreenSize);
    }, []);

    // Save width to localStorage when it changes
    useEffect(() => {
        if (storageKey && typeof window !== "undefined" && !isDragging) {
            localStorage.setItem(storageKey, leftWidthPercent.toString());
        }
    }, [leftWidthPercent, storageKey, isDragging]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setIsDragging(true);
    }, []);

    const handleMove = useCallback(
        (clientX: number) => {
            if (!isDragging || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const offsetX = clientX - containerRect.left;
            const newPercent = (offsetX / containerWidth) * 100;

            // Clamp within min/max bounds
            const clampedPercent = Math.min(
                maxLeftWidthPercent,
                Math.max(minLeftWidthPercent, newPercent)
            );

            setLeftWidthPercent(clampedPercent);
        },
        [isDragging, minLeftWidthPercent, maxLeftWidthPercent]
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            handleMove(e.clientX);
        },
        [handleMove]
    );

    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX);
            }
        },
        [handleMove]
    );

    const handleEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add/remove global event listeners for drag
    useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleEnd);
            document.addEventListener("touchmove", handleTouchMove);
            document.addEventListener("touchend", handleEnd);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        } else {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleEnd);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleEnd);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleEnd);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleEnd);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

    // Mobile/small screen layout - stacked vertically
    if (!isLargeScreen) {
        return (
            <div className={clsx("flex flex-col gap-4", className)}>
                <div>{leftContent}</div>
                <div>{rightContent}</div>
                {bottomContent && <div>{bottomContent}</div>}
            </div>
        );
    }

    // Desktop layout - resizable horizontal panels
    return (
        <div className={clsx("flex flex-col gap-4 sm:gap-6", className)}>
            <div
                ref={containerRef}
                className="flex gap-0 animate-in fade-in slide-in-from-bottom-2 duration-500 relative"
            >
                {/* Left Panel */}
                <div
                    style={{ width: `${leftWidthPercent}%` }}
                    className="min-w-0 transition-none"
                >
                    {leftContent}
                </div>

                {/* Drag Handle */}
                <div
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className={clsx(
                        "relative flex-shrink-0 w-4 group cursor-col-resize z-10",
                        "flex items-center justify-center",
                        isDragging && "bg-sky-100/50"
                    )}
                >
                    {/* Visual drag indicator */}
                    <div
                        className={clsx(
                            "absolute inset-y-0 w-1 rounded-full transition-all duration-200",
                            "bg-slate-200 group-hover:bg-sky-400 group-hover:w-1.5",
                            isDragging && "bg-sky-500 w-1.5 shadow-lg shadow-sky-500/30"
                        )}
                    />
                    {/* Grip dots */}
                    <div
                        className={clsx(
                            "absolute flex flex-col gap-1 pointer-events-none",
                            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                            isDragging && "opacity-100"
                        )}
                    >
                        <div className="w-1 h-1 rounded-full bg-sky-500" />
                        <div className="w-1 h-1 rounded-full bg-sky-500" />
                        <div className="w-1 h-1 rounded-full bg-sky-500" />
                    </div>
                </div>

                {/* Right Panel */}
                <div
                    style={{ width: `${100 - leftWidthPercent}%` }}
                    className="min-w-0 transition-none"
                >
                    {rightContent}
                </div>
            </div>

            {/* Bottom Content (full width) */}
            {bottomContent && <div>{bottomContent}</div>}
        </div>
    );
}
