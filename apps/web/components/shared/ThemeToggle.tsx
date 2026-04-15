"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { setStoredTheme, THEME_STORAGE_KEY, type ThemeMode } from "@/lib/themeStorage";

const THEME_CHANGE_EVENT = "tres-finos-theme-change";

const notifyThemeChange = () => {
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
};

const subscribeToTheme = (onStoreChange: () => void) => {
  const onTheme = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }

    if (event.newValue === "light" || event.newValue === "dark") {
      document.documentElement.setAttribute("data-theme", event.newValue);
      onStoreChange();
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, onTheme);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onTheme);
    window.removeEventListener("storage", onStorage);
  };
};

const getThemeSnapshot = () => {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" || value === "dark" ? value : "dark";
};

const getServerThemeSnapshot = () => "dark" as ThemeMode;

export const ThemeToggle = () => {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const isDark = theme === "dark";

  const toggle = useCallback(() => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setStoredTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    notifyThemeChange();
  }, [theme]);

  return (
    <div className="interactive-surface flex items-center gap-3 rounded-[1.25rem] border border-border/70 bg-background/40 px-3 py-2 hover:border-primary/25">
      <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline">
        Appearance
      </span>
      <div className="flex items-center gap-2">
        <Sun
          className={cn(
            "size-4 shrink-0 motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out",
            isDark ? "text-muted-foreground/60" : "text-primary",
          )}
          aria-hidden
        />
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
          className={cn(
            "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-border/80 bg-muted/80 p-1",
            "motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
            "hover:border-primary/30 active:scale-[0.97] motion-reduce:active:scale-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onClick={toggle}
        >
          <span
            className={cn(
              "pointer-events-none block size-6 rounded-full bg-primary shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none",
              isDark ? "translate-x-6" : "translate-x-0",
            )}
            aria-hidden
          />
          <span className="sr-only">{isDark ? "Night" : "Day"} mode active</span>
        </button>
        <Moon
          className={cn(
            "size-4 shrink-0 motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out",
            isDark ? "text-primary" : "text-muted-foreground/60",
          )}
          aria-hidden
        />
      </div>
    </div>
  );
};
