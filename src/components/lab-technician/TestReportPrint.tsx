"use client";

import { useEffect, useState } from "react";
import { LabBooking, LabBookingTest } from "@/services/labBookingsApi";
import { LabTestResult } from "@/services/labTestsApi";
import { PatientApiResponse, patientsApi, formatPatientName } from "@/services/patientsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";
import { getTenantIdForApi } from "@/utils/auth";

import { MRDImage } from "./TestResultsForm";

interface TestReportPrintProps {
  booking: LabBooking;
  patientName: string;
  patientMobile?: string;
  testResults: Array<{
    test: LabBookingTest;
    results: LabTestResult[];
  }>;
}

export function TestReportPrint({
  booking,
  patientName,
  patientMobile,
  testResults,
}: TestReportPrintProps) {
  const { tenant } = useTenant();
  const [patient, setPatient] = useState<PatientApiResponse | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Fetch full patient details
  useEffect(() => {
    const fetchPatient = async () => {
      if (!booking.patient_id) return;

      try {
        setLoadingPatient(true);
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const apiTenantId = getTenantIdForApi(tenantId || undefined);
        const patientData = await patientsApi.getById(booking.patient_id, apiTenantId);
        setPatient(patientData);
      } catch (error) {
        console.error("Failed to fetch patient details:", error);
      } finally {
        setLoadingPatient(false);
      }
    };

    fetchPatient();
  }, [booking.patient_id]);

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Format full name
  const fullName = patient
    ? formatPatientName(patient)
    : patientName;

  // Format address
  const formatAddress = () => {
    if (!patient) return null;
    const parts = [patient.address, patient.city, patient.state, patient.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const address = formatAddress();

  return (
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="Lab Test Report" />

      {/* Patient Information */}
      <div className="mb-4 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Patient Information
        </h2>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{fullName}</p>
          </div>
          {patient?.uhid && (
            <div>
              <p className="text-[10px] text-slate-600">UHID</p>
              <p className="font-semibold text-slate-900">{patient.uhid}</p>
            </div>
          )}
          {patient?.date_of_birth && (
            <div>
              <p className="text-[10px] text-slate-600">Age</p>
              <p className="font-semibold text-slate-900">{calculateAge(patient.date_of_birth)} years</p>
            </div>
          )}
          {patient?.gender && (
            <div>
              <p className="text-[10px] text-slate-600">Gender</p>
              <p className="font-semibold text-slate-900 capitalize">{patient.gender}</p>
            </div>
          )}
          {(patient?.mobile || patientMobile) && (
            <div>
              <p className="text-[10px] text-slate-600">Mobile</p>
              <p className="font-semibold text-slate-900">{patient?.mobile || patientMobile}</p>
            </div>
          )}
          {patient?.category && (
            <div>
              <p className="text-[10px] text-slate-600">Category</p>
              <p className="font-semibold text-slate-900 capitalize">{patient.category}</p>
            </div>
          )}
          {patient?.email && (

            <div>
              <p className="text-[10px] text-slate-600">Email</p>
              <p className="font-semibold text-slate-900">{patient.email}</p>
            </div>
          )}
          {address && (
            <div className="col-span-4">
              <p className="text-[10px] text-slate-600">Address</p>
              <p className="font-semibold text-slate-900">{address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Details */}
      <div className="mb-4 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Booking Details
        </h2>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Booking Number</p>
            <p className="font-semibold text-slate-900">{booking.booking_number}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Scheduled Date</p>
            <p className="font-semibold text-slate-900">{formatDate(booking.scheduled_date)}</p>
          </div>
          {booking.scheduled_time && (
            <div>
              <p className="text-[10px] text-slate-600">Scheduled Time</p>
              <p className="font-semibold text-slate-900">{booking.scheduled_time}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-slate-600">Priority</p>
            <p className="font-semibold text-slate-900 capitalize">{booking.priority}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600">Status</p>
            <p className="font-semibold text-slate-900 capitalize">{booking.status.replace("_", " ")}</p>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="mb-4 space-y-4">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Test Results
        </h2>

        {testResults.map(({ test, results }) => {
          // Group results by section name
          const resultsBySection = results.reduce<Record<string, LabTestResult[]>>((acc, res) => {
            const sectionName = res.section_name || "General Parameters";
            if (!acc[sectionName]) {
              acc[sectionName] = [];
            }
            acc[sectionName].push(res);
            return acc;
          }, {});

          return (
            <div key={test.id} className="rounded-lg border border-slate-200 bg-white p-3 print:border-slate-300">
              {/* Test Header */}
              <div className="mb-3 border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {test.test_name}
                  {test.prescription_metadata && Object.keys(test.prescription_metadata).length > 0 && (
                    <span className="font-normal text-slate-600 text-xs ml-1.5">
                      ({Object.entries(test.prescription_metadata).map(([k, v]) => `${k}: ${v}`).join(", ")})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-600">Test Code: {test.test_code}</p>
              </div>

              {/* Grouped Results */}
              {results.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(resultsBySection).map(([sectionName, sectionResults]) => {
                    const imageResults = sectionResults.filter((r) => r.parameter_type === "image");
                    const nonImageResults = sectionResults.filter((r) => r.parameter_type !== "image");

                    return (
                      <div key={sectionName} className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/50 rounded px-2 py-1">
                          {sectionName}
                        </h4>

                        {nonImageResults.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-300 bg-slate-50/50">
                                  <th className="pb-1 pt-1 text-left font-semibold text-slate-800">Parameter</th>
                                  <th className="pb-1 pt-1 text-left font-semibold text-slate-800">Result</th>
                                  <th className="pb-1 pt-1 text-left font-semibold text-slate-800">Unit</th>
                                  <th className="pb-1 pt-1 text-left font-semibold text-slate-800">Normal Range</th>
                                  <th className="pb-1 pt-1 text-center font-semibold text-slate-800">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {nonImageResults.map((result) => (
                                  <tr
                                    key={result.id}
                                    className={`border-b border-slate-100 ${
                                      result.is_abnormal ? "bg-rose-50 print:bg-slate-50" : ""
                                    }`}
                                  >
                                    <td className="py-1.5 text-slate-900">
                                      <div>
                                        <p className="font-semibold">{result.parameter_name}</p>
                                        <p className="text-[10px] text-slate-600">{result.parameter_code}</p>
                                      </div>
                                    </td>
                                    <td className="py-1.5 font-semibold text-slate-900">{result.result_value}</td>
                                    <td className="py-1.5 text-slate-600">{result.unit || "-"}</td>
                                    <td className="py-1.5 text-slate-600">
                                      {result.normal_text || (result.normal_min !== null && result.normal_max !== null
                                        ? `${result.normal_min} - ${result.normal_max}`
                                        : "-")}
                                    </td>
                                    <td className="py-1.5 text-center">
                                      {result.parameter_type === "number" && (
                                        result.is_abnormal ? (
                                          <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 print:bg-slate-200 print:text-slate-700">
                                            Abnormal
                                          </span>
                                        ) : (
                                          <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 print:bg-slate-200 print:text-slate-700">
                                            Normal
                                          </span>
                                        )
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {imageResults.length > 0 && (
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {imageResults.map((result) => (
                              <div key={result.id} className="border border-slate-200 rounded p-2 bg-slate-50/50 flex flex-col items-center">
                                <p className="text-[10px] font-semibold text-slate-700 mb-1">{result.parameter_name}</p>
                                <div className="h-36 w-full overflow-hidden flex items-center justify-center bg-white rounded border border-slate-200">
                                  <MRDImage documentId={result.result_value} className="max-h-full max-w-full object-contain" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No results available for this test.</p>
              )}

              {/* Notes Section */}
              {results.some((r) => r.notes) && (
                <div className="mt-3 border-t border-slate-200 pt-2">
                  <p className="text-[10px] font-semibold text-slate-600">Notes:</p>
                  <div className="mt-1 space-y-1">
                    {results
                      .filter((r) => r.notes)
                      .map((result) => (
                        <div key={result.id} className="text-xs text-slate-700">
                          <span className="font-medium">{result.parameter_name}:</span> {result.notes}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Verification Info */}
              {results.some((r) => r.verified_at) && (
                <div className="mt-2 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
                  <p>
                    Verified on:{" "}
                    {new Date(results.find((r) => r.verified_at)?.verified_at || "").toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-600">
        <p>This is a computer-generated test report. No signature required.</p>
        <p className="mt-1">Report Generated on: {new Date().toLocaleString("en-IN")}</p>
        {booking.notes && (
          <p className="mt-2 text-xs font-medium text-slate-700">Special Instructions: {booking.notes}</p>
        )}
      </div>
    </div>
  );
}

