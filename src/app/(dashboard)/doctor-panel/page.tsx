"use client";

export default function DoctorPanelPage() {
  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-lg font-semibold text-slate-900">My Panel</p>
          <p className="text-xs text-slate-500">Doctor's personal dashboard and patient management</p>
        </div>
        {/* Doctor panel components will use React Query */}
      </div>
    </div>
  );
}
