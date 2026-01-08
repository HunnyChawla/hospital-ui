import React, { forwardRef } from "react";
import type { OptometryPrescription } from "@/types";

interface DoctorPrescriptionPrintProps {
    prescription: OptometryPrescription;
    hospitalDetails?: {
        name: string;
        address: string;
        phone: string;
        logo?: string;
    };
}

export const DoctorPrescriptionPrint = forwardRef<HTMLDivElement, DoctorPrescriptionPrintProps>(
    ({ prescription, hospitalDetails }, ref) => {

        // Helper to format date
        const formatDate = (dateStr?: string | null) => {
            if (!dateStr) return "";
            return new Date(dateStr).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        };

        return (
            <div ref={ref} className="p-8 bg-white text-black print:p-0 font-serif max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
                    <div className="flex gap-4 items-center">
                        {hospitalDetails?.logo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={hospitalDetails.logo}
                                alt="Hospital Logo"
                                className="h-16 w-16 object-contain"
                            />
                        )}
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
                                {hospitalDetails?.name || "Eye Hospital"}
                            </h1>
                            <p className="text-sm text-slate-600 whitespace-pre-line">
                                {hospitalDetails?.address}
                            </p>
                            <p className="text-sm text-slate-600">
                                Phone: {hospitalDetails?.phone}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold text-slate-800">
                            {prescription.doctor_name || "Dr. Optometrist"}
                        </h2>
                        <p className="text-sm text-slate-600">Ophthalmologist</p>
                    </div>
                </div>

                {/* Patient Details */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm border-b border-slate-300 pb-4">
                    <div className="flex">
                        <span className="font-bold w-24">Patient Name:</span>
                        <span>{prescription.patient_name}</span>
                    </div>
                    <div className="flex">
                        <span className="font-bold w-24">Date:</span>
                        <span>{formatDate(prescription.created_at)}</span>
                    </div>
                    <div className="flex">
                        <span className="font-bold w-24">ID / UHID:</span>
                        <span>{prescription.patient_id}</span>
                    </div>
                    <div className="flex">
                        <span className="font-bold w-24">Visit ID:</span>
                        <span>{prescription.visit_id}</span>
                    </div>
                </div>

                {/* Diagnosis */}
                {prescription.diagnosis && (
                    <div className="mb-6">
                        <h3 className="font-bold text-base uppercase border-b border-slate-200 mb-2">Diagnosis</h3>
                        <p className="text-sm whitespace-pre-wrap">{prescription.diagnosis}</p>
                    </div>
                )}

                {/* Optical Prescription Table */}
                {(prescription.items?.length > 0 || prescription.lens_type || prescription.pupillary_distance) && (
                    <div className="mb-6">
                        <h3 className="font-bold text-base uppercase border-b border-slate-200 mb-3">Glasses Prescription</h3>

                        <table className="w-full text-sm border-collapse border border-slate-300 mb-3">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="border border-slate-300 p-1.5 text-left w-16">Eye</th>
                                    <th className="border border-slate-300 p-1.5 text-center">Sph</th>
                                    <th className="border border-slate-300 p-1.5 text-center">Cyl</th>
                                    <th className="border border-slate-300 p-1.5 text-center">Axis</th>
                                    <th className="border border-slate-300 p-1.5 text-center">Add</th>
                                    <th className="border border-slate-300 p-1.5 text-center">VA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Right Eye (OD) */}
                                {prescription.items.filter(i => i.eye === 'OD').map(item => (
                                    <tr key={item.id}>
                                        <td className="border border-slate-300 p-1.5 font-bold">RE (OD)</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.sphere || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.cylinder || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.axis || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.add_power || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.visual_acuity || "-"}</td>
                                    </tr>
                                ))}
                                {/* Left Eye (OS) */}
                                {prescription.items.filter(i => i.eye === 'OS').map(item => (
                                    <tr key={item.id}>
                                        <td className="border border-slate-300 p-1.5 font-bold">LE (OS)</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.sphere || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.cylinder || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.axis || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.add_power || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.visual_acuity || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded">
                            {prescription.lens_type && (
                                <div><span className="font-semibold">Lens Type:</span> {prescription.lens_type}</div>
                            )}
                            {prescription.lens_material && (
                                <div><span className="font-semibold">Material:</span> {prescription.lens_material}</div>
                            )}
                            {prescription.coatings && prescription.coatings.length > 0 && (
                                <div className="col-span-2"><span className="font-semibold">Coatings:</span> {prescription.coatings.join(", ")}</div>
                            )}
                            {prescription.pupillary_distance && (
                                <div><span className="font-semibold">IPD:</span> {prescription.pupillary_distance} mm</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Medicines (Rx) */}
                {prescription.medicine_items && prescription.medicine_items.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-bold text-base uppercase border-b border-slate-200 mb-3 flex items-center gap-2">
                            <span className="text-xl">Rx</span> Medicines
                        </h3>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-slate-500 text-xs uppercase">
                                    <th className="py-2 w-1/2">Medicine Name</th>
                                    <th className="py-2">Dosage</th>
                                    <th className="py-2">Frequency</th>
                                    <th className="py-2">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prescription.medicine_items.map((med, idx) => (
                                    <tr key={med.id || idx} className="border-b border-slate-100 last:border-0">
                                        <td className="py-2 pr-2">
                                            <div className="font-bold">{med.medicine_name}</div>
                                            {med.instructions && <div className="text-xs text-slate-500 italic">{med.instructions}</div>}
                                        </td>
                                        <td className="py-2 text-slate-700">{med.dosage}</td>
                                        <td className="py-2 text-slate-700">{med.frequency}</td>
                                        <td className="py-2 text-slate-700">{med.duration}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Advice / Plan */}
                {(prescription.advice_items?.length! > 0 || prescription.plan_of_action) && (
                    <div className="mb-6">
                        <h3 className="font-bold text-base uppercase border-b border-slate-200 mb-3">Advice & Plan</h3>

                        {prescription.plan_of_action && (
                            <div className="mb-3">
                                <p className="text-sm font-semibold mb-1">Plan of Action:</p>
                                <p className="text-sm whitespace-pre-wrap text-slate-700 bg-slate-50 p-2 rounded">{prescription.plan_of_action}</p>
                            </div>
                        )}

                        {prescription.advice_items && prescription.advice_items.length > 0 && (
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                                {prescription.advice_items.map((advice, idx) => (
                                    <li key={advice.id || idx}>
                                        <span className="font-medium">{advice.advice_type}:</span> {advice.description}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {prescription.remarks && (
                            <div className="mt-3 text-sm">
                                <span className="font-bold">Remarks:</span> {prescription.remarks}
                            </div>
                        )}
                    </div>
                )}

                {/* Follow Up */}
                {prescription.followup_date && (
                    <div className="mb-10 text-sm p-3 border border-slate-200 rounded inline-block">
                        <span className="font-bold">Follow Up:</span> {formatDate(prescription.followup_date)}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 flex justify-between items-end">
                    <div className="text-xs text-slate-400">
                        <p>Generated on {new Date().toLocaleString()}</p>
                        <p className="mt-1">Not valid for medico-legal purposes.</p>
                    </div>
                    <div className="text-center w-48">
                        {/* Signature area */}
                        <div className="h-16 border-b border-slate-400 mb-2"></div>
                        <p className="font-bold text-sm">{prescription.doctor_name}</p>
                        <p className="text-xs text-slate-500">Signature</p>
                    </div>
                </div>
            </div>
        );
    }
);

DoctorPrescriptionPrint.displayName = "DoctorPrescriptionPrint";
