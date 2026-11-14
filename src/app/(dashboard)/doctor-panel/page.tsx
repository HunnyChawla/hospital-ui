"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * DoctorPanelPage is deprecated/discarded.
 * Users navigating to this legacy route are automatically redirected
 * to their designated operational panel (optometrist-panel or clinic-panel).
 */
export default function DoctorPanelPage() {
  const router = useRouter();
  const { userPermissions, initialized } = usePermissions();

  useEffect(() => {
    if (initialized) {
      router.replace(userPermissions?.default_screen || "/clinic-panel");
    }
  }, [initialized, userPermissions, router]);

  return null;
}
