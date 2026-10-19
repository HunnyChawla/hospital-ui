"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import { ApiPermissionsManager } from "@/components/permissions/ApiPermissionsManager";

export default function ApiPermissionsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(false);

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
    <div className="flex h-full flex-col space-y-4 p-6 md:p-8">
      <ApiPermissionsManager />
    </div>
  );
}
