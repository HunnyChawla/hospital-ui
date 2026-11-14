"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Tv } from "lucide-react";
import { TVQueueDisplay } from "@/components/queue/TVQueueDisplay";

export default function TVQueueDisplayPage() {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };

        const events = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];

        events.forEach(event => {
            document.addEventListener(event, handleFullScreenChange);
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleFullScreenChange);
            });
        };
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch((err: any) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                // Fallback to state-only fullscreen if native fails
                setIsFullScreen(true);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <div ref={containerRef} className={`${isFullScreen ? "fixed inset-0 z-[9999] bg-slate-50" : "flex-1 flex flex-col"} w-full h-full`}>
            {!isFullScreen && (
                <div className="bg-sky-50/90 border-b border-sky-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-sky-900">
                    <div className="flex items-center gap-2">
                        <Tv className="h-4 w-4 text-sky-600 shrink-0" />
                        <span>Pair a physical Smart TV in the waiting room using its on-screen pairing code.</span>
                    </div>
                    <Link
                        href="/tv-login"
                        className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900 bg-white px-3 py-1 rounded-lg border border-sky-200 shadow-xs transition hover:bg-sky-50"
                    >
                        <span>Connect &amp; Setup TV</span> &rarr;
                    </Link>
                </div>
            )}
            <div className="flex-1 w-full h-full">
                <TVQueueDisplay
                    isFullScreen={isFullScreen}
                    onFullScreenToggle={toggleFullScreen}
                />
            </div>
        </div>
    );
}
