"use client";

import { useState, useEffect } from "react";
import { WardTable } from "./WardTable";
import { WardFormModal } from "./WardFormModal";
import { BedTable } from "./BedTable";
import { BedFormModal } from "./BedFormModal";
import { AdmissionTable } from "./AdmissionTable";
import { AdmissionFormModal } from "./AdmissionFormModal";
import { Ward } from "@/services/wardsApi";
import { Bed } from "@/services/bedsApi";
import { Admission } from "@/services/admissionsApi";
import { ClipboardList, BedDouble, LayoutList, PlusCircle, Building2 } from "lucide-react";

interface ManageIPDProps {
  defaultTab?: "wards" | "beds" | "admissions";
  action?: string | null;
  admissionId?: string | null;
}

export function ManageIPD({ defaultTab = "wards", action, admissionId }: ManageIPDProps) {
  const [activeTab, setActiveTab] = useState<"wards" | "beds" | "admissions">(defaultTab);

  // Update tab when defaultTab prop changes
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const [showWardModal, setShowWardModal] = useState(false);
  const [showBedModal, setShowBedModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);

  // Handle action prop to open modals
  useEffect(() => {
    if (action === "add" && activeTab === "admissions") {
      setShowAdmissionModal(true);
    }
  }, [action, activeTab]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 gap-3 pb-3 sm:pb-0">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 -mb-px">
          {[
            { id: "wards", label: "Wards", icon: Building2 },
            { id: "beds", label: "Beds", icon: LayoutList },
            { id: "admissions", label: "Admissions", icon: ClipboardList },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 border-b-2 px-3 sm:px-4 py-3 sm:py-4 text-sm font-semibold transition whitespace-nowrap ${activeTab === tab.id
                  ? "border-sky-500 text-sky-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div>
          {activeTab === "wards" && (
            <button
              onClick={() => {
                setEditingWard(null);
                setShowWardModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
            >
              <div className="relative flex items-center justify-center">
                <Building2 className="h-4 w-4" />
                <PlusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-sky-500 rounded-full" />
              </div>
              Add Ward
            </button>
          )}
          {activeTab === "beds" && (
            <button
              onClick={() => {
                setEditingBed(null);
                setShowBedModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
            >
              <div className="relative flex items-center justify-center">
                <BedDouble className="h-4 w-4" />
                <PlusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-sky-500 rounded-full" />
              </div>
              Add Bed
            </button>
          )}
          {activeTab === "admissions" && (
            <button
              onClick={() => setShowAdmissionModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
            >
              <div className="relative flex items-center justify-center">
                <BedDouble className="h-4 w-4" />
                <PlusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-sky-500 rounded-full" />
              </div>
              Admit Patient
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {/* Mobile-responsive content wrapper */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-6 shadow-sm">
        {activeTab === "wards" && (
          <div>
            <WardTable
              onEditClick={(ward) => {
                setEditingWard(ward);
                setShowWardModal(true);
              }}
            />
          </div>
        )}

        {activeTab === "beds" && (
          <div>
            <BedTable
              onEditClick={(bed) => {
                setEditingBed(bed);
                setShowBedModal(true);
              }}
            />
          </div>
        )}

        {activeTab === "admissions" && (
          <div>
            <AdmissionTable selectedAdmissionId={admissionId} action={action} />
          </div>
        )}
      </div>

      {/* Modals */}
      <WardFormModal
        isOpen={showWardModal}
        onClose={() => {
          setShowWardModal(false);
          setEditingWard(null);
        }}
        defaultValues={editingWard ?? undefined}
      />

      <BedFormModal
        isOpen={showBedModal}
        onClose={() => {
          setShowBedModal(false);
          setEditingBed(null);
        }}
        defaultValues={editingBed ?? undefined}
      />

      <AdmissionFormModal
        isOpen={showAdmissionModal}
        onClose={() => setShowAdmissionModal(false)}
      />
    </div>
  );
}


