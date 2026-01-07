"use client";

import { useState } from "react";
import { TVQueueDisplay } from "@/components/queue/TVQueueDisplay";

export default function TVQueueDisplayPage() {
    const [isFullScreen, setIsFullScreen] = useState(false);

    return (
        <div className={isFullScreen ? "fixed inset-0 z-[9999] bg-white" : ""}>
            <TVQueueDisplay
                isFullScreen={isFullScreen}
                onFullScreenToggle={() => setIsFullScreen(!isFullScreen)}
            />
        </div>
    );
}
