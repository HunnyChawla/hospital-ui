export function SkeletonRow({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-11 w-full animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  );
}

