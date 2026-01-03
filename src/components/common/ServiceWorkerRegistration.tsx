"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Disable PWA/service worker in development mode
    if (process.env.NODE_ENV === "development") {
      return;
    }

    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      // Only register in production
      if (process.env.NODE_ENV === "production") {
        // Register service worker
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            console.log("Service Worker registered:", registration);
            
            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60000); // Check every minute
          })
          .catch((error) => {
            // Silently fail - service worker is optional
            console.log("Service Worker registration failed (non-critical):", error);
          });

        // Handle service worker updates
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      }
    }
  }, []);

  return null;
}

