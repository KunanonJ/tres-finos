"use client";

import { useEffect, useState } from "react";
import { BookOpen, Keyboard, Landmark, Shield } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { dismissOnboarding, ONBOARDING_STORAGE_KEY } from "@/lib/onboardingStorage";

export const DashboardOnboarding = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(typeof window !== "undefined" && window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "1");
  }, []);

  if (!visible) {
    return null;
  }

  const handleDismiss = () => {
    dismissOnboarding();
    setVisible(false);
  };

  return (
    <section
      className="no-print rounded-[1.25rem] border border-primary/30 bg-primary/10 px-5 py-4 sm:px-6"
      aria-labelledby="onboarding-title"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 shrink-0 text-primary" aria-hidden />
            <h2 id="onboarding-title" className="font-heading text-lg font-semibold">
              Welcome to the CFO console
            </h2>
          </div>
          <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex gap-2">
              <Landmark className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                Use <strong className="text-foreground">Period scope</strong> to switch between the full quarter and a
                single month. Metrics and charts follow that choice.
              </span>
            </li>
            <li className="flex gap-2">
              <Shield className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Bank uploads</strong> replace one month at a time and stay in this
                browser — download a <strong className="text-foreground">backup</strong> from the toolbar before clearing
                data.
              </span>
            </li>
            <li className="flex gap-2">
              <Keyboard className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                Press <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>{" "}
                or <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs">Ctrl K</kbd>{" "}
                to jump tabs, months, or search.
              </span>
            </li>
            <li className="flex gap-2">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Compare</strong> (when a month is selected) shows period-vs-period
                revenue, spend, and cash in Overview.
              </span>
            </li>
          </ul>
        </div>
        <Button type="button" className="shrink-0 lg:self-center" onClick={handleDismiss}>
          Got it
        </Button>
      </div>
    </section>
  );
};
