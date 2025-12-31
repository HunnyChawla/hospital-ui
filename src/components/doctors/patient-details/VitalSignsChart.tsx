"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { VitalSignsTrend } from "@/types";

interface VitalSignsChartProps {
  trends: VitalSignsTrend[];
  loading?: boolean;
}

type MetricType = "systolic_bp" | "diastolic_bp" | "pulse_rate" | "temperature" | "spo2" | "weight";

const metricConfig = {
  systolic_bp: {
    label: "Systolic BP",
    color: "#ef4444",
    unit: "mmHg",
    normalMin: 90,
    normalMax: 120,
  },
  diastolic_bp: {
    label: "Diastolic BP",
    color: "#f97316",
    unit: "mmHg",
    normalMin: 60,
    normalMax: 80,
  },
  pulse_rate: {
    label: "Pulse Rate",
    color: "#0ea5e9",
    unit: "bpm",
    normalMin: 60,
    normalMax: 100,
  },
  temperature: {
    label: "Temperature",
    color: "#f59e0b",
    unit: "°F",
    normalMin: 97,
    normalMax: 99,
  },
  spo2: {
    label: "SpO2",
    color: "#10b981",
    unit: "%",
    normalMin: 95,
    normalMax: 100,
  },
  weight: {
    label: "Weight",
    color: "#8b5cf6",
    unit: "kg",
    normalMin: null,
    normalMax: null,
  },
};

export const VitalSignsChart: React.FC<VitalSignsChartProps> = ({
  trends,
  loading = false,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("pulse_rate");

  const config = metricConfig[selectedMetric];

  // Format data for the chart
  const chartData = trends.map((trend) => ({
    date: new Date(trend.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: trend[selectedMetric] || null,
  }));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">
          No vital signs data available for trend analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(metricConfig).map(([key, value]) => (
          <button
            key={key}
            onClick={() => setSelectedMetric(key as MetricType)}
            className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition ${
              selectedMetric === key
                ? "border-sky-500 bg-sky-50 text-sky-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {value.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-bold text-slate-900">{config.label} Trend</h4>
          <span className="text-sm text-slate-600">
            Last {chartData.length} days
          </span>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="#64748b"
              style={{ fontSize: "12px" }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              formatter={(value: any) => [`${value} ${config.unit}`, config.label]}
            />

            {/* Normal range reference lines */}
            {config.normalMin !== null && (
              <ReferenceLine
                y={config.normalMin}
                stroke="#10b981"
                strokeDasharray="3 3"
                label={{
                  value: `Min: ${config.normalMin}`,
                  position: "left",
                  fill: "#10b981",
                  fontSize: 10,
                }}
              />
            )}
            {config.normalMax !== null && (
              <ReferenceLine
                y={config.normalMax}
                stroke="#10b981"
                strokeDasharray="3 3"
                label={{
                  value: `Max: ${config.normalMax}`,
                  position: "left",
                  fill: "#10b981",
                  fontSize: 10,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={3}
              dot={{ fill: config.color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        {config.normalMin !== null && config.normalMax !== null && (
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="h-2 w-8 rounded-full bg-emerald-500" />
              <span>Normal Range: {config.normalMin} - {config.normalMax} {config.unit}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
