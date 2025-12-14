"use client";

import { Bell, Search, UserCircle2, LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { searchPatients } from "@/redux/patientsSlice";
import { logout } from "@/redux/authSlice";
import { toast } from "sonner";

export function TopBar() {
  const [term, setTerm] = useState("");
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);

  const runSearch = () => {
    dispatch(searchPatients(term));
    window.location.hash = "#patients";
  };

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 mb-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-5 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 focus-within:border-sky-400 focus-within:bg-white">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="Search by patient, health ID, mobile..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        <button
          onClick={runSearch}
          className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600"
        >
          Search
        </button>
      </div>
      <div className="ml-4 flex items-center gap-3">
        <button className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-600">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <UserCircle2 className="h-6 w-6 text-sky-600" />
          <div className="text-xs leading-tight">
            <p className="font-semibold text-slate-800">
              {user?.role?.replace("_", " ") || "Admin"}
            </p>
            <p className="text-slate-500">Tenant: {user?.tenant_id?.slice(0, 8) || "N/A"}...</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

