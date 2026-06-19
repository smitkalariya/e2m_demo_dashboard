import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx(
        "h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900",
        className
      )}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[200px] w-full items-center justify-center py-12">
      <Spinner />
    </div>
  );
}
