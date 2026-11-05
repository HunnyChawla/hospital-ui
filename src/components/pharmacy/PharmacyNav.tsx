"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Pill,
  Truck,
  ShoppingCart,
  PackageCheck,
  Boxes,
  ClipboardList,
  Receipt,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import clsx from "clsx";

const navLinks = [
  { label: "Dashboard", href: "/pharmacy", icon: LayoutDashboard },
  { label: "Dispensing", href: "/pharmacy/dispensing", icon: ClipboardList },
  { label: "Inventory", href: "/pharmacy/inventory", icon: Boxes },
  { label: "Medicines", href: "/pharmacy/medicines", icon: Pill },
  { label: "Suppliers", href: "/pharmacy/suppliers", icon: Truck },
  { label: "Purchase Orders", href: "/pharmacy/purchase-orders", icon: ShoppingCart },
  { label: "GRN Receipts", href: "/pharmacy/grn", icon: PackageCheck },
  { label: "Invoices", href: "/pharmacy/invoices", icon: Receipt },
  { label: "Returns", href: "/pharmacy/returns", icon: RotateCcw },
  { label: "Reports", href: "/pharmacy/reports", icon: BarChart3 },
];

export function PharmacyNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-2 mb-4 scrollbar-thin">
      {navLinks.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/pharmacy"
            ? pathname === "/pharmacy"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition cursor-pointer",
              isActive
                ? "bg-sky-50 text-sky-700 font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className={clsx("h-4 w-4", isActive ? "text-sky-600" : "text-slate-400")} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
