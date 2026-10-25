export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-slate-400">{body}</p> : null}
    </div>
  );
}
