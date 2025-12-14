"use client";

import { searchPatients } from "@/redux/patientsSlice";
import { useAppDispatch } from "@/redux/hooks";
import { Search, RefreshCw } from "lucide-react";
import { useState } from "react";

export function PatientSearch() {
  const dispatch = useAppDispatch();
  const [term, setTerm] = useState("");

  const handleSearch = () => {
    dispatch(searchPatients(term));
  };

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by mobile, health ID, or name"
          className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      <button
        onClick={handleSearch}
        className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
      >
        Search
      </button>
      <button
        onClick={() => {
          setTerm("");
          dispatch(searchPatients(""));
        }}
        className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
      >
        <RefreshCw className="h-4 w-4" />
        Reset
      </button>
    </div>
  );
}

