"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import { ScreenList } from "@/components/screens/ScreenList";

export default function ScreensPage() {
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
    <div className="flex h-full flex-col space-y-4 p-8">
      <ScreenList />
    </div>
  );
}
