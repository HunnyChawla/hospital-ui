"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // In development, explicitly unregister any existing service workers
    // and clear caches to prevent interference from previous production builds.
    if (process.env.NODE_ENV === "development") {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log("[Service Worker] Unregistered successfully in dev mode");
                window.location.reload();
              }
            });
          }
        });

        // Also clear caches
        if ("caches" in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
        }
      }
      return;
    }

    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      // Only register in production
      if (process.env.NODE_ENV === "production") {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        // Register service worker
        navigator.serviceWorker
          .register(`${basePath}/sw.js`, { scope: `${basePath}/` || "/" })
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

