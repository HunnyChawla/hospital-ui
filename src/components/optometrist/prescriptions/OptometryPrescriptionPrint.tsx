"use client";

import { forwardRef } from "react";
import type { OptometryPrescription, RefractionRecord } from "@/types";
import { useTenant } from "@/hooks/useTenant";
import Image from "next/image";

interface OptometryPrescriptionPrintProps {
  prescription: OptometryPrescription;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientUhid?: string;
  patientCategory?: string;
  optometristName: string;
  refractionOD?: RefractionRecord | null;
  refractionOS?: RefractionRecord | null;
}

export const OptometryPrescriptionPrint = forwardRef<
  HTMLDivElement,
  OptometryPrescriptionPrintProps
>(function OptometryPrescriptionPrint(
  {
    prescription,
    patientName,
    patientAge,
    patientGender,
    patientUhid,
    patientCategory,
    optometristName,
    refractionOD,
    refractionOS,
  },
  ref
) {

  const { tenant, hospitalName } = useTenant();

  // Format address
  const formatAddress = () => {
    if (!tenant) return null;
    const parts = [
      tenant.address,
      tenant.city,
      tenant.state,
      tenant.pincode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const hospitalAddress = formatAddress();
  const hospitalPhone = tenant?.phone_no || null;
  const hospitalEmail = tenant?.email || null;

  const odItem = prescription.items.find((i) => i.eye === "OD");
  const osItem = prescription.items.find((i) => i.eye === "OS");

  const formatValue = (value: number | string | null | undefined, type: "sphere" | "cylinder" | "axis" | "add" | "va") => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "string") return value;
    if (type === "axis") return `${value}°`;
    return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  };

  return (
    <div ref={ref} className="bg-white p-12 text-slate-900" style={{ width: "210mm", minHeight: "297mm" }}>
      {/* Header */}
      <div className="mb-8 border-b-2 border-sky-600 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-sky-600">{hospitalName}</h1>
            {hospitalAddress && <p className="mt-2 text-sm text-slate-600">{hospitalAddress}</p>}
            <div className="mt-1 flex gap-4 text-sm text-slate-600">
              {hospitalPhone && <p>Phone: {hospitalPhone}</p>}
              {hospitalEmail && <p>Email: {hospitalEmail}</p>}
            </div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center">
            <Image
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/cura-logo-v2.png`}
              alt="Hospital Logo"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Document Title */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
          Optical Prescription
        </h2>
        {prescription.prescription_number && (
          <p className="mt-1 text-sm text-slate-600">
            Rx No: {prescription.prescription_number}
          </p>
        )}
      </div>

      {/* Patient Information */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-600">Patient Name</p>
            <p className="text-base font-semibold text-slate-900">{patientName}</p>
          </div>
          {patientUhid && (
            <div>
              <p className="text-sm font-medium text-slate-600">UHID</p>
              <p className="text-base font-semibold text-slate-900">{patientUhid}</p>
            </div>
          )}
          {patientAge && (
            <div>
              <p className="text-sm font-medium text-slate-600">Age</p>
              <p className="text-base font-semibold text-slate-900">{patientAge} years</p>
            </div>
          )}
          {patientGender && (
            <div>
              <p className="text-sm font-medium text-slate-600">Gender</p>
              <p className="text-base font-semibold text-slate-900">{patientGender}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-600">Date</p>
            <p className="text-base font-semibold text-slate-900">
              {new Date(prescription.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Optometrist</p>
            <p className="text-base font-semibold text-slate-900">{optometristName}</p>
          </div>
          {patientCategory && (
            <div>
              <p className="text-sm font-medium text-slate-600">Category</p>
              <p className="text-base font-semibold text-slate-900 capitalize">{patientCategory}</p>
            </div>
          )}
        </div>
      </div>


      {/* Refraction Details */}
      {(refractionOD || refractionOS) && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Refraction Details</h3>
          <table className="w-full border-collapse border-2 border-slate-900">
            <thead>
              <tr className="bg-amber-50">
                <th className="border border-slate-900 px-4 py-3 text-left text-sm font-bold uppercase">
                  Eye
                </th>
                <th className="border border-slate-900 px-4 py-3 text-center text-sm font-bold uppercase">
                  Sphere (SPH)
                </th>
                <th className="border border-slate-900 px-4 py-3 text-center text-sm font-bold uppercase">
                  Cylinder (CYL)
                </th>
                <th className="border border-slate-900 px-4 py-3 text-center text-sm font-bold uppercase">
                  Axis
                </th>
                <th className="border border-slate-900 px-4 py-3 text-center text-sm font-bold uppercase">
                  Add Power
                </th>
              </tr>
            </thead>
            <tbody>
              {/* OD (Right Eye) */}
              <tr>
                <td className="border border-slate-900 px-4 py-3 font-semibold">
                  OD (Right Eye)
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {refractionOD ? formatValue(refractionOD.sphere, "sphere") : "-"}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {refractionOD ? formatValue(refractionOD.cylinder, "cylinder") : "-"}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {refractionOD ? formatValue(refractionOD.axis, "axis") : "-"}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {refractionOD ? formatValue(refractionOD.add_power, "add") : "-"}
                </td>
              </tr>
              {/* OS (Left Eye) */}
              <tr>
                <td className="border border-slate-900 px-4 py-3 font-semibold">
                  OS (Left Eye)
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {refractionOS ? formatValue(refractionOS.sphere, "sphere") : "-"}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {refractionOS ? formatValue(refractionOS.cylinder, "cylinder") : "-"}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {refractionOS ? formatValue(refractionOS.axis, "axis") : "-"}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {refractionOS ? formatValue(refractionOS.add_power, "add") : "-"}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-2 text-sm text-slate-600">
            {/* Notes if needed */}
            {(refractionOD?.notes || refractionOS?.notes) && (
              <p><span className="font-medium">Notes:</span> {[refractionOD?.notes, refractionOS?.notes].filter(Boolean).join("; ")}</p>
            )}
          </div>
        </div>
      )}

      {/* Prescription Table */}
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-bold text-slate-900">Spectacle Prescription</h3>
        <table className="w-full border-collapse border-2 border-slate-900">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-900 px-4 py-3 text-left text-sm font-bold uppercase">
                Eye
              </th>
              <th className="border border-slate-900 px-4 py-3 text-center text-sm font-bold uppercase">
                Sphere (SPH)
              </th>
              <th className="border border-slate-900 px-4 py-3 text-center text-sm font-bold uppercase">
                Cylinder (CYL)
              </th>
              <th className="border border-slate-900 px-4 py-3 text-center text-sm font-bold uppercase">
                Axis
              </th>
              <th className="border border-slate-900 px-4 py-3 text-center text-sm font-bold uppercase">
                Add Power
              </th>
              {(odItem?.prism || osItem?.prism) && (
                <th className="border border-slate-900 px-4 py-3 text-center text-sm font-bold uppercase">
                  Prism
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* OD (Right Eye) */}
            {odItem && (
              <tr>
                <td className="border border-slate-900 px-4 py-3 font-semibold">
                  OD (Right Eye)
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {formatValue(odItem.sphere, "sphere")}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {formatValue(odItem.cylinder, "cylinder")}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {formatValue(odItem.axis, "axis")}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {formatValue(odItem.add_power, "add")}
                </td>
                {(odItem?.prism || osItem?.prism) && (
                  <td className="border border-slate-900 px-4 py-3 text-center">
                    {odItem.prism || "-"}
                  </td>
                )}
              </tr>
            )}

            {/* OS (Left Eye) */}
            {osItem && (
              <tr>
                <td className="border border-slate-900 px-4 py-3 font-semibold">
                  OS (Left Eye)
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {formatValue(osItem.sphere, "sphere")}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {formatValue(osItem.cylinder, "cylinder")}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {formatValue(osItem.axis, "axis")}
                </td>
                <td className="border border-slate-900 px-4 py-3 text-center font-mono text-lg">
                  {formatValue(osItem.add_power, "add")}
                </td>
                {(odItem?.prism || osItem?.prism) && (
                  <td className="border border-slate-900 px-4 py-3 text-center">
                    {osItem.prism || "-"}
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>

        {/* Pupillary Distance */}
        {prescription.pupillary_distance && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-900">
              Pupillary Distance (PD): {prescription.pupillary_distance} mm
            </p>
          </div>
        )}
      </div>

      {/* Diagnosis */}
      {prescription.diagnosis && (
        <div className="mb-6">
          <h4 className="mb-2 text-base font-bold text-slate-900">Diagnosis:</h4>
          <p className="text-slate-700">{prescription.diagnosis}</p>
        </div>
      )}

      {/* Lens Recommendation */}
      {odItem?.lens_type && (
        <div className="mb-6">
          <h4 className="mb-2 text-base font-bold text-slate-900">Recommended Lens Type:</h4>
          <p className="text-slate-700">{odItem.lens_type}</p>
        </div>
      )}

      {/* Frame Fitting Notes */}
      {prescription.frame_fitting_notes && (
        <div className="mb-6">
          <h4 className="mb-2 text-base font-bold text-slate-900">Frame Fitting Notes:</h4>
          <p className="text-slate-700">{prescription.frame_fitting_notes}</p>
        </div>
      )}

      {/* Additional Notes */}
      {prescription.notes && (
        <div className="mb-6">
          <h4 className="mb-2 text-base font-bold text-slate-900">Additional Notes:</h4>
          <p className="text-slate-700">{prescription.notes}</p>
        </div>
      )}

      {/* Signature Section */}
      <div className="mt-12 flex justify-end">
        <div className="text-center">
          <div className="mb-16" />
          <div className="border-t-2 border-slate-900 pt-2">
            <p className="font-semibold text-slate-900">{optometristName}</p>
            <p className="text-sm text-slate-600">Optometrist</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 border-t border-slate-300 pt-4 text-center text-xs text-slate-500">
        <p>
          This prescription is valid for 1 year from the date of issue. Please consult your
          optometrist if you experience any vision changes.
        </p>
        <p className="mt-2">Generated on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
});
