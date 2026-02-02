"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { passwordApi } from "@/services/passwordApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Lock, Eye, EyeOff } from "lucide-react";

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ChangePasswordFormData {
    current_password: string;
    new_password: string;
    confirm_password: string;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<ChangePasswordFormData>();

    const newPassword = watch("new_password");

    const onSubmit = async (data: ChangePasswordFormData) => {
        if (data.new_password !== data.confirm_password) {
            toast.error("New passwords do not match");
            return;
        }

        setIsSubmitting(true);
        try {
            await passwordApi.changePassword({
                current_password: data.current_password,
                new_password: data.new_password,
            });
            toast.success("Password changed successfully");
            reset();
            onClose();
        } catch (error: any) {
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Change Password" size="sm">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Current Password */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                        Current Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type={showCurrentPassword ? "text" : "password"}
                            {...register("current_password", {
                                required: "Current password is required",
                            })}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            placeholder="Enter current password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.current_password && (
                        <p className="text-xs text-rose-500">{errors.current_password.message}</p>
                    )}
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                        New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type={showNewPassword ? "text" : "password"}
                            {...register("new_password", {
                                required: "New password is required",
                                minLength: {
                                    value: 6,
                                    message: "Password must be at least 6 characters",
                                },
                            })}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            placeholder="Enter new password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.new_password && (
                        <p className="text-xs text-rose-500">{errors.new_password.message}</p>
                    )}
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                        Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            {...register("confirm_password", {
                                required: "Please confirm your new password",
                                validate: (value) =>
                                    value === newPassword || "Passwords do not match",
                            })}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            placeholder="Confirm new password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.confirm_password && (
                        <p className="text-xs text-rose-500">{errors.confirm_password.message}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Changing...
                            </span>
                        ) : (
                            "Change Password"
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
