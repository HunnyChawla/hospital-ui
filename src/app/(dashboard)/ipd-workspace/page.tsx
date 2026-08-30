"use client";

import React, { Suspense } from "react";
import { IpdWorkspace } from "@/components/ipd/doctor/IpdWorkspace";

export default function IpdWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />
        </div>
      }
    >
      <IpdWorkspace />
    </Suspense>
  );
}
