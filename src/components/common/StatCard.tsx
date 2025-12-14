import { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "sky" | "emerald" | "amber" | "fuchsia";
};

const tones: Record<
  NonNullable<StatCardProps["tone"]>,
  { bg: string; text: string }
> = {
  sky: { bg: "bg-sky-50", text: "text-sky-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-600" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "sky",
}: StatCardProps) {
  const toneClasses = tones[tone];

  return (
    <div className="card group relative overflow-hidden">
      <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-gradient-to-br from-sky-100 to-white blur-3xl transition-all group-hover:scale-110" />
      <div className="relative flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
          {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 ${toneClasses.bg} ${toneClasses.text}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

