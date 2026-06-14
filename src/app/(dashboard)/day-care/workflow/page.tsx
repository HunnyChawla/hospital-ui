"use client";

import React, { Suspense } from "react";
import { DayCareWorkflowWizard } from "@/components/day-care/DayCareWorkflowWizard";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function WorkflowPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p>No visit ID provided.</p>
      </div>
    );
  }

  return <DayCareWorkflowWizard visitId={id} />;
}

export default function DayCareWorkflowPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-sky-600 animate-spin" />
        </div>
      }>
        <WorkflowPageContent />
      </Suspense>
    </div>
  );
}
