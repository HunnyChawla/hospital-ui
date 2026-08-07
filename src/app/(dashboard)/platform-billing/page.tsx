"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Receipt, ShieldAlert, Award, FileCheck, ArrowRight, ShieldCheck } from "lucide-react";
import { platformBillingApi } from "@/services/platformBillingApi";
import { useAppSelector } from "@/redux/hooks";
import { useRouter } from "next/navigation";

export default function PlatformBillingDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  const [stats, setStats] = useState({
    quotes: 0,
    invoices: 0,
    receipts: 0,
    agreements: 0,
  });
  const [loading, setLoading] = useState(true);

  // RBAC: Only platform owner allowed
  useEffect(() => {
    if (user && user.role !== "platform_owner") {
      router.replace("/");
    }
  }, [user, router]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [qRes, iRes, rRes, aRes] = await Promise.all([
          platformBillingApi.quotes.list({ page_size: 1 }),
          platformBillingApi.invoices.list({ page_size: 1 }),
          platformBillingApi.receipts.list({ page_size: 1 }),
          platformBillingApi.agreements.list({ page_size: 1 }),
        ]);

        setStats({
          quotes: qRes.total || 0,
          invoices: iRes.total || 0,
          receipts: rRes.total || 0,
          agreements: aRes.total || 0,
        });
      } catch (err) {
        console.error("Failed to load statistics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (user?.role !== "platform_owner") {
    return null;
  }

  const sections = [
    {
      title: "Quotes Manager",
      description: "Draft, send, and review commercial quotes proposed to prospective hospitals.",
      count: stats.quotes,
      icon: FileText,
      color: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50 border-blue-100",
      textColor: "text-blue-700",
      link: "/platform-billing/quotes",
    },
    {
      title: "Platform Invoices",
      description: "Track periodic subscription invoices, collect fees, and manage hospital accounts.",
      count: stats.invoices,
      icon: Receipt,
      color: "from-sky-500 to-cyan-600",
      bgLight: "bg-sky-50 border-sky-100",
      textColor: "text-sky-700",
      link: "/platform-billing/invoices",
    },
    {
      title: "Payment Receipts",
      description: "Generate and download formal payment receipts for received subscription bank transfers.",
      count: stats.receipts,
      icon: ShieldCheck,
      color: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50 border-emerald-100",
      textColor: "text-emerald-700",
      link: "/platform-billing/receipts",
    },
    {
      title: "Hospital Agreements",
      description: "Manage contracts, SLA documents, customize legal clauses, and track signed agreement PDFs.",
      count: stats.agreements,
      icon: FileCheck,
      color: "from-violet-500 to-fuchsia-600",
      bgLight: "bg-violet-50 border-violet-100",
      textColor: "text-violet-700",
      link: "/platform-billing/agreements",
    },
  ];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Premium Glassmorphic Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Award className="h-3.5 w-3.5" /> Platform Admin Portal
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Platform Documents & Billing
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Centralized platform owner workspace to customize SLA clauses, issue official quotes, track subscription invoices, and manage client hospital agreements.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <div
              key={sec.title}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-slate-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`rounded-2xl bg-gradient-to-r ${sec.color} p-3.5 text-white shadow-md`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className={`rounded-xl px-3 py-1 text-xs font-bold ${sec.bgLight} ${sec.textColor} border`}>
                    {loading ? "..." : `${sec.count} Records`}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-650 transition">
                    {sec.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {sec.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-150">
                <Link
                  href={sec.link}
                  className={`inline-flex items-center gap-1.5 text-sm font-bold ${sec.textColor} hover:opacity-80 transition group-hover:translate-x-1 duration-200`}
                >
                  Configure and View <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
