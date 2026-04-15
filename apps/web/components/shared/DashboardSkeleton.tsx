export const DashboardSkeleton = () => (
  <div className="dashboard-shell">
    <div className="animate-pulse rounded-[1.75rem] border border-border/80 bg-card/50 px-6 py-6 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-3">
          <div className="size-14 rounded-2xl bg-muted/40" />
          <div className="flex flex-col gap-2">
            <div className="h-7 w-56 rounded-md bg-muted/50" />
            <div className="h-4 w-72 max-w-full rounded-md bg-muted/35" />
          </div>
        </div>
        <div className="h-12 w-40 rounded-[1.25rem] bg-muted/40" />
      </div>
    </div>
    <div className="animate-pulse rounded-[1.25rem] border border-border/70 bg-card/40 p-4">
      <div className="h-10 w-full rounded-xl bg-muted/35 sm:max-w-xl" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {["a", "b", "c", "d", "e"].map((key) => (
        <div
          key={key}
          className="animate-pulse rounded-[1.25rem] border border-border/70 bg-card/40 p-5"
        >
          <div className="h-3 w-24 rounded bg-muted/40" />
          <div className="mt-4 h-8 w-36 rounded-md bg-muted/50" />
          <div className="mt-6 h-3 w-full rounded bg-muted/30" />
        </div>
      ))}
    </div>
  </div>
);
