"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import { FeatureFlagManagement } from "@/components/feature-flags/FeatureFlagManagement";

export default function FeatureFlagsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isPlatformOwner()) {
      router.replace("/");
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return null;
  }

  return (
    <div className="p-6">
      <FeatureFlagManagement />
    </div>
  );
}
