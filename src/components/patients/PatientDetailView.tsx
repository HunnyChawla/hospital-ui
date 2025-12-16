"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectPatient, fetchPatients, getPatientById } from "@/redux/patientsSlice";
import { fetchAdmissions, dischargePatient, admitPatient } from "@/redux/admissionsSlice";
import { fetchBilling, createBillingRecord } from "@/redux/billingSlice";
import { fetchTests } from "@/redux/testsSlice";
import { fetchQueue } from "@/redux/queueSlice";
import { PatientFormModal } from "./PatientFormModal";
import { OpdForm } from "@/components/opd/OpdForm";
import { AppointmentForm } from "@/components/opd/AppointmentForm";
import { currency, formatDate } from "@/utils/format";
import { nanoid } from "@reduxjs/toolkit";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  CreditCard,
  BedDouble,
  Stethoscope,
  TestTube,
  Calendar,
} from "lucide-react";

interface PatientDetailViewProps {
  patientId: string;
  onClose: () => void;
}

export function PatientDetailView({ patientId, onClose }: PatientDetailViewProps) {
  const dispatch = useAppDispatch();
  const patientsList = useAppSelector((s) => s.patients.list);
  const selectedPatient = useAppSelector((s) => s.patients.selected);
  const patient = patientsList.find((p) => p.id === patientId) || (selectedPatient?.id === patientId ? selectedPatient : null);
  const admissions = useAppSelector((s) =>
    s.admissions.list.filter((a) => a.patientId === patientId)
  );
  const billingRecords = useAppSelector((s) =>
    s.billing.records.filter((b) => b.patientId === patientId)
  );
  const tests = useAppSelector((s) =>
    s.tests.list.filter((t) => t.patientName === patient?.name)
  );
  const queueEntries = useAppSelector((s) =>
    s.queue.entries.filter((q) => q.patientName === patient?.name)
  );

  const [activeTab, setActiveTab] = useState<
    "overview" | "opd" | "appointment" | "admit" | "billing" | "tests"
  >("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    doctor: patient?.doctor || "Dr. Mehta",
    reason: "",
    wardType: "General" as "ICU" | "General" | "Private",
    bedNumber: "",
  });
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [medications, setMedications] = useState<Array<{ name: string; quantity: number; price: number }>>([]);
  const [newMedication, setNewMedication] = useState({ name: "", quantity: 1, price: 0 });

  useEffect(() => {
    if (patientId) {
      // Check if patient is in store, if not fetch it
      const patientInStore = patientsList.find((p) => p.id === patientId);
      if (!patientInStore) {
        dispatch(getPatientById({ patientId }));
      } else {
        dispatch(selectPatient(patientId));
      }
      dispatch(fetchAdmissions());
      dispatch(fetchBilling());
      dispatch(fetchTests());
      // Note: fetchQueue requires doctorId, so we skip it in patient detail view
    }
  }, [patientId, dispatch, patientsList]);

  // Listen for patient updates to refresh data
  useEffect(() => {
    const handlePatientUpdated = () => {
      if (patientId) {
        dispatch(getPatientById({ patientId }));
        dispatch(fetchPatients());
      }
    };

    window.addEventListener("patient:created", handlePatientUpdated);
    return () => {
      window.removeEventListener("patient:created", handlePatientUpdated);
    };
  }, [patientId, dispatch]);

  if (!patient) {
    return (
      <div className="card p-6 text-center">
        <p className="text-slate-500">Patient not found</p>
        <button
          onClick={onClose}
          className="mt-4 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Go back
        </button>
      </div>
    );
  }

  const currentAdmission = admissions.find((a) => !a.dischargeAt);

  const handleDischarge = () => {
    setShowDischargeModal(true);
  };

  const calculateDaysInHospital = (admittedAt: string) => {
    const admitted = new Date(admittedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - admitted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const getBedChargePerDay = (wardType: "ICU" | "General" | "Private") => {
    const charges = {
      ICU: 5000,
      General: 2000,
      Private: 3500,
    };
    return charges[wardType];
  };

  const handleGenerateBillAndDischarge = async (admissionId: string) => {
    if (!currentAdmission || !dischargeSummary.trim()) {
      toast.error("Please enter discharge summary");
      return;
    }

    const days = calculateDaysInHospital(currentAdmission.admittedAt);
    const bedChargePerDay = getBedChargePerDay(currentAdmission.wardType);
    const totalBedCharges = days * bedChargePerDay;

    const billingItems: Array<{ id: string; label: string; amount: number; category: "Bed" | "Medicine" | "Consultation" | "Test" | "Other" }> = [
      {
        id: nanoid(),
        label: `Bed charges (${days} days × ${currency(bedChargePerDay)})`,
        amount: totalBedCharges,
        category: "Bed",
      },
    ];

    medications.forEach((med) => {
      billingItems.push({
        id: nanoid(),
        label: `${med.name} (Qty: ${med.quantity})`,
        amount: med.price * med.quantity,
        category: "Medicine",
      });
    });

    const total = billingItems.reduce((sum, item) => sum + item.amount, 0);

    await dispatch(createBillingRecord({ patientId, items: billingItems }));
    await dispatch(dischargePatient({ admissionId, summary: dischargeSummary }));
    
    toast.success(`Patient discharged. Bill generated: ${currency(total)}`);
    setShowDischargeModal(false);
    setDischargeSummary("");
    setMedications([]);
    dispatch(fetchBilling());
    dispatch(fetchAdmissions());
    dispatch(fetchPatients({}));
  };

  const addMedication = () => {
    if (!newMedication.name || newMedication.price <= 0) {
      toast.error("Please enter medication name and price");
      return;
    }
    setMedications([...medications, newMedication]);
    setNewMedication({ name: "", quantity: 1, price: 0 });
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitForm.bedNumber || !admitForm.reason) {
      toast.error("Please fill all fields");
      return;
    }
    const payload = {
      id: nanoid(),
      patientId: patientId,
      admittedAt: new Date().toISOString(),
      ...admitForm,
    };
    await dispatch(admitPatient(payload));
    toast.success("Patient admitted");
    setAdmitForm({ doctor: patient?.doctor || "Dr. Mehta", reason: "", wardType: "General", bedNumber: "" });
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/20 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-6xl rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <h2 className="text-lg font-bold text-slate-900">{patient.name}</h2>
                <p className="text-xs text-slate-500">
                  {patient.id} • {patient.healthId}
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="rounded-xl bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                Edit Patient
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-6">
            {/* Patient Info Cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-4">
                <p className="text-xs text-slate-500">Age & Gender</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {patient.age} • {patient.gender}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-4">
                <p className="text-xs text-slate-500">Status</p>
                <p className="mt-1 text-lg font-bold text-slate-900 capitalize">
                  {patient.status}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4">
                <p className="text-xs text-slate-500">Outstanding</p>
                <p className="mt-1 text-lg font-bold text-amber-600">
                  {currency(patient.outstanding)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-teal-50 to-white p-4">
                <p className="text-xs text-slate-500">Last Visit</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatDate(patient.lastVisit)}
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Mobile</p>
                  <p className="mt-1 font-semibold text-slate-900">{patient.mobile}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Doctor</p>
                  <p className="mt-1 font-semibold text-slate-900">{patient.doctor}</p>
                </div>
                {currentAdmission && (
                  <div>
                    <p className="text-xs text-slate-500">Current Admission</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {currentAdmission.wardType} • {currentAdmission.bedNumber}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Tabs */}
            <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
              {[
                { id: "overview", label: "Overview", icon: FileText },
                { id: "opd", label: "OPD Slip", icon: Stethoscope },
                { id: "appointment", label: "Appointment", icon: Calendar },
                { id: "admit", label: "Admit/Discharge", icon: BedDouble },
                { id: "billing", label: "Billing", icon: CreditCard },
                { id: "tests", label: "Tests", icon: TestTube },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-sky-500 text-sky-700"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === "overview" && (
                <div className="grid gap-6">
                  {/* Admissions History */}
                  {admissions.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h3 className="mb-3 text-sm font-semibold text-slate-900">
                        Admission History
                      </h3>
                      <div className="space-y-2">
                        {admissions.map((adm) => (
                          <div
                            key={adm.id}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {adm.wardType} • {adm.bedNumber}
                              </p>
                              <p className="text-xs text-slate-500">
                                {adm.reason} • {formatDate(adm.admittedAt)}
                              </p>
                            </div>
                            {!adm.dischargeAt && (
                              <button
                                onClick={handleDischarge}
                                className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                              >
                                Discharge
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Billing Summary */}
                  {billingRecords.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h3 className="mb-3 text-sm font-semibold text-slate-900">
                        Billing Summary
                      </h3>
                      <div className="space-y-2">
                        {billingRecords.map((bill) => (
                          <div
                            key={bill.id}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {currency(bill.total)} • {bill.items.length} items
                              </p>
                              <p className="text-xs text-slate-500">
                                {bill.status} • {formatDate(bill.updatedAt)}
                              </p>
                            </div>
                            <span
                              className={`pill ${
                                bill.status === "Paid"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {bill.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Queue Status */}
                  {queueEntries.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h3 className="mb-3 text-sm font-semibold text-slate-900">
                        Queue Status
                      </h3>
                      <div className="space-y-2">
                        {queueEntries.map((entry) => (
                          <div
                            key={entry.token}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                Token #{entry.token}
                              </p>
                              <p className="text-xs text-slate-500">
                                {entry.status} • ETA: {entry.etaMinutes} min
                              </p>
                            </div>
                            <span
                              className={`pill ${
                                entry.status === "Completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : entry.status === "In Consultation"
                                    ? "bg-sky-50 text-sky-700"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {entry.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "opd" && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <OpdForm defaultPatientId={patientId} hidePatientSearch={true} />
                </div>
              )}

              {activeTab === "appointment" && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <AppointmentForm defaultPatientId={patientId} hidePatientSearch={true} />
                </div>
              )}

              {activeTab === "admit" && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  {currentAdmission ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-900">
                          Current Admission
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500">Ward</p>
                            <p className="font-semibold text-slate-900">
                              {currentAdmission.wardType}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Bed</p>
                            <p className="font-semibold text-slate-900">
                              {currentAdmission.bedNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Doctor</p>
                            <p className="font-semibold text-slate-900">
                              {currentAdmission.doctor}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Admitted</p>
                            <p className="font-semibold text-slate-900">
                              {formatDate(currentAdmission.admittedAt)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleDischarge}
                          className="mt-4 w-full rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
                        >
                          Discharge Patient
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleAdmit} className="space-y-3 text-sm">
                      <label className="block space-y-1">
                        <span className="text-slate-600">Doctor</span>
                        <input
                          value={admitForm.doctor}
                          onChange={(e) => setAdmitForm({ ...admitForm, doctor: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-slate-600">Reason</span>
                        <input
                          value={admitForm.reason}
                          onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })}
                          placeholder="Admission reason"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-slate-600">Ward Type</span>
                        <select
                          value={admitForm.wardType}
                          onChange={(e) => setAdmitForm({ ...admitForm, wardType: e.target.value as "ICU" | "General" | "Private" })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                        >
                          <option>General</option>
                          <option>Private</option>
                          <option>ICU</option>
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-slate-600">Bed Number</span>
                        <input
                          value={admitForm.bedNumber}
                          onChange={(e) => setAdmitForm({ ...admitForm, bedNumber: e.target.value })}
                          placeholder="e.g., G-102"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                        />
                      </label>
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow"
                      >
                        Admit Patient
                      </button>
                    </form>
                  )}
                </div>
              )}

              {activeTab === "billing" && (
                <div className="space-y-4">
                  {billingRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Bill #{record.id}
                        </h3>
                        <span
                          className={`pill ${
                            record.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>
                      <div className="mb-4 space-y-2">
                        {record.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">{item.label}</p>
                              <p className="text-xs text-slate-500">{item.category}</p>
                            </div>
                            <p className="font-semibold text-slate-800">
                              {currency(item.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="text-sm font-semibold text-slate-900">Total</span>
                        <span className="text-lg font-bold text-slate-900">
                          {currency(record.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {billingRecords.length === 0 && (
                    <p className="text-center text-sm text-slate-500">No billing records</p>
                  )}
                </div>
              )}

              {activeTab === "tests" && (
                <div className="space-y-3">
                  {tests.map((test) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {test.testName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Ordered by {test.orderedBy}
                        </p>
                      </div>
                      <span
                        className={`pill ${
                          test.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : test.status === "In Progress"
                              ? "bg-sky-50 text-sky-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {test.status}
                      </span>
                    </div>
                  ))}
                  {tests.length === 0 && (
                    <p className="text-center text-sm text-slate-500">No test orders</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Discharge Modal */}
      {showDischargeModal && currentAdmission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Discharge Patient & Generate Bill</h2>
              <button
                onClick={() => {
                  setShowDischargeModal(false);
                  setDischargeSummary("");
                  setMedications([]);
                }}
                className="rounded-lg px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Admission Info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Admission Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Ward</p>
                    <p className="font-semibold text-slate-900">{currentAdmission.wardType}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Bed</p>
                    <p className="font-semibold text-slate-900">{currentAdmission.bedNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Admitted</p>
                    <p className="font-semibold text-slate-900">{formatDate(currentAdmission.admittedAt)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Days in Hospital</p>
                    <p className="font-semibold text-slate-900">
                      {calculateDaysInHospital(currentAdmission.admittedAt)} days
                    </p>
                  </div>
                </div>
              </div>

              {/* Bed Charges */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Bed Charges</h3>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {currentAdmission.wardType} Ward
                    </p>
                    <p className="text-xs text-slate-500">
                      {calculateDaysInHospital(currentAdmission.admittedAt)} days × {currency(getBedChargePerDay(currentAdmission.wardType))}/day
                    </p>
                  </div>
                  <p className="font-bold text-slate-900">
                    {currency(calculateDaysInHospital(currentAdmission.admittedAt) * getBedChargePerDay(currentAdmission.wardType))}
                  </p>
                </div>
              </div>

              {/* Medications */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Medications</h3>
                <div className="mb-3 grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newMedication.name}
                    onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                    placeholder="Medication name"
                    className="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                  />
                  <input
                    type="number"
                    value={newMedication.quantity}
                    onChange={(e) => setNewMedication({ ...newMedication, quantity: Number(e.target.value) })}
                    placeholder="Qty"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                  />
                  <input
                    type="number"
                    value={newMedication.price}
                    onChange={(e) => setNewMedication({ ...newMedication, price: Number(e.target.value) })}
                    placeholder="Price"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={addMedication}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  + Add Medication
                </button>

                {medications.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {medications.map((med, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{med.name}</p>
                          <p className="text-xs text-slate-500">Qty: {med.quantity}</p>
                        </div>
                        <p className="font-semibold text-slate-900">
                          {currency(med.price * med.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discharge Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-900">Discharge Summary</span>
                  <textarea
                    value={dischargeSummary}
                    onChange={(e) => setDischargeSummary(e.target.value)}
                    rows={3}
                    placeholder="Enter discharge summary and notes..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                  />
                </label>
              </div>

              {/* Bill Summary */}
              <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Bill Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Bed Charges</span>
                    <span className="font-semibold text-slate-900">
                      {currency(calculateDaysInHospital(currentAdmission.admittedAt) * getBedChargePerDay(currentAdmission.wardType))}
                    </span>
                  </div>
                  {medications.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-slate-600">{med.name}</span>
                      <span className="font-semibold text-slate-900">
                        {currency(med.price * med.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="mt-3 flex items-center justify-between border-t border-sky-200 pt-3">
                    <span className="text-base font-bold text-slate-900">Total</span>
                    <span className="text-lg font-bold text-slate-900">
                      {currency(
                        calculateDaysInHospital(currentAdmission.admittedAt) * getBedChargePerDay(currentAdmission.wardType) +
                        medications.reduce((sum, med) => sum + med.price * med.quantity, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDischargeModal(false);
                    setDischargeSummary("");
                    setMedications([]);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGenerateBillAndDischarge(currentAdmission.id)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow"
                >
                  Generate Bill & Discharge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      <PatientFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          // Refresh patient data after edit
          if (patientId) {
            dispatch(getPatientById({ patientId }));
          }
        }}
        defaultValues={patient}
      />
    </div>
  );
}

