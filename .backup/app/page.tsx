const HomePage = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16">
        <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-2xl shadow-black/20">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            GoGoCash Finance
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-foreground">
            App scaffold is ready
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Next up is porting the HTML dashboard into typed App Router components
            backed by the existing Q1 2026 CSV dataset.
          </p>
        </div>
      </div>
    </main>
  );
};

export default HomePage;
