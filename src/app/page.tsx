"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/common/StatCard";
import { Section } from "@/components/common/Section";
import { PatientForm } from "@/components/patients/PatientForm";
import { PatientTable } from "@/components/patients/PatientTable";
import { PatientSearch } from "@/components/patients/PatientSearch";
import { OpdForm } from "@/components/opd/OpdForm";
import { AdmissionPanel } from "@/components/admission/AdmissionPanel";
import { BedOverview } from "@/components/beds/BedOverview";
import { BillingPanel } from "@/components/billing/BillingPanel";
import { TestPanel } from "@/components/tests/TestPanel";
import { QueueBoard } from "@/components/queue/QueueBoard";
import { bedData } from "@/components/beds/BedOverview";
import { PatientDetailView } from "@/components/patients/PatientDetailView";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchAdmissions } from "@/redux/admissionsSlice";
import { fetchBilling } from "@/redux/billingSlice";
import { fetchQueue } from "@/redux/queueSlice";
import { fetchPatients } from "@/redux/patientsSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { restoreSession } from "@/redux/authSlice";
import { currency } from "@/utils/format";
import {
  Activity,
  BedDouble,
  HeartPulse,
  LayoutList,
  Stethoscope,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const patients = useAppSelector((s) => s.patients.list);
  const admissions = useAppSelector((s) => s.admissions.list);
  const billing = useAppSelector((s) => s.billing.records);
  const queue = useAppSelector((s) => s.queue.entries);
  const doctors = useAppSelector((s) => s.doctors.list);
  const doctorsLoading = useAppSelector((s) => s.doctors.loading);
  const [activeSection, setActiveSection] = useState<
    "dashboard" | "patients" | "opd" | "admissions" | "billing" | "labs" | "queue"
  >("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    // Restore session on mount
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchAdmissions());
      dispatch(fetchBilling());
      dispatch(fetchQueue());
      dispatch(fetchPatients());
      dispatch(fetchDoctors());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    const syncHash = () => {
      const raw = window.location.hash.replace("#", "");
      const hash =
        raw === "lookup" ? "patients" : (raw as typeof activeSection);
      setActiveSection(hash || "dashboard");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const selectedPatient = useAppSelector((s) => s.patients.selected);
  const admittedCount = admissions.length;
  const pendingBills =
    patients.reduce((sum, p) => sum + p.outstanding, 0) || 0;
  const totalQueue = queue.length;
  const revenue = useMemo(
    () => billing.reduce((sum, rec) => sum + rec.total, 0),
    [billing]
  );
  const totalBeds = bedData.reduce((sum, b) => sum + b.total, 0);
  const occupiedBeds = bedData.reduce((sum, b) => sum + b.occupied, 0);
  const vacantBeds = totalBeds - occupiedBeds;

  const show = (tab: typeof activeSection) => activeSection === tab;

  // Show nothing while checking auth
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="lg:pl-72">
      <Sidebar />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <TopBar />

        {show("dashboard") && (
          <div className="grid gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total patients"
                value={patients.length}
                hint="Managed today"
                icon={HeartPulse}
                tone="sky"
              />
              <StatCard
                label="Admissions"
                value={`${admittedCount} / ${occupiedBeds}`}
                hint={`${vacantBeds} beds vacant`}
                icon={BedDouble}
                tone="emerald"
              />
              <StatCard
                label="Outstanding"
                value={currency(pendingBills)}
                hint="Pending dues"
                icon={Stethoscope}
                tone="amber"
              />
              <StatCard
                label="OPD queue"
                value={totalQueue}
                hint="Tokens live"
                icon={LayoutList}
                tone="fuchsia"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="card col-span-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Quick actions
                  </p>
                  <span className="pill bg-sky-50 text-sky-700">Today</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                  <button
                    onClick={() => {
                      window.location.hash = "patients";
                      setActiveSection("patients");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                  >
                    + Add patient
                  </button>
                  <button
                    onClick={() => {
                      window.location.hash = "opd";
                      setActiveSection("opd");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Generate OPD
                  </button>
                  <button
                    onClick={() => {
                      window.location.hash = "admissions";
                      setActiveSection("admissions");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Admit patient
                  </button>
                  <button
                    onClick={() => {
                      window.location.hash = "billing";
                      setActiveSection("billing");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Collect payment
                  </button>
                </div>
              </div>

              <div className="card p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Bed availability
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {bedData.map((b) => {
                    const vacant = b.total - b.occupied;
                    return (
                      <div
                        key={b.ward}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <span className="font-semibold">{b.ward}</span>
                        <span className="text-slate-600">
                          {vacant} vacant / {b.total} total
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card p-4">
              <p className="text-sm font-semibold text-slate-900">
                Revenue snapshot
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="pill bg-emerald-50 text-emerald-700">
                  {currency(revenue)} collected
                </span>
                <span className="pill bg-amber-50 text-amber-700">
                  {currency(pendingBills)} pending
                </span>
              </div>
            </div>
          </div>
        )}

        {show("patients") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="patients"
              title="Patient Management"
              description="Add or edit patients, then search and review quick summaries."
            >
              <div className="grid gap-5">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Activity className="h-4 w-4 text-sky-600" />
                    Add / Edit patient
                  </div>
                  <div className="mt-3">
                    <PatientForm defaultValues={selectedPatient ?? undefined} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Patient lookup
                    </p>
                    <p className="text-xs text-slate-500">
                      Search by mobile, Health ID, or name to view summaries.
                    </p>
                  </div>
                  <div className="mt-3">
                    <PatientSearch />
                  </div>
                  <div className="mt-4">
                    <PatientTable
                      onPatientClick={(id) => setSelectedPatientId(id)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Doctor roster
                      </p>
                      <p className="text-xs text-slate-500">
                        Availability snapshot across specialties.
                      </p>
                    </div>
                    <span className="pill bg-sky-50 text-sky-700">
                      {doctors.length} doctors
                    </span>
                  </div>
                  {doctorsLoading ? (
                    <div className="mt-3 text-center text-sm text-slate-500">
                      Loading doctors...
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {doctors.length > 0 ? (
                        doctors.map((doc) => {
                          const doctorName = doc.name || doc.user?.name || `Dr. ${doc.specialization}`;
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {doctorName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {doc.specialization} • {doc.qualification}
                                </p>
                              </div>
                              <span className="pill bg-emerald-50 text-emerald-700">
                                ₹{doc.consultation_fee}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="col-span-2 text-center text-sm text-slate-500">
                          No doctors available
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Section>
          </div>
        )}

        {show("opd") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="opd"
              title="OPD Slip Generation"
              description="Generate OPD token, capture symptoms, and print-ready slip."
            >
              <OpdForm />
            </Section>
          </div>
        )}

        {show("admissions") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="admissions"
              title="Admission & Discharge"
              description="Assign beds, set ward type, discharge with summaries."
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdmissionPanel />
                <BedOverview />
              </div>
            </Section>
          </div>
        )}

        {show("billing") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="billing"
              title="Billing & Receipt"
              description="Itemized charges, real-time totals, and printable receipts."
            >
              <BillingPanel />
            </Section>
        </div>
        )}

        {show("labs") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="labs"
              title="Test / Lab Management"
              description="Track doctor-prescribed tests and print instruction slips."
            >
              <TestPanel />
            </Section>
          </div>
        )}

        {show("queue") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="queue"
              title="Real-time Queue"
              description="Automatic queue after OPD creation with drag-and-move statuses."
              action={
                <span className="pill bg-emerald-50 text-emerald-700">
                  Live sync enabled
                </span>
              }
            >
              <QueueBoard />
            </Section>
        </div>
        )}

        {selectedPatientId && (
          <PatientDetailView
            patientId={selectedPatientId}
            onClose={() => setSelectedPatientId(null)}
          />
        )}
      </main>
    </div>
  );
}
