"use client";

import { useEffect, useState } from "react";
import { VersionInfo } from "@/components/common/VersionModal";

let cachedVersionData: VersionInfo | null = null;

export function useAppVersion() {
  const [versionData, setVersionData] = useState<VersionInfo | null>(cachedVersionData);
  const [loading, setLoading] = useState(!cachedVersionData);

  useEffect(() => {
    if (cachedVersionData) {
      setVersionData(cachedVersionData);
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetch("/version.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch version");
        return res.json();
      })
      .then((data: VersionInfo) => {
        cachedVersionData = data;
        if (isMounted) {
          setVersionData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        // Fallback for development if version.json is not yet built
        const fallback: VersionInfo = {
          service: "hospital-ui",
          version: "2.0.1",
        };
        if (isMounted) {
          setVersionData(fallback);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { versionData, loading };
}
