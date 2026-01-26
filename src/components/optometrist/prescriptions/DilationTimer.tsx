import { useState, useEffect, useRef } from "react";
import { Clock, CheckCircle, ChevronDown, ChevronUp, Timer } from "lucide-react";
import { OptometristVisitResponse } from "@/services/optometristVisitsApi";

interface DilationTimerProps {
    visitId: string;
    visitData?: OptometristVisitResponse;
    onStartDilation: (minutes: number) => Promise<void>;
    onCompleteDilation: () => Promise<void>;
}

export function DilationTimer({
    visitData,
    onStartDilation,
    onCompleteDilation,
}: DilationTimerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDuration, setSelectedDuration] = useState<number>(20);
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!visitData) return null;

    const isDilationInProgress =
        visitData.dilation_started_at && !visitData.dilation_completed_at;
    const isDilationCompleted = !!visitData.dilation_completed_at;

    const handleStart = async () => {
        try {
            setLoading(true);
            await onStartDilation(selectedDuration);
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to start dilation:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        try {
            setLoading(true);
            await onCompleteDilation();
        } catch (error) {
            console.error("Failed to complete dilation:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (isDilationCompleted) {
        const completedAt = new Date(visitData.dilation_completed_at!);
        return (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200 shadow-sm animate-in fade-in zoom-in duration-300">
                <CheckCircle className="h-4 w-4" />
                <span className="font-semibold">Dilation Completed</span>
                <span className="text-emerald-600 bg-white/50 px-2 py-0.5 rounded text-xs font-medium border border-emerald-100">
                    {formatTime(completedAt)}
                </span>
            </div>
        );
    }

    if (isDilationInProgress) {
        const startedAt = new Date(visitData.dilation_started_at!);
        const duration = visitData.dilation_duration_minutes || 0;
        const expectedCompletion = new Date(startedAt.getTime() + duration * 60000);
        const now = currentTime;
        const isOverdue = now > expectedCompletion;

        return (
            <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                <div
                    className={`flex items-center gap-3 px-4 py-1.5 rounded-full border shadow-sm transition-colors ${isOverdue
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-blue-50 border-blue-200 text-blue-800"
                        }`}
                >
                    <div className="relative flex items-center justify-center">
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isOverdue ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                        <Timer className="relative h-4 w-4" />
                    </div>

                    <div className="flex flex-col text-xs leading-none gap-0.5">
                        <span className="font-semibold uppercase tracking-wider">{isOverdue ? 'Overdue' : 'Dilation In Progress'}</span>
                        <span className="opacity-80">Exp: {formatTime(expectedCompletion)}</span>
                    </div>
                </div>

                <button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex items-center gap-2 h-9 px-4 text-xs font-bold text-white uppercase tracking-wide bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full hover:from-emerald-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <CheckCircle className="h-4 w-4" />
                    Complete
                </button>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 h-10 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 ${isOpen ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            >
                <Clock className="h-4 w-4" />
                Start Dilation
                {isOpen ? <ChevronUp className="h-4 w-4 opacity-80" /> : <ChevronDown className="h-4 w-4 opacity-80" />}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-72 p-4 bg-white border border-slate-100 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-4">
                        <div>
                            <h4 className="flex items-center gap-2 font-semibold text-sm text-slate-800 mb-3">
                                <Clock className="h-4 w-4 text-slate-500" />
                                Select Duration
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                {[15, 20, 30, 45, 60].map((mins) => (
                                    <button
                                        key={mins}
                                        onClick={() => setSelectedDuration(mins)}
                                        className={`h-9 text-xs font-semibold rounded-lg border transition-all ${selectedDuration === mins
                                            ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-1 ring-blue-200"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                            }`}
                                    >
                                        {mins} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleStart}
                            disabled={loading}
                            className="w-full h-10 flex items-center justify-center gap-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Start Timer'}
                        </button>

                        <div className="text-[10px] text-slate-400 text-center leading-tight">
                            Timer will continue running even if you close this window.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
