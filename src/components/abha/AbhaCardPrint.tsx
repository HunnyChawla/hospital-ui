"use client";

import { forwardRef } from "react";

interface AbhaCardPrintProps {
  imageUrl: string;
}

export const AbhaCardPrint = forwardRef<HTMLDivElement, AbhaCardPrintProps>(({ imageUrl }, ref) => (
  <div ref={ref} className="print-content">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={imageUrl} alt="ABHA Card" style={{ width: "100%" }} />
  </div>
));

AbhaCardPrint.displayName = "AbhaCardPrint";
