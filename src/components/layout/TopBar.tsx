"use client";

import { Search, UserCircle2, LogOut, User, Plus, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { searchPatients } from "@/redux/patientsSlice";
import { logout } from "@/redux/authSlice";
import { toast } from "sonner";
import { Patient } from "@/types";
import { patientsApi } from "@/services/patientsApi";
import { PatientFormModal } from "@/components/patients/PatientFormModal";
import { usersApi } from "@/services/usersApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate } from "@/utils/format";

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
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { hospitalName, tenant } = useTenant();
  const [fullName, setFullName] = useState<string | null>(null);

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

  // Fetch full name for the logged in user
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.user_id) return;
      try {
        const u = await usersApi.getById(user.user_id);
        if (!cancelled) setFullName(u.full_name || null);
      } catch (err) {
        console.error("Failed to fetch user details:", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.user_id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
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

  // Inline license utility functions to avoid Turbopack HMR issues
  const getDaysUntilExpiry = (expiryDate: string | null): number | null => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isExpiringSoon = (expiryDate: string | null, daysThreshold: number = 7): boolean => {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    if (daysUntil === null) return false;
    return daysUntil <= daysThreshold && daysUntil >= 0;
  };

  const isExpired = (expiryDate: string | null): boolean => {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    if (daysUntil === null) return false;
    return daysUntil < 0;
  };

  // Calculate license expiry status for color coding
  const licenseExpiryInfo = tenant?.license_valid_till ? (() => {
    const daysUntil = getDaysUntilExpiry(tenant.license_valid_till);
    const expired = isExpired(tenant.license_valid_till);
    const expiringSoon = isExpiringSoon(tenant.license_valid_till);
    const isUrgent = expired || expiringSoon;
    return {
      daysUntil,
      expired,
      expiringSoon,
      isUrgent,
      textColor: isUrgent ? "text-rose-600" : "text-emerald-600",
    };
  })() : null;

  return (
    <header className="sticky top-0 z-20 mb-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div ref={searchRef} className="relative flex flex-1 items-center">
        <div className="relative flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-all focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
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
            placeholder="Search patients by name, health ID, or mobile..."
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          {hasSearched && !isSearching && searchResults.length === 0 && term.trim().length >= 2 && (
            <button
              onClick={() => {
                setShowPatientModal(true);
                setShowDropdown(false);
                setTerm("");
              }}
              className="flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
          {term.trim().length >= 2 && (
            <button
              onClick={runSearch}
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600"
            >
              Search
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && term.trim().length >= 2 && (isSearching || hasSearched || searchResults.length > 0) && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-lg">
            {isSearching ? (
              <div className="p-4 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-slate-500">
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
                    className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{patient.name}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span>{patient.mobile}</span>
                          <span>•</span>
                          <span className="truncate">{patient.healthId}</span>
                          {patient.age && (
                            <>
                              <span>•</span>
                              <span>{patient.age} years</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {searchResults.length >= 5 && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center">
                    <button
                      onClick={runSearch}
                      className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
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
      
      {/* Profile Section with Dropdown */}
      <div ref={profileRef} className="relative">
        <button
          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {fullName || user?.role?.replace("_", " ") || "Admin"}
            </p>
            <p className="text-[10px] text-slate-500">{hospitalName}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showProfileDropdown ? "rotate-180" : ""}`} />
        </button>

        {/* Profile Dropdown */}
        {showProfileDropdown && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {fullName || user?.role?.replace("_", " ") || "Admin"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{hospitalName}</p>
              {tenant?.license_valid_till && licenseExpiryInfo && (
                <p className={`mt-1 text-[10px] ${licenseExpiryInfo.textColor} font-medium`}>
                  License expires: {formatDate(tenant.license_valid_till)}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

