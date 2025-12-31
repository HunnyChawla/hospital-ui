"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/hooks";
import { TransferBedRequest } from "@/services/admissionsApi";
import { bedsApi, Bed } from "@/services/bedsApi";
import { BedDouble } from "lucide-react";

interface TransferBedFormProps {
  currentBedId: string;
  onSuccess?: () => void;
  onSubmit: (data: TransferBedRequest) => Promise<void>;
}

export function TransferBedForm({ currentBedId, onSuccess, onSubmit }: TransferBedFormProps) {
  const [newBedId, setNewBedId] = useState("");
  const [reason, setReason] = useState("");
  const [beds, setBeds] = useState<Bed[]>([]);
  // Use Redux centralized wards cache (fetched once in dashboard layout)
  const wards = useAppSelector((s) => s.wards.list);
  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBeds = async () => {
      if (!selectedWardId) {
        setBeds([]);
        return;
      }

      setLoading(true);
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const response = await bedsApi.list({
          page: 1,
          page_size: 99,
          ward_id: selectedWardId,
          status: "available",
          tenant_id: tenantId || undefined,
        });
        // Filter out the current bed
        const availableBeds = response.items.filter((bed) => bed.id !== currentBedId);
        setBeds(availableBeds);
      } catch (error) {
        console.error("Failed to fetch beds:", error);
        setBeds([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBeds();
  }, [selectedWardId, currentBedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newBedId || !reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const transferData: TransferBedRequest = {
        new_bed_id: newBedId,
        reason: reason.trim(),
      };

      await onSubmit(transferData);
      onSuccess?.();
    } catch (error) {
      // Error handling is done in parent component
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWardName = (bed: Bed) => {
    return bed.ward_name || wards.find((w) => w.id === bed.ward_id)?.ward_name || "Unknown Ward";
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
      <label className="space-y-1">
        <span className="text-slate-600">
          Select Ward <span className="text-rose-500">*</span>
        </span>
        <select
          value={selectedWardId}
          onChange={(e) => {
            setSelectedWardId(e.target.value);
            setNewBedId(""); // Reset bed selection when ward changes
          }}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          required
        >
          <option value="">Select Ward</option>
          {wards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.ward_name} ({ward.ward_code})
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-slate-600 flex items-center gap-1">
          <BedDouble className="h-4 w-4" />
          Select New Bed <span className="text-rose-500">*</span>
        </span>
        {loading ? (
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Loading beds...
          </div>
        ) : beds.length === 0 && selectedWardId ? (
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No available beds in this ward
          </div>
        ) : (
          <select
            value={newBedId}
            onChange={(e) => setNewBedId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            required
            disabled={!selectedWardId || beds.length === 0}
          >
            <option value="">Select Bed</option>
            {beds.map((bed) => (
              <option key={bed.id} value={bed.id}>
                {bed.bed_number} - {getWardName(bed)} ({bed.bed_type})
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="space-y-1">
        <span className="text-slate-600">
          Reason for Transfer <span className="text-rose-500">*</span>
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          placeholder="Enter reason for bed transfer (e.g., Patient requires ICU)"
          required
        />
      </label>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !newBedId || !reason.trim()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Transferring..." : "Transfer Bed"}
        </button>
      </div>
    </form>
  );
}

