"use client";

import { useEffect, useState } from "react";
import { analyticsApi } from "@/services/analyticsApi";
import { currency } from "@/utils/format";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface DailyRevenueData {
  today: {
    collected: number;
    outstanding: number;
    invoiced: number;
  };
  yesterday: {
    collected: number;
    outstanding: number;
    invoiced: number;
  };
  loading: boolean;
}

export function DailyRevenueCard() {
  const [revenueData, setRevenueData] = useState<DailyRevenueData>({
    today: { collected: 0, outstanding: 0, invoiced: 0 },
    yesterday: { collected: 0, outstanding: 0, invoiced: 0 },
    loading: true,
  });

  useEffect(() => {
    const fetchDailyRevenue = async () => {
      try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayStr = today.toISOString().split("T")[0];
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        // Fetch today's revenue
        const todayResponse = await analyticsApi.revenue({
          start_date: todayStr,
          end_date: todayStr,
          granularity: "daily",
        });

        // Fetch yesterday's revenue
        const yesterdayResponse = await analyticsApi.revenue({
          start_date: yesterdayStr,
          end_date: yesterdayStr,
          granularity: "daily",
        });

        const todayData = todayResponse.data[0] || {
          collected_amount: 0,
          outstanding_amount: 0,
          invoiced_amount: 0,
        };

        const yesterdayData = yesterdayResponse.data[0] || {
          collected_amount: 0,
          outstanding_amount: 0,
          invoiced_amount: 0,
        };

        setRevenueData({
          today: {
            collected: todayData.collected_amount,
            outstanding: todayData.outstanding_amount,
            invoiced: todayData.invoiced_amount,
          },
          yesterday: {
            collected: yesterdayData.collected_amount,
            outstanding: yesterdayData.outstanding_amount,
            invoiced: yesterdayData.invoiced_amount,
          },
          loading: false,
        });
      } catch (error) {
        console.error("Failed to fetch daily revenue:", error);
        setRevenueData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchDailyRevenue();
  }, []);

  const collectedChange = revenueData.today.collected - revenueData.yesterday.collected;
  const collectedChangePercent =
    revenueData.yesterday.collected > 0
      ? ((collectedChange / revenueData.yesterday.collected) * 100).toFixed(1)
      : revenueData.today.collected > 0
      ? "100"
      : "0";

  if (revenueData.loading) {
    return (
      <div className="card group relative overflow-hidden">
        <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-100 to-white blur-3xl transition-all group-hover:scale-110" />
        <div className="relative flex items-start justify-between p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Daily Revenue
            </p>
            <div className="mt-2 h-9 w-32 animate-pulse rounded bg-slate-200"></div>
            <div className="mt-1.5 h-4 w-24 animate-pulse rounded bg-slate-200"></div>
          </div>
          <div className="rounded-2xl p-2.5 bg-emerald-50 text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card group relative overflow-hidden">
      <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-100 to-white blur-3xl transition-all group-hover:scale-110" />
      <div className="relative p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Daily Revenue
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {currency(revenueData.today.collected)}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">Today collected</p>
          </div>
          <div className="rounded-2xl p-2.5 bg-emerald-50 text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Compact comparison */}
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Yesterday</span>
            <span className="font-semibold text-slate-900">
              {currency(revenueData.yesterday.collected)}
            </span>
          </div>
          {collectedChange !== 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Change</span>
              <div className={`flex items-center gap-1 font-semibold ${collectedChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {collectedChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{collectedChangePercent}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

