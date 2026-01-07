"use client";

import { useState, useRef, useEffect } from "react";
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
        <div ref={containerRef} className={`${isFullScreen ? "fixed inset-0 z-[9999] bg-slate-50" : "flex-1"} w-full h-full`}>
            <TVQueueDisplay
                isFullScreen={isFullScreen}
                onFullScreenToggle={toggleFullScreen}
            />
        </div>
    );
}
