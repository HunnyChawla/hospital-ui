"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { passwordApi } from "@/services/passwordApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Lock, Eye, EyeOff, User } from "lucide-react";

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    onSuccess?: () => void;
}

interface ResetPasswordFormData {
    new_password: string;
    confirm_password: string;
}

export function ResetPasswordModal({
    isOpen,
    onClose,
    userId,
    userName,
    onSuccess,
}: ResetPasswordModalProps) {
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<ResetPasswordFormData>();

    const newPassword = watch("new_password");

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (data.new_password !== data.confirm_password) {
            toast.error("Passwords do not match");
            return;
        }

        setIsSubmitting(true);
        try {
            await passwordApi.resetPassword({
                user_id: userId,
                new_password: data.new_password,
            });
            toast.success(`Password reset successfully for ${userName}`);
            reset();
            onSuccess?.();
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
        <Modal isOpen={isOpen} onClose={handleClose} title="Reset User Password" size="sm">
            <div className="space-y-5">
                {/* User Info Banner */}
                <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                        <User className="h-5 w-5 text-sky-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900">{userName}</p>
                        <p className="text-xs text-slate-500">The user will be required to change this password on next login</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                            Confirm Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                {...register("confirm_password", {
                                    required: "Please confirm the password",
                                    validate: (value) =>
                                        value === newPassword || "Passwords do not match",
                                })}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                placeholder="Confirm password"
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
                                    Resetting...
                                </span>
                            ) : (
                                "Reset Password"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
