"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { DashboardTab, DashboardUrlState } from "@/lib/dashboardUrlState";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthNames: string[];
  scopeMonth: string;
  onApply: (updates: Partial<DashboardUrlState>) => void;
}

type CommandItem = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void;
};

type CommandPaletteDialogProps = {
  monthNames: string[];
  onApply: (updates: Partial<DashboardUrlState>) => void;
  onOpenChange: (open: boolean) => void;
  scopeMonth: string;
};

/** Mounted only while `open` so search state resets when the palette closes (no effect-based reset). */
const CommandPaletteDialog = ({
  monthNames,
  onApply,
  onOpenChange,
  scopeMonth,
}: CommandPaletteDialogProps) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const tabs: { id: DashboardTab; label: string }[] = [
      { id: "overview", label: "Overview" },
      { id: "monthly-pnl", label: "Monthly P&L" },
      { id: "transactions", label: "Transactions" },
      { id: "categories", label: "Categories" },
    ];

    const tabCommands = tabs.map((tab) => ({
      id: `tab-${tab.id}`,
      label: `Go to ${tab.label}`,
      group: "Navigation",
      keywords: tab.label.toLowerCase(),
      run: () => {
        onApply({ tab: tab.id });
        onOpenChange(false);
      },
    }));

    const monthCommands = monthNames.flatMap((month) => {
      const scopeCommand: CommandItem = {
        id: `scope-${month}`,
        label: `Scope month: ${month}`,
        group: "Period",
        keywords: `${month.toLowerCase()} scope focus`,
        run: () => {
          onApply({ month, compare: "" });
          onOpenChange(false);
        },
      };

      if (scopeMonth === "all" || scopeMonth === month) {
        return [scopeCommand];
      }

      const compareCommand: CommandItem = {
        id: `compare-${month}`,
        label: `Compare to ${month}`,
        group: "Compare",
        keywords: `${month.toLowerCase()} versus diff`,
        run: () => {
          onApply({ compare: month });
          onOpenChange(false);
        },
      };

      return [scopeCommand, compareCommand];
    });

    const utility: CommandItem[] = [
      {
        id: "scope-all",
        label: "Scope: Full period",
        group: "Period",
        keywords: "all quarter",
        run: () => {
          onApply({ month: "all", compare: "" });
          onOpenChange(false);
        },
      },
      ...(scopeMonth === "all"
        ? []
        : [
            {
              id: "clear-compare",
              label: "Clear month comparison",
              group: "Compare",
              keywords: "reset",
              run: () => {
                onApply({ compare: "" });
                onOpenChange(false);
              },
            } satisfies CommandItem,
          ]),
      {
        id: "focus-search",
        label: "Transactions: focus search",
        group: "Navigation",
        keywords: "find filter query",
        run: () => {
          onApply({ tab: "transactions" });
          onOpenChange(false);
          window.setTimeout(() => {
            document.getElementById("dashboard-transactions-search")?.focus();
          }, 0);
        },
      },
    ];

    return [...tabCommands, ...utility, ...monthCommands];
  }, [monthNames, onApply, onOpenChange, scopeMonth]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) {
      return commands;
    }

    return commands.filter((command) => {
      const hay = `${command.label} ${command.keywords ?? ""} ${command.group}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [commands, normalizedQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const closeOnOutside = useCallback(
    (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    },
    [onOpenChange],
  );

  useEffect(() => {
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [closeOnOutside]);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center bg-background/60 p-4 pt-[min(20vh,8rem)] backdrop-blur-sm"
      role="presentation"
    >
      <div
        ref={panelRef}
        className="interactive-surface w-full max-w-lg rounded-[1.25rem] border border-border/80 bg-card p-3 shadow-[0_24px_80px_rgba(3,6,18,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-2 pb-2">
          <LayoutGrid className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            placeholder="Jump to tab, month, or compare…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        <div className="max-h-[min(60vh,24rem)] overflow-y-auto py-2">
          {grouped.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching commands.</p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-3 last:mb-0">
                <p className="px-3 pb-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {group}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto w-full justify-start rounded-xl px-3 py-2 text-left font-normal"
                        onClick={item.run}
                      >
                        {item.label}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
        <p className="border-t border-border/60 px-3 pt-2 text-xs text-muted-foreground">
          <kbd className="rounded border border-border px-1">esc</kbd> to close
        </p>
      </div>
    </div>
  );
};

export const CommandPalette = ({
  monthNames,
  onApply,
  onOpenChange,
  open,
  scopeMonth,
}: CommandPaletteProps) => {
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!openRef.current);
      }

      if (event.key === "Escape" && openRef.current) {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <CommandPaletteDialog
      monthNames={monthNames}
      onApply={onApply}
      onOpenChange={onOpenChange}
      scopeMonth={scopeMonth}
    />
  );
};
