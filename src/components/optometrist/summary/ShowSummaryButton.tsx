"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { VisitSummary } from "./VisitSummary";
import { prescriptionDataApi } from "@/services/prescriptionDataApi";
import { currentSpecsApi } from "@/services/currentSpecsApi";
import { handleError } from "@/utils/errorHandler";

interface ShowSummaryButtonProps {
  patientId: string;
  patientName: string;
  patientUhid?: string;
  visitId?: string;
}

export function ShowSummaryButton({
  patientId,
  patientName,
  patientUhid,
  visitId,
}: ShowSummaryButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  const handleShowSummary = async () => {
    if (!patientId) {
      handleError(null, {
        defaultMessage: "No patient selected",
      });
      return;
    }

    setIsLoading(true);
    try {
      const [data, currentSpecsRes] = await Promise.all([
        prescriptionDataApi.getPrescriptionData(patientId, visitId),
        visitId ? currentSpecsApi.list({ visit_id: visitId }) : Promise.resolve({ items: [] })
      ]);

      setSummaryData({
        ...data,
        current_specs: currentSpecsRes.items || []
      });
      setShowSummary(true);
    } catch (error: any) {
      handleError(error, {
        defaultMessage: "Failed to load visit summary",
        logError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleShowSummary}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:from-sky-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Show Summary
          </>
        )}
      </button>

      {showSummary && summaryData && (
        <VisitSummary
          data={summaryData}
          patientName={patientName}
          patientUhid={patientUhid}
          onClose={() => setShowSummary(false)}
        />
      )}
    </>
  );
}
