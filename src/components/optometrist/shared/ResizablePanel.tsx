"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";

interface ResizablePanelProps {
    leftContent: React.ReactNode;
    rightContent: React.ReactNode;
    bottomContent?: React.ReactNode; // Optional full-width bottom section
    defaultLeftWidthPercent?: number; // percentage (e.g., 65 for ~2/3)
    minLeftWidthPercent?: number; // percentage minimum
    maxLeftWidthPercent?: number; // percentage maximum
    storageKey?: string; // localStorage key for persistence
    className?: string;
}

export function ResizablePanel({
    leftContent,
    rightContent,
    bottomContent,
    defaultLeftWidthPercent = 65,
    minLeftWidthPercent = 35,
    maxLeftWidthPercent = 75,
    storageKey,
    className,
}: ResizablePanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [leftWidthPercent, setLeftWidthPercent] = useState(defaultLeftWidthPercent);
    const [isDragging, setIsDragging] = useState(false);
    const [isCompact, setIsCompact] = useState(false);

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

    // Use ResizeObserver on container to check actual container space rather than window width
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // If container is narrower than 768px, stack vertically for comfortable touch and reading
                setIsCompact(entry.contentRect.width < 768);
            }
        });

        observer.observe(el);
        return () => observer.disconnect();
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

    const handleTouchStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleMove = useCallback(
        (clientX: number) => {
            if (!isDragging || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width;
            if (containerWidth <= 0) return;

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

    return (
        <div ref={containerRef} className={clsx("flex flex-col gap-3 w-full min-w-0", className)}>
            {isCompact ? (
                // Compact / stacked layout on narrow screens (< 768px)
                <div className="flex flex-col gap-3.5 w-full min-w-0">
                    <div className="w-full min-w-0">{leftContent}</div>
                    <div className="w-full min-w-0">{rightContent}</div>
                </div>
            ) : (
                // Side-by-side resizable horizontal layout on desktop/tablets (>= 768px)
                <div className="flex gap-0 relative items-stretch w-full min-w-0">
                    {/* Left Panel */}
                    <div
                        style={{ width: `${leftWidthPercent}%` }}
                        className="min-w-0 transition-none pr-1.5"
                    >
                        {leftContent}
                    </div>

                    {/* Drag Handle */}
                    <div
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize panel columns"
                        tabIndex={0}
                        className={clsx(
                            "relative flex-shrink-0 w-3 group cursor-col-resize z-10",
                            "flex items-center justify-center select-none",
                            isDragging && "bg-sky-50"
                        )}
                    >
                        {/* Visual divider line */}
                        <div
                            className={clsx(
                                "h-full w-1 rounded-full transition-colors duration-150",
                                isDragging
                                    ? "bg-sky-500"
                                    : "bg-slate-200 group-hover:bg-slate-400"
                            )}
                        />
                    </div>

                    {/* Right Panel */}
                    <div
                        style={{ width: `${100 - leftWidthPercent}%` }}
                        className="min-w-0 transition-none pl-1.5"
                    >
                        {rightContent}
                    </div>
                </div>
            )}

            {/* Bottom Content (full width) */}
            {bottomContent && <div className="w-full min-w-0">{bottomContent}</div>}
        </div>
    );
}
