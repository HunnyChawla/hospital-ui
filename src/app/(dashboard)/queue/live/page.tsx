"use client";

import { useState } from "react";
import { LiveQueueBoard } from "@/components/queue/LiveQueueBoard";
import { FullScreenQueue } from "@/components/queue/FullScreenQueue";

export default function LiveQueuePage() {
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (isFullScreen) {
    return <FullScreenQueue onClose={() => setIsFullScreen(false)} />;
  }

  return (
    <div>
      <LiveQueueBoard onFullScreen={() => setIsFullScreen(true)} />
    </div>
  );
}

