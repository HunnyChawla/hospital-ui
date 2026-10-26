"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import { SessionPoliciesManager } from "@/components/session-policies/SessionPoliciesManager";

export default function SessionPoliciesPage() {
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
      <SessionPoliciesManager />
    </div>
  );
}
