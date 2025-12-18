"use client";

import { Search, UserCircle2, LogOut, User, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { searchPatients } from "@/redux/patientsSlice";
import { logout } from "@/redux/authSlice";
import { toast } from "sonner";
import { Patient } from "@/types";
import { patientsApi } from "@/services/patientsApi";
import { PatientFormModal } from "@/components/patients/PatientFormModal";
import { useTenant } from "@/hooks/useTenant";

interface TopBarProps {
  onPatientSelect?: (patientId: string) => void;
}

export function TopBar({ onPatientSelect }: TopBarProps) {
  const [term, setTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { hospitalName } = useTenant();

  // Debounced search
  useEffect(() => {
    if (term.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(false);
      try {
        const response = await patientsApi.searchGlobal({ q: term.trim(), page_size: 5 });
        const patients = patientsApi.mapToPatients(response.items);
        setSearchResults(patients);
        setHasSearched(true);
        setShowDropdown(true); // Show dropdown even if no results
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
        setHasSearched(true);
        setShowDropdown(true); // Show dropdown even on error
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [term]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for patient creation to refresh search
  useEffect(() => {
    const handlePatientCreated = () => {
      // If we have a search term, refresh the search
      if (term.trim().length >= 2) {
        const timeoutId = setTimeout(async () => {
          setIsSearching(true);
          try {
            const response = await patientsApi.searchGlobal({ q: term.trim(), page_size: 5 });
            const patients = patientsApi.mapToPatients(response.items);
            setSearchResults(patients);
            setHasSearched(true);
            setShowDropdown(true);
          } catch (error) {
            console.error("Search failed:", error);
            setSearchResults([]);
            setHasSearched(true);
            setShowDropdown(true);
          } finally {
            setIsSearching(false);
          }
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    };

    window.addEventListener("patient:created", handlePatientCreated);
    return () => {
      window.removeEventListener("patient:created", handlePatientCreated);
    };
  }, [term]);

  const handlePatientClick = (patient: Patient) => {
    setShowDropdown(false);
    setTerm("");
    if (onPatientSelect) {
      onPatientSelect(patient.id);
    }
  };

  const runSearch = () => {
    if (term.trim()) {
      dispatch(searchPatients(term));
      window.location.hash = "#patients";
      setShowDropdown(false);
    }
  };

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 mb-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/95 px-6 py-4 shadow-lg shadow-slate-900/5 backdrop-blur-md">
      <div ref={searchRef} className="relative flex flex-1 items-center gap-3">
        <div className="relative flex flex-1 items-center gap-3 rounded-xl border-2 border-slate-200/60 bg-gradient-to-br from-slate-50 to-white px-4 py-2.5 shadow-inner transition-all duration-200 focus-within:border-sky-400 focus-within:bg-white focus-within:shadow-md focus-within:shadow-sky-500/10">
          <Search className="h-5 w-5 text-slate-400 transition-colors duration-200 group-focus-within:text-sky-500" />
          <input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (hasSearched || searchResults.length > 0) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              } else if (e.key === "Escape") {
                setShowDropdown(false);
              }
            }}
            placeholder="Search by patient, health ID, mobile..."
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          {hasSearched && !isSearching && searchResults.length === 0 && term.trim().length >= 2 && (
            <button
              onClick={() => {
                setShowPatientModal(true);
                setShowDropdown(false);
                setTerm("");
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition-all duration-200 hover:from-sky-600 hover:to-teal-600 hover:shadow-lg hover:shadow-sky-500/40 hover:scale-105 active:scale-100 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Patient
            </button>
          )}
          <button
            onClick={runSearch}
            className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition-all duration-200 hover:from-sky-600 hover:to-teal-600 hover:shadow-lg hover:shadow-sky-500/40 hover:scale-105 active:scale-100 whitespace-nowrap"
          >
            Search
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && term.trim().length >= 2 && (isSearching || hasSearched || searchResults.length > 0) && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-2xl rounded-xl border-2 border-slate-200/60 bg-white shadow-2xl shadow-slate-900/10 backdrop-blur-sm">
            {isSearching ? (
              <div className="p-6 text-center">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500"></div>
                  Searching...
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handlePatientClick(patient)}
                    className="w-full border-b border-slate-100 px-4 py-3.5 text-left transition-all duration-200 hover:bg-gradient-to-r hover:from-sky-50 hover:to-teal-50/50 active:bg-sky-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-teal-100 text-sky-700 shadow-sm ring-2 ring-white transition-transform duration-200 group-hover:scale-110">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <div className="mt-1 flex items-center gap-2.5 text-xs text-slate-500">
                          <span className="font-medium">{patient.mobile}</span>
                          <span className="text-slate-300">•</span>
                          <span>{patient.healthId}</span>
                          <span className="text-slate-300">•</span>
                          <span>{patient.age} years, {patient.gender}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {searchResults.length >= 5 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-center">
                    <button
                      onClick={runSearch}
                      className="group inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 transition-colors duration-200 hover:text-sky-700"
                    >
                      View all results
                      <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                )}
              </div>
            ) : hasSearched && !isSearching && searchResults.length === 0 ? (
              <div className="p-6 text-center text-sm font-medium text-slate-500">No patients found</div>
            ) : null}
          </div>
        )}
        
        {/* Patient Form Modal */}
        <PatientFormModal
          isOpen={showPatientModal}
          onClose={() => setShowPatientModal(false)}
        />
      </div>
      <div className="flex items-center gap-3">
        {/* Profile Section */}
        <div className="flex items-center gap-3 rounded-xl border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 px-4 py-2 shadow-sm transition-all duration-200 hover:border-sky-300 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-md ring-2 ring-white">
            <UserCircle2 className="h-6 w-6" />
          </div>
          <div className="text-xs leading-tight">
            <p className="font-bold text-slate-900 capitalize">
              {user?.role?.replace("_", " ") || "Admin"}
            </p>
            <p className="text-slate-500 font-medium">{hospitalName}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="group flex items-center gap-2 rounded-xl border-2 border-slate-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-rose-300 hover:bg-gradient-to-r hover:from-rose-50 hover:to-red-50 hover:text-rose-600 hover:shadow-md"
          title="Logout"
        >
          <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

