"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { Modal } from "@/components/common/Modal";
import { AbhaCardPrint } from "@/components/abha/AbhaCardPrint";

export interface AbhaCardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export function AbhaCardPreviewModal({ isOpen, onClose, imageUrl }: AbhaCardPreviewModalProps) {
  const printComponentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: "ABHA_Card",
  });

  if (!imageUrl) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ABHA Card" size="lg" closeOnOutsideClick={false}>
      <div className="space-y-5">
        <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="ABHA Card" className="max-w-full rounded-lg shadow-sm" />
        </div>

        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <AbhaCardPrint ref={printComponentRef} imageUrl={imageUrl} />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => handlePrint()}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
