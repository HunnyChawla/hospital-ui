"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Users, Search, Loader2, Link as LinkIcon, AlertCircle, Stethoscope } from "lucide-react";
import { optometristMappingsApi, OptometristDoctorMapping } from "@/services/optometristMappingsApi";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
import { usersApi, User } from "@/services/usersApi";
import { getTenantIdForApi } from "@/utils/auth";
import { toast } from "sonner";

export default function OptometristMappingsPage() {
    const [mappings, setMappings] = useState<OptometristDoctorMapping[]>([]);
    const [optometrists, setOptometrists] = useState<User[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [selectedOptometristId, setSelectedOptometristId] = useState("");
    const [selectedDoctorId, setSelectedDoctorId] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
            const apiTenantId = getTenantIdForApi(tenantId || undefined);

            // Fetch all mappings (we'll fetch by optometrist for each if there's no bulk API, 
            // but let's assume we can fetch all or just list them. 
            // The requirement mentioned GET /opd/mappings/optometrist/{id}. 
            // Since we don't have a list all, we might need to fetch optometrists first.)

            const optsResponse = await usersApi.list({ role: "optometrist", page_size: 100 });
            setOptometrists(optsResponse.items);

            const docsResponse = await doctorsApi.list(apiTenantId || undefined);
            setDoctors(docsResponse);

            // Collect all mappings in parallel
            const mappingPromises = optsResponse.items.map(opt =>
                optometristMappingsApi.getOptometristDoctors(opt.id, apiTenantId || undefined)
                    .catch(e => {
                        console.error(`Error fetching mappings for optometrist ${opt.id}:`, e);
                        return [] as OptometristDoctorMapping[];
                    })
            );

            const allMappingsResults = await Promise.all(mappingPromises);
            const allMappings = allMappingsResults.flat();
            setMappings(allMappings);

        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to load mappings");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateMapping = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOptometristId || !selectedDoctorId) {
            toast.error("Please select both an optometrist and a doctor");
            return;
        }

        setSubmitting(true);
        try {
            const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
            await optometristMappingsApi.createMapping(
                { optometrist_id: selectedOptometristId, doctor_id: selectedDoctorId },
                tenantId || undefined
            );
            toast.success("Mapping created successfully");
            setShowModal(false);
            setSelectedOptometristId("");
            setSelectedDoctorId("");
            fetchData();
        } catch (error) {
            console.error("Failed to create mapping:", error);
            toast.error("Failed to create mapping");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteMapping = async (id: string) => {
        if (!confirm("Are you sure you want to delete this mapping?")) return;

        try {
            const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
            await optometristMappingsApi.deleteMapping(id, tenantId || undefined);
            toast.success("Mapping deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Failed to delete mapping:", error);
            toast.error("Failed to delete mapping");
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Optometrist Mappings</h1>
                    <p className="text-slate-500">Manage associations between optometrists and doctors</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm font-medium"
                >
                    <Plus className="h-5 w-5" />
                    Add Mapping
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
                    <span className="ml-2 text-slate-600">Loading mappings...</span>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-sm uppercase">
                    <table className="min-w-full divide-y divide-slate-200 uppercase">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                            <tr>
                                <th className="px-6 py-4 text-left">Optometrist</th>
                                <th className="px-6 py-4 text-left">Doctor</th>
                                <th className="px-6 py-4 text-right pr-12 font-bold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white uppercase">
                            {mappings.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="h-8 w-8 text-slate-300" />
                                            <p>No mappings found. Create one to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                mappings.map((mapping) => (
                                    <tr key={mapping.id} className="hover:bg-slate-50 transition-colors uppercase">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <span className="font-medium text-slate-900">
                                                    {optometrists.find(o => o.id === mapping.optometrist_id)?.full_name || "Unknown Optometrist"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
                                                    <Stethoscope className="h-4 w-4" />
                                                </div>
                                                <span className="font-medium text-slate-900">{mapping.doctor_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right uppercase">
                                            <button
                                                onClick={() => handleDeleteMapping(mapping.id)}
                                                className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-lg transition-colors uppercase"
                                                title="Delete Mapping"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Mapping Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-all">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Add New Mapping</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreateMapping} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Select Optometrist</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Users className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <select
                                        value={selectedOptometristId}
                                        onChange={(e) => setSelectedOptometristId(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-slate-50"
                                        required
                                    >
                                        <option value="">Select an optometrist...</option>
                                        {optometrists.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Select Doctor</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <LinkIcon className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <select
                                        value={selectedDoctorId}
                                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-slate-50"
                                        required
                                    >
                                        <option value="">Select a doctor...</option>
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id}>{doc.user_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : "Create Mapping"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Link is already imported from "lucide-react" or "next/link", but we used LinkIcon already.
