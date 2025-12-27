"use client";

import { useState } from "react";
import { MRDDocument, MRDDocumentCategory } from "@/services/mrdApi";
import { MRDUploadForm } from "./MRDUploadForm";
import { MRDFilters } from "./MRDFilters";
import { MRDDocumentList } from "./MRDDocumentList";
import { MRDDocumentModal } from "./MRDDocumentModal";
import { Upload, FileText, List } from "lucide-react";

interface MRDPanelProps {
  defaultPatientId?: string;
  defaultAdmissionId?: string;
  defaultLabBookingId?: string;
  defaultVisitId?: string;
}

export function MRDPanel({
  defaultPatientId,
  defaultAdmissionId,
  defaultLabBookingId,
  defaultVisitId,
}: MRDPanelProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "list">("list");
  const [patientId, setPatientId] = useState<string | undefined>(defaultPatientId);
  const [category, setCategory] = useState<MRDDocumentCategory | undefined>();
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab("list");
  };

  const handleDocumentClick = (document: MRDDocument) => {
    setSelectedDocumentId(document.id);
  };

  const handleDocumentEdit = (document: MRDDocument) => {
    setSelectedDocumentId(document.id);
  };

  const handleDocumentDelete = () => {
    setSelectedDocumentId(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDocumentUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === "list"
              ? "border-sky-500 text-sky-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <List className="h-4 w-4" />
          <span>Document List</span>
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === "upload"
              ? "border-sky-500 text-sky-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === "upload" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Upload MRD Document</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload medical records and documents for patients. All required fields must be filled.
            </p>
          </div>
          <MRDUploadForm
            defaultPatientId={defaultPatientId}
            defaultAdmissionId={defaultAdmissionId}
            defaultLabBookingId={defaultLabBookingId}
            defaultVisitId={defaultVisitId}
            onSuccess={handleUploadSuccess}
          />
        </div>
      )}

      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Filters */}
          <MRDFilters
            patientId={patientId}
            category={category}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPatientChange={setPatientId}
            onCategoryChange={setCategory}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            defaultPatientId={defaultPatientId}
          />

          {/* Document List */}
          <MRDDocumentList
            patientId={patientId}
            category={category}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDocumentClick={handleDocumentClick}
            onDocumentEdit={handleDocumentEdit}
            onDocumentDelete={handleDocumentDelete}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {/* Document Modal */}
      <MRDDocumentModal
        isOpen={!!selectedDocumentId}
        onClose={() => setSelectedDocumentId(null)}
        documentId={selectedDocumentId}
        onUpdate={handleDocumentUpdate}
        onDelete={handleDocumentDelete}
      />
    </div>
  );
}

