"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { createPortal } from "react-dom";



export interface DataEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    colorScheme?: "sky" | "emerald" | "amber" | "purple" | "rose" | "blue" | "green" | "violet";
    size?: "md" | "lg" | "xl" | "full";
}

const colorSchemes = {
    sky: {
        header: "from-sky-50 to-sky-100/80",
        headerText: "text-sky-700",
        iconBg: "bg-sky-100",
        border: "border-sky-200",
        shadow: "shadow-sky-200/40",
        closeBtn: "bg-sky-100 hover:bg-sky-200 text-sky-600",
    },
    blue: {
        header: "from-blue-50 to-blue-100/80",
        headerText: "text-blue-700",
        iconBg: "bg-blue-100",
        border: "border-blue-200",
        shadow: "shadow-blue-200/40",
        closeBtn: "bg-blue-100 hover:bg-blue-200 text-blue-600",
    },
    emerald: {
        header: "from-emerald-50 to-emerald-100/80",
        headerText: "text-emerald-700",
        iconBg: "bg-emerald-100",
        border: "border-emerald-200",
        shadow: "shadow-emerald-200/40",
        closeBtn: "bg-emerald-100 hover:bg-emerald-200 text-emerald-600",
    },
    green: {
        header: "from-green-50 to-green-100/80",
        headerText: "text-green-700",
        iconBg: "bg-green-100",
        border: "border-green-200",
        shadow: "shadow-green-200/40",
        closeBtn: "bg-green-100 hover:bg-green-200 text-green-600",
    },
    amber: {
        header: "from-amber-50 to-amber-100/80",
        headerText: "text-amber-700",
        iconBg: "bg-amber-100",
        border: "border-amber-200",
        shadow: "shadow-amber-200/40",
        closeBtn: "bg-amber-100 hover:bg-amber-200 text-amber-600",
    },
    purple: {
        header: "from-purple-50 to-purple-100/80",
        headerText: "text-purple-700",
        iconBg: "bg-purple-100",
        border: "border-purple-200",
        shadow: "shadow-purple-200/40",
        closeBtn: "bg-purple-100 hover:bg-purple-200 text-purple-600",
    },
    rose: {
        header: "from-rose-50 to-rose-100/80",
        headerText: "text-rose-700",
        iconBg: "bg-rose-100",
        border: "border-rose-200",
        shadow: "shadow-rose-200/40",
        closeBtn: "bg-rose-100 hover:bg-rose-200 text-rose-600",
    },
    violet: {
        header: "from-violet-50 to-violet-100/80",
        headerText: "text-violet-700",
        iconBg: "bg-violet-100",
        border: "border-violet-200",
        shadow: "shadow-violet-200/40",
        closeBtn: "bg-violet-100 hover:bg-violet-200 text-violet-600",
    },
};

const sizeClasses = {
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-[95vw]",
};

export function DataEditModal({
    isOpen,
    onClose,
    title,
    icon,
    children,
    colorScheme = "sky",
    size = "lg",
}: DataEditModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const colors = colorSchemes[colorScheme];
    const [portalTarget, setPortalTarget] = useState<Element | null>(null);

    // Determine portal target (fullscreen element or body)
    useEffect(() => {
        if (typeof window === "undefined") return;

        const updatePortalTarget = () => {
            // Check if we're in fullscreen mode
            const fullscreenElement = document.fullscreenElement;
            setPortalTarget(fullscreenElement || document.body);
        };

        updatePortalTarget();

        // Listen for fullscreen changes
        document.addEventListener("fullscreenchange", updatePortalTarget);
        return () => {
            document.removeEventListener("fullscreenchange", updatePortalTarget);
        };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    // Focus trap
    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                tabIndex={-1}
                className={clsx(
                    "relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden",
                    "animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300",
                    sizeClasses[size],
                    colors.shadow,
                    "max-h-[90vh] flex flex-col"
                )}
            >
                {/* Header */}
                <div
                    className={clsx(
                        "flex items-center justify-between px-6 py-4 border-b",
                        "bg-gradient-to-r",
                        colors.header,
                        colors.border
                    )}
                >
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className={clsx("p-2 rounded-lg", colors.iconBg, colors.headerText)}>
                                {icon}
                            </div>
                        )}
                        <h2 id="modal-title" className={clsx("text-lg font-bold", colors.headerText)}>
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={clsx("p-2 rounded-lg transition-colors", colors.closeBtn)}
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {children}
                </div>
            </div>
        </div>
    );

    // Use portal to render modal - render to fullscreen element if active, otherwise body
    if (typeof window !== "undefined" && portalTarget) {
        return createPortal(modalContent, portalTarget);
    }

    return null;
}
