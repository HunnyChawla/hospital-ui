"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Printer, Plus, Search } from "lucide-react";
import { mockOpdApi } from "@/services/mockData";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { addPatient } from "@/redux/patientsSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { Patient } from "@/types";
import { OpdSlipPrint } from "./OpdSlipPrint";

interface OpdFormProps {
  defaultPatientId?: string;
  hidePatientSearch?: boolean;
}

export function OpdForm({ defaultPatientId, hidePatientSearch = false }: OpdFormProps = {} as OpdFormProps) {
  const dispatch = useAppDispatch();
  const patients = useAppSelector((s) => s.patients.list);
  const queue = useAppSelector((s) => s.queue.entries);
  const doctors = useAppSelector((s) => s.doctors.list);
  const doctorsLoading = useAppSelector((s) => s.doctors.loading);

  const [doctor, setDoctor] = useState("");
  const [symptoms, setSymptoms] = useState("Fever, sore throat");
  const [patientId, setPatientId] = useState(defaultPatientId || "");
  const [term, setTerm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [opdNumber, setOpdNumber] = useState("");
  const [tokenNumber, setTokenNumber] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);
  const [newPatient, setNewPatient] = useState<
    Omit<Patient, "id" | "status" | "lastVisit">
  >({
    name: "",
    mobile: "",
    healthId: "",
    doctor: "",
    age: 30,
    gender: "Male",
    wardType: undefined,
    bedNumber: undefined,
  });

  // Fetch doctors on mount
  useEffect(() => {
    if (doctors.length === 0 && !doctorsLoading) {
      dispatch(fetchDoctors());
    }
  }, [dispatch, doctors.length, doctorsLoading]);

  // Get default doctor name when doctors are loaded
  const defaultDoctorName = useMemo(() => {
    if (doctors.length > 0) {
      const firstDoctor = doctors[0];
      return firstDoctor.name || `Dr. ${firstDoctor.specialization}`;
    }
    return "";
  }, [doctors]);

  // Use default doctor if none selected
  const selectedDoctor = doctor || defaultDoctorName;

  const filteredPatients = useMemo(() => {
    const lower = term.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.mobile.includes(term) ||
        p.healthId.toLowerCase().includes(lower)
    );
  }, [patients, term]);


  const handleCreatePatient = async () => {
    if (!newPatient.name || !newPatient.mobile || !newPatient.healthId) {
      toast.error("Please fill name, mobile, and health ID");
      return;
    }
    const created = await dispatch(addPatient(newPatient)).unwrap();
    setPatientId(created.id);
    setShowNew(false);
    toast.success("Patient added and selected");
  };

  const selectedPatient = patients.find((p) => p.id === patientId);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `OPD_Slip_${opdNumber}`,
  });

  const generateOpdNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `OPD-${year}${month}${day}-${random}`;
  };

  const generateTokenNumber = () => {
    // Generate token based on current queue length or random
    if (queue.length > 0) {
      const maxToken = Math.max(...queue.map((q) => q.token));
      return maxToken + 1;
    }
    return Math.floor(Math.random() * 100) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    if (!symptoms.trim()) {
      toast.error("Please enter symptoms/reason for visit");
      return;
    }

    // Generate OPD number and token
    const newOpdNumber = generateOpdNumber();
    const newTokenNumber = generateTokenNumber();
    
    // Create OPD slip record
    const response = await mockOpdApi.createSlip(patientId, selectedDoctor, symptoms);
    
    // Set state first
    setOpdNumber(newOpdNumber);
    setTokenNumber(newTokenNumber);
    
    // Trigger print after state is updated and component re-renders
    setTimeout(() => {
      if (printRef.current) {
        handlePrint();
        toast.success(`OPD slip generated #${response.data.id}`);
      } else {
        toast.error("Failed to generate print preview");
      }
    }, 300);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-sm">
      {!hidePatientSearch && (
        <div className="col-span-2 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search patient by name, mobile, or Health ID"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600">
              {filteredPatients.length} match{filteredPatients.length === 1 ? "" : "es"}
            </span>
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:text-sky-700"
            >
              <Plus className="h-4 w-4" />
              {showNew ? "Close new patient" : "Add new patient"}
            </button>
          </div>
        </div>
      )}
      <label className="space-y-1">
        <span className="text-slate-600">Patient</span>
        {hidePatientSearch && selectedPatient ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="font-semibold text-slate-900">{selectedPatient.name}</p>
            <p className="text-xs text-slate-500">
              {selectedPatient.healthId} • {selectedPatient.mobile}
            </p>
          </div>
        ) : (
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            {filteredPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} • {p.healthId} • {p.mobile}
              </option>
            ))}
          </select>
        )}
      </label>
      <label className="space-y-1">
        <span className="text-slate-600">Doctor</span>
        <select
          value={selectedDoctor}
          onChange={(e) => setDoctor(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          disabled={doctorsLoading || doctors.length === 0}
        >
          {doctorsLoading ? (
            <option>Loading doctors...</option>
          ) : doctors.length === 0 ? (
            <option>No doctors available</option>
          ) : (
            doctors.map((doc) => {
              const doctorName = doc.name || `Dr. ${doc.specialization}`;
              return (
                <option key={doc.id} value={doctorName}>
                  {doctorName} - {doc.specialization}
                </option>
              );
            })
          )}
        </select>
      </label>
      <label className="col-span-2 space-y-1">
        <span className="text-slate-600">Symptoms / reason</span>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
        />
      </label>
      {showNew && (
        <div className="col-span-2 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-white p-4">
          <div className="col-span-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">New patient</p>
              <p className="text-xs text-slate-500">
                Capture minimal details and continue with OPD.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreatePatient}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:shadow"
            >
              Save & select
            </button>
          </div>
          <label className="space-y-1">
            <span className="text-slate-600">Full name</span>
            <input
              value={newPatient.name}
              onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Mobile</span>
            <input
              value={newPatient.mobile}
              onChange={(e) => setNewPatient({ ...newPatient, mobile: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Health ID</span>
            <input
              value={newPatient.healthId}
              onChange={(e) =>
                setNewPatient({ ...newPatient, healthId: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Doctor</span>
            <select
              value={newPatient.doctor || defaultDoctorName}
              onChange={(e) => setNewPatient({ ...newPatient, doctor: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              disabled={doctorsLoading || doctors.length === 0}
            >
              {doctorsLoading ? (
                <option>Loading doctors...</option>
              ) : doctors.length === 0 ? (
                <option>No doctors available</option>
              ) : (
                doctors.map((doc) => {
                  const doctorName = doc.name || `Dr. ${doc.specialization}`;
                  return (
                    <option key={doc.id} value={doctorName}>
                      {doctorName} - {doc.specialization}
                    </option>
                  );
                })
              )}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Age</span>
            <input
              type="number"
              value={newPatient.age}
              onChange={(e) =>
                setNewPatient({ ...newPatient, age: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Gender</span>
            <select
              value={newPatient.gender}
              onChange={(e) =>
                setNewPatient({
                  ...newPatient,
                  gender: e.target.value as Patient["gender"],
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </label>
        </div>
      )}
      <div className="col-span-2 flex justify-end gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow"
        >
          <Printer className="h-4 w-4" />
          Print OPD Slip
        </button>
      </div>

      {/* Hidden printable slip - always render when we have patient selected */}
      {selectedPatient && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printRef} className="print-content">
            {opdNumber && tokenNumber > 0 ? (
              <OpdSlipPrint
                patient={selectedPatient}
                doctor={selectedDoctor}
                symptoms={symptoms}
                opdNumber={opdNumber}
                tokenNumber={tokenNumber}
              />
            ) : (
              <div>Loading...</div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

