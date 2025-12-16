"use client";

import { Bell, Search, UserCircle2, LogOut, User, Plus } from "lucide-react";
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
    <header className="sticky top-0 z-20 mb-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-5 py-3 shadow-sm backdrop-blur">
      <div ref={searchRef} className="relative flex flex-1 items-center gap-3">
        <div className="relative flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 focus-within:border-sky-400 focus-within:bg-white">
          <Search className="h-5 w-5 text-slate-400" />
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
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {hasSearched && !isSearching && searchResults.length === 0 && term.trim().length >= 2 && (
            <button
              onClick={() => {
                setShowPatientModal(true);
                setShowDropdown(false);
                setTerm("");
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600 whitespace-nowrap min-w-[100px]"
            >
              <Plus className="h-3 w-3" />
              Add Patient
            </button>
          )}
          <button
            onClick={runSearch}
            className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600 whitespace-nowrap min-w-[100px]"
          >
            Search
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && term.trim().length >= 2 && (isSearching || hasSearched || searchResults.length > 0) && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            {isSearching ? (
              <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handlePatientClick(patient)}
                    className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span>{patient.mobile}</span>
                          <span>•</span>
                          <span>{patient.healthId}</span>
                          <span>•</span>
                          <span>{patient.age} years, {patient.gender}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {searchResults.length >= 5 && (
                  <div className="border-t border-slate-100 px-4 py-2 text-center">
                    <button
                      onClick={runSearch}
                      className="text-xs text-sky-600 hover:text-sky-700"
                    >
                      View all results →
                    </button>
                  </div>
                )}
              </div>
            ) : hasSearched && !isSearching && searchResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No patients found</div>
            ) : null}
          </div>
        )}
        
        {/* Patient Form Modal */}
        <PatientFormModal
          isOpen={showPatientModal}
          onClose={() => setShowPatientModal(false)}
        />
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
            <p className="text-slate-500">{hospitalName}</p>
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

