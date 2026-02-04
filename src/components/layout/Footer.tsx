"use client";

import React from "react";
import { useSidebar } from "@/hooks/useSidebar";
import clsx from "clsx";

interface FooterProps {
    noSidebar?: boolean;
    className?: string;
    isFixed?: boolean;
}

export const Footer = ({ noSidebar = false, className, isFixed = true }: FooterProps) => {
    const currentYear = new Date().getFullYear();
    const { isDesktopCollapsed } = useSidebar();

    return (
        <footer className={clsx(
            className,
            isFixed && "fixed bottom-0 right-0 z-40 transition-all duration-300 ease-in-out bg-white/60 backdrop-blur-md border-t border-slate-200/50",
            isFixed && (noSidebar ? "left-0" : {
                "left-0 lg:left-16": isDesktopCollapsed,
                "left-0 lg:left-64": !isDesktopCollapsed,
            }),
            !isFixed && "w-full py-4 px-6 border-t border-slate-200/50 bg-white/60 backdrop-blur-md",
            "flex items-center justify-center"
        )}>
            <div className="flex w-full max-w-7xl items-center justify-between gap-4">
                <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">Technesian</span>
                        <span className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent font-black text-sm sm:text-base uppercase tracking-tighter">
                            Cura
                        </span>
                    </div>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="text-[10px] sm:text-xs text-slate-500 font-semibold italic tracking-tight">
                        Revolutionizing Hospital Management
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-0.5">
                        <p className="text-[10px] sm:text-xs text-slate-400">
                            © {currentYear} Technesian. All rights reserved.
                        </p>
                        <a
                            href="https://www.technesian.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] sm:text-[10px] text-sky-600 hover:text-sky-700 font-medium hover:underline transition-colors"
                        >
                            www.technesian.com
                        </a>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">v2.0</span>
                </div>
            </div>
        </footer>
    );
};
