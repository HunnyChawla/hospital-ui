"use client";

import { Modal } from "@/components/common/Modal";
import { formatDate } from "@/utils/format";
import { currency } from "@/utils/format";
import { useState } from "react";

type ChartDataPoint = {
  period: string;
  value: number;
};

type DetailedChartModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: ChartDataPoint[];
  chartType: "line" | "area" | "bar";
  color: "emerald" | "sky" | "amber" | "fuchsia" | "purple" | "indigo";
  formatValue?: (value: number) => string;
};

export function DetailedChartModal({
  isOpen,
  onClose,
  title,
  data,
  chartType,
  color,
  formatValue = (v) => v.toString(),
}: DetailedChartModalProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const colorClasses = {
    emerald: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.1)", point: "#10b981" },
    sky: { stroke: "#0ea5e9", fill: "rgba(14, 165, 233, 0.1)", point: "#0ea5e9" },
    amber: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.1)", point: "#f59e0b" },
    fuchsia: { stroke: "#d946ef", fill: "rgba(217, 70, 239, 0.1)", point: "#d946ef" },
    purple: { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.1)", point: "#a855f7" },
    indigo: { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.1)", point: "#6366f1" },
  };

  const colors = colorClasses[color];

  const getX = (index: number) => {
    return padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  };

  const getY = (value: number) => {
    const range = maxValue - minValue || 1;
    const normalized = (value - minValue) / range;
    return padding.top + chartHeight - normalized * chartHeight;
  };

  const points = data.map((d, idx) => ({
    x: getX(idx),
    y: getY(d.value),
    value: d.value,
    period: d.period,
  }));

  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Minimum</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatValue(minValue)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Maximum</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatValue(maxValue)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Average</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatValue(data.reduce((sum, d) => sum + d.value, 0) / data.length)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="overflow-visible"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + chartHeight - ratio * chartHeight;
              const value = minValue + (maxValue - minValue) * ratio;
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-xs fill-slate-500"
                  >
                    {formatValue(value)}
                  </text>
                </g>
              );
            })}

            {/* Chart area */}
            {chartType === "area" && (
              <polygon
                points={`${padding.left},${padding.top + chartHeight} ${linePath} ${width - padding.right},${padding.top + chartHeight}`}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth="1"
              />
            )}

            {/* Line or bar */}
            {chartType === "line" || chartType === "area" ? (
              <>
                <polyline
                  points={linePath}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((point, idx) => (
                  <g key={idx}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={hoveredIndex === idx ? 6 : 4}
                      fill={colors.point}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                    {hoveredIndex === idx && (
                      <g>
                        <rect
                          x={point.x - 40}
                          y={point.y - 50}
                          width="80"
                          height="35"
                          rx="4"
                          fill="#1e293b"
                          className="shadow-lg"
                        />
                        <text
                          x={point.x}
                          y={point.y - 35}
                          textAnchor="middle"
                          className="text-xs fill-white font-semibold"
                        >
                          {formatValue(point.value)}
                        </text>
                        <text
                          x={point.x}
                          y={point.y - 20}
                          textAnchor="middle"
                          className="text-[10px] fill-slate-300"
                        >
                          {formatDate(point.period)}
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </>
            ) : (
              // Bar chart
              <>
                {points.map((point, idx) => {
                  const barWidth = chartWidth / data.length - 4;
                  const barHeight = padding.top + chartHeight - point.y;
                  return (
                    <g key={idx}>
                      <rect
                        x={point.x - barWidth / 2}
                        y={point.y}
                        width={barWidth}
                        height={barHeight}
                        fill={colors.stroke}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                      {hoveredIndex === idx && (
                        <g>
                          <rect
                            x={point.x - 40}
                            y={point.y - 50}
                            width="80"
                            height="35"
                            rx="4"
                            fill="#1e293b"
                            className="shadow-lg"
                          />
                          <text
                            x={point.x}
                            y={point.y - 35}
                            textAnchor="middle"
                            className="text-xs fill-white font-semibold"
                          >
                            {formatValue(point.value)}
                          </text>
                          <text
                            x={point.x}
                            y={point.y - 20}
                            textAnchor="middle"
                            className="text-[10px] fill-slate-300"
                          >
                            {formatDate(point.period)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </>
            )}

            {/* X-axis labels */}
            {data.map((d, idx) => {
              const x = getX(idx);
              const shouldShow = idx % Math.ceil(data.length / 8) === 0 || idx === data.length - 1;
              return shouldShow ? (
                <g key={idx}>
                  <line
                    x1={x}
                    y1={padding.top + chartHeight}
                    x2={x}
                    y2={padding.top + chartHeight + 5}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={padding.top + chartHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-slate-600"
                    transform={`rotate(-45 ${x} ${padding.top + chartHeight + 20})`}
                  >
                    {formatDate(d.period)}
                  </text>
                </g>
              ) : null;
            })}
          </svg>
        </div>

        {/* Data Table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Period</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((d, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50 cursor-pointer ${
                      hoveredIndex === idx ? "bg-sky-50" : ""
                    }`}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <td className="px-4 py-2 text-slate-700">{formatDate(d.period)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900">
                      {formatValue(d.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

