"use client";

export default function DashboardPage() {
  return (
    <div>
      <div className="grid gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-lg font-semibold text-slate-900">Dashboard</p>
            <p className="text-xs text-slate-500">Hospital overview and key metrics</p>
          </div>
          {/* Dashboard components with analytics data */}
        </div>
      </div>
    </div>
  );
}
