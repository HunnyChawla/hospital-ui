import { BedStatus } from "@/types";
import { BedDouble, Circle } from "lucide-react";

export const bedData: BedStatus[] = [
  { ward: "ICU", total: 18, occupied: 14 },
  { ward: "General", total: 80, occupied: 56 },
  { ward: "Private", total: 30, occupied: 18 },
];

export function BedOverview() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {bedData.map((bed) => {
        const occupancy = Math.round((bed.occupied / bed.total) * 100);
        const tone =
          occupancy > 85
            ? "text-rose-600 bg-rose-50 border-rose-100"
            : occupancy > 60
            ? "text-amber-600 bg-amber-50 border-amber-100"
            : "text-emerald-600 bg-emerald-50 border-emerald-100";
        return (
          <div
            key={bed.ward}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800">
                <BedDouble className="h-5 w-5 text-sky-600" />
                <p className="text-sm font-semibold">{bed.ward} Beds</p>
              </div>
              <span className={`pill ${tone}`}>{occupancy}% occupied</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
              <Circle className="h-2 w-2 fill-sky-500 text-sky-500" />
              <span>
                {bed.occupied} occupied / {bed.total - bed.occupied} vacant
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500"
                style={{ width: `${occupancy}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

