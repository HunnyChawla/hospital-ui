"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LabBookingsList } from "@/components/lab-bookings/LabBookingsList";
import { LabBookingFormModal } from "@/components/lab-bookings/LabBookingFormModal";

export default function LabBookingsPage() {
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);

  // Handle query parameters for opening modals
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "add") {
      setShowModal(true);
    }
  }, [searchParams]);

  return (
    <div>
      <LabBookingsList />
      <LabBookingFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
