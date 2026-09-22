export function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-ciruela/10 bg-hueso px-6 py-5">
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-body text-xs font-medium uppercase tracking-[0.14em] text-ciruela/50">
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[18px] border border-ciruela/10 bg-hueso px-6 py-5">
      <p className="font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">{label}</p>
      <p className="mt-2 font-display text-2xl text-ciruela">{value}</p>
      {sub && <p className="mt-1 font-body text-xs text-ciruela/50">{sub}</p>}
    </div>
  );
}
