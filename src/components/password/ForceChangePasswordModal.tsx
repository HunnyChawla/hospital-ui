"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useAppDispatch } from "@/redux/hooks";
import { clearMustChangePassword } from "@/redux/authSlice";
import { passwordApi } from "@/services/passwordApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";

interface ForceChangePasswordModalProps {
    isOpen: boolean;
}

interface ForceChangePasswordFormData {
    current_password: string;
    new_password: string;
    confirm_password: string;
}

export function ForceChangePasswordModal({ isOpen }: ForceChangePasswordModalProps) {
    const dispatch = useAppDispatch();
    const [mounted, setMounted] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ForceChangePasswordFormData>();

    const newPassword = watch("new_password");

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && mounted) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen, mounted]);

    const onSubmit = async (data: ForceChangePasswordFormData) => {
        if (data.new_password !== data.confirm_password) {
            toast.error("New passwords do not match");
            return;
        }

        if (data.current_password === data.new_password) {
            toast.error("New password must be different from current password");
            return;
        }

        setIsSubmitting(true);
        try {
            await passwordApi.changePassword({
                current_password: data.current_password,
                new_password: data.new_password,
            });
            toast.success("Password changed successfully! You can now continue.");
            dispatch(clearMustChangePassword());
        } catch (error: any) {
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                            <ShieldAlert className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Password Change Required</h2>
                            <p className="text-sm text-white/80">Your password was reset by an administrator</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-3">
                        <p className="text-sm text-amber-800">
                            For security reasons, you must change your password before continuing. Please enter your temporary password and choose a new one.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Current/Temporary Password */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">
                                Temporary Password <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showCurrentPassword ? "text" : "password"}
                                    {...register("current_password", {
                                        required: "Temporary password is required",
                                    })}
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                    placeholder="Enter temporary password"
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:shadow-xl hover:shadow-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Changing Password...
                                </span>
                            ) : (
                                "Change Password & Continue"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
