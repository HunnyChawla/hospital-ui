type SectionProps = {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function Section({ id, title, description, children, action }: SectionProps) {
  const hasHeader = title || description || action;
  return (
    <section id={id} className="card relative overflow-hidden">
      <div className="absolute right-4 top-4 h-12 w-12 rounded-full bg-sky-50 blur-2xl pointer-events-none" />
      {hasHeader && (
        <div className="flex items-start justify-between px-4 pt-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
            {description ? (
              <p className="text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      <div className={hasHeader ? "px-4 pb-4 pt-2" : "p-4"}>{children}</div>
    </section>
  );
}

