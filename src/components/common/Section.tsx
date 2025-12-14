type SectionProps = {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function Section({ id, title, description, children, action }: SectionProps) {
  return (
    <section id={id} className="card relative overflow-hidden">
      <div className="absolute right-6 top-6 h-16 w-16 rounded-full bg-sky-50 blur-2xl" />
      <div className="flex items-start justify-between px-6 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="px-6 pb-6 pt-3">{children}</div>
    </section>
  );
}

