"use client";

import {
  Activity,
  BedDouble,
  Beaker,
  Cog,
  CreditCard,
  Home,
  LayoutList,
  Users2,
  Stethoscope,
  FlaskConical,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTenant } from "@/hooks/useTenant";

const navItems = [
  { label: "Dashboard", href: "#dashboard", icon: Home },
  { label: "Patients", href: "#patients", icon: Users2 },
  { label: "Doctors", href: "#doctors", icon: Stethoscope },
  { label: "Appointments/OPD", href: "#opd", icon: Activity },
  { label: "Lab Bookings", href: "#lab-bookings", icon: FlaskConical },
  { label: "Manage IPD", href: "#admissions", icon: BedDouble },
  { label: "Billing", href: "#billing", icon: CreditCard },
  { label: "Labs", href: "#labs", icon: Beaker },
  { label: "Queue", href: "#queue", icon: LayoutList },
  { label: "Manage Staff", href: "#users", icon: Users2 },
  { label: "Settings", href: "#settings", icon: Cog },
];

export function Sidebar() {
  const [hash, setHash] = useState<string>("#dashboard");
  const { hospitalName } = useTenant();

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash || "#dashboard");
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  return (
    <aside className="glass fixed left-0 top-0 hidden h-screen w-64 flex-shrink-0 flex-col px-6 py-8 text-sm text-slate-700 lg:flex">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-400 text-white shadow-lg">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Hospital Portal
          </p>
          <p className="text-lg font-semibold text-slate-900">{hospitalName}</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = hash === item.href || (hash === "" && item.href === "#dashboard");
          return (
            <button
              key={item.label}
              onClick={() => {
                window.location.hash = item.href;
                setHash(item.href);
              }}
              className={clsx(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-sky-50 hover:text-sky-700",
                active && "bg-sky-50 text-sky-700 font-semibold"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 p-[1px] shadow-lg">
        <div className="rounded-[11px] bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Live
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <p className="text-slate-800 font-semibold">Systems Healthy</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">99.9% uptime</p>
        </div>
      </div>
    </aside>
  );
}

