"use client";

import { useEffect, useMemo, useState } from "react";

type HealthState = {
  status: string;
  detail: string;
};

export default function HomePage() {
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001",
    []
  );

  const [health, setHealth] = useState<HealthState>({
    status: "checking",
    detail: "Probing API health endpoint"
  });

  useEffect(() => {
    let active = true;
    const probe = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/health`);
        if (!response.ok) {
          if (active) {
            setHealth({ status: "unavailable", detail: `HTTP ${response.status}` });
          }
          return;
        }

        const data = (await response.json()) as { status?: string };
        if (active) {
          setHealth({ status: data.status ?? "ok", detail: "Connected" });
        }
      } catch {
        if (active) {
          setHealth({ status: "unavailable", detail: "Connection failed" });
        }
      }
    };

    void probe();
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-10 rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-slate-600">TRES FinOS</p>
        <h1 className="text-3xl font-semibold text-ink">Web3 Finance Operations Platform</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Phase 0 foundation is live. This workspace is ready for ledger, reconciliation,
          reporting, and treasury modules.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-600">API Status</h2>
          <p className="mt-2 text-2xl font-semibold text-ink">{health.status}</p>
          <p className="mt-1 text-sm text-slate-500">{health.detail}</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-600">Primary Modules</h2>
          <p className="mt-2 text-sm text-slate-700">
            Ingestion, Contextual Ledger, Reconciliation Engine, Reporting, Integrations.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-600">Current Milestone</h2>
          <p className="mt-2 text-sm text-slate-700">Phase 0: foundation and platform setup.</p>
        </article>
      </section>
    </main>
  );
}
