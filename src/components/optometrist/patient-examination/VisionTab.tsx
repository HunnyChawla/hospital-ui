"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { VisionRecord, CreateVisionRequest } from "@/types";
import { useAppDispatch } from "@/redux/hooks";
import { addVisionRecord } from "@/redux/optometryDataSlice";

interface VisionTabProps {
    patientId: string;
    visitId: string;
    optometristId: string;
    visionRecords: VisionRecord[];
    loading?: boolean;
    onRefresh: () => void;
}

interface VisionFormValues {
    // Right Eye (OD)
    od_ucva_distance: string;
    od_ph_va: string;
    od_va_with_current_specs: string;
    od_bcva_distance: string;
    od_near_ucva: string;
    od_near_with_current_specs: string;
    od_near_bcva: string;

    // Left Eye (OS)
    os_ucva_distance: string;
    os_ph_va: string;
    os_va_with_current_specs: string;
    os_bcva_distance: string;
    os_near_ucva: string;
    os_near_with_current_specs: string;
    os_near_bcva: string;

    notes: string;
}

export function VisionTab({
    patientId,
    visitId,
    optometristId,
    visionRecords,
    loading = false,
    onRefresh,
}: VisionTabProps) {
    const dispatch = useAppDispatch();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get the most recent record for this visit, or the latest overall
    const currentRecord =
        visionRecords.find((r) => r.visit_id === visitId) || visionRecords[0];

    const { register, handleSubmit, reset, setValue } = useForm<VisionFormValues>({
        defaultValues: {
            od_ucva_distance: "",
            od_ph_va: "",
            od_va_with_current_specs: "",
            od_bcva_distance: "",
            od_near_ucva: "",
            od_near_with_current_specs: "",
            od_near_bcva: "",
            os_ucva_distance: "",
            os_ph_va: "",
            os_va_with_current_specs: "",
            os_bcva_distance: "",
            os_near_ucva: "",
            os_near_with_current_specs: "",
            os_near_bcva: "",
            notes: "",
        },
    });

    // Populate form when record loads
    useEffect(() => {
        if (currentRecord) {
            setValue("od_ucva_distance", currentRecord.od_ucva_distance || "");
            setValue("od_ph_va", currentRecord.od_ph_va || "");
            setValue("od_va_with_current_specs", currentRecord.od_va_with_current_specs || "");
            setValue("od_bcva_distance", currentRecord.od_bcva_distance || "");
            setValue("od_near_ucva", currentRecord.od_near_ucva || "");
            setValue("od_near_with_current_specs", currentRecord.od_near_with_current_specs || "");
            setValue("od_near_bcva", currentRecord.od_near_bcva || "");
            setValue("os_ucva_distance", currentRecord.os_ucva_distance || "");
            setValue("os_ph_va", currentRecord.os_ph_va || "");
            setValue("os_va_with_current_specs", currentRecord.os_va_with_current_specs || "");
            setValue("os_bcva_distance", currentRecord.os_bcva_distance || "");
            setValue("os_near_ucva", currentRecord.os_near_ucva || "");
            setValue("os_near_with_current_specs", currentRecord.os_near_with_current_specs || "");
            setValue("os_near_bcva", currentRecord.os_near_bcva || "");
            setValue("notes", currentRecord.notes || "");
        }
    }, [currentRecord, setValue]);

    const onSubmit = async (data: VisionFormValues) => {
        setIsSubmitting(true);
        try {
            const payload: CreateVisionRequest = {
                patient_id: patientId,
                visit_id: visitId,
                optometrist_id: optometristId,
                ...data,
            };

            await dispatch(addVisionRecord({ data: payload })).unwrap();
            toast.success("Vision record saved successfully");
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to save vision record");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const InputField = ({
        name,
        label,
        placeholder = "6/6",
    }: {
        name: keyof VisionFormValues;
        label: string;
        placeholder?: string;
    }) => (
        <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
            </label>
            <input
                {...register(name)}
                type="text"
                placeholder={placeholder}
                className="w-full text-sm rounded-md border-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4">
            <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 sm:p-6 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Vision / Visual Acuity</h3>
                            <p className="text-sm text-slate-500">
                                Record distance and near visual acuity for both eyes.
                            </p>
                        </div>
                        {(isSubmitting || loading) && (
                            <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Right Eye (OD) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-xs">
                                    OD
                                </span>
                                <h4 className="font-semibold text-slate-700">Right Eye</h4>
                            </div>

                            <div className="space-y-4">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distance</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField name="od_ucva_distance" label="UCVA (Uncorrected)" />
                                    <InputField name="od_ph_va" label="Pinhole (PH)" />
                                    <InputField name="od_va_with_current_specs" label="With Current Specs" />
                                    <InputField name="od_bcva_distance" label="BCVA (Best Corrected)" />
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Near</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField name="od_near_ucva" label="Near UCVA" placeholder="N6" />
                                    <InputField name="od_near_with_current_specs" label="Near w/ Specs" placeholder="N6" />
                                    <InputField name="od_near_bcva" label="Near BCVA" placeholder="N6" />
                                </div>
                            </div>
                        </div>

                        {/* Left Eye (OS) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded text-xs">
                                    OS
                                </span>
                                <h4 className="font-semibold text-slate-700">Left Eye</h4>
                            </div>

                            <div className="space-y-4">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distance</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField name="os_ucva_distance" label="UCVA (Uncorrected)" />
                                    <InputField name="os_ph_va" label="Pinhole (PH)" />
                                    <InputField name="os_va_with_current_specs" label="With Current Specs" />
                                    <InputField name="os_bcva_distance" label="BCVA (Best Corrected)" />
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Near</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField name="os_near_ucva" label="Near UCVA" placeholder="N6" />
                                    <InputField name="os_near_with_current_specs" label="Near w/ Specs" placeholder="N6" />
                                    <InputField name="os_near_bcva" label="Near BCVA" placeholder="N6" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="max-w-xxl">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Additional Notes
                            </label>
                            <textarea
                                {...register("notes")}
                                rows={3}
                                className="w-full rounded-md border-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 text-sm"
                                placeholder="Any observations regarding vision or visual acuity..."
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting || loading}
                        className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white px-6 py-2.5 rounded-lg hover:from-sky-700 hover:to-blue-700 shadow-sm transition-all disabled:opacity-50 font-medium"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Save Vision Record
                    </button>
                </div>
            </form>
        </div>
    );
}
