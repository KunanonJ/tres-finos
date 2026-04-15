import * as React from "react";

import { cn } from "@/lib/utils";

type TableElementProps<T extends keyof React.JSX.IntrinsicElements> =
  React.ComponentPropsWithoutRef<T>;

type TableProps = TableElementProps<"table"> & {
  stickyHeader?: boolean;
};

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, stickyHeader, ...props }, ref) => (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-[1.25rem] border border-border/70 motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
        stickyHeader &&
          "max-h-[min(32rem,75vh)] overflow-y-auto overscroll-contain scroll-smooth",
      )}
    >
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom text-sm",
          stickyHeader && "tabular-nums",
          className,
        )}
        {...props}
      />
    </div>
  ),
);

Table.displayName = "Table";

type TableHeaderProps = TableElementProps<"thead"> & {
  sticky?: boolean;
};

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, sticky, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        "bg-background/60 [&_tr]:border-b [&_tr]:border-border/70",
        sticky && "sticky top-0 z-10 bg-background/95 shadow-sm backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  ),
);

TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableElementProps<"tbody">
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0 [&_tr]:border-b [&_tr]:border-border/60", className)}
    {...props}
  />
));

TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  TableElementProps<"tfoot">
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("bg-background/70 font-semibold", className)} {...props} />
));

TableFooter.displayName = "TableFooter";

export const TableRow = React.forwardRef<HTMLTableRowElement, TableElementProps<"tr">>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "motion-safe:transition-[background-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-background/40",
        className,
      )}
      {...props}
    />
  ),
);

TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, TableElementProps<"th">>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
);

TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, TableElementProps<"td">>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-4 py-3 align-middle", className)} {...props} />
  ),
);

TableCell.displayName = "TableCell";

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  TableElementProps<"caption">
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-3 text-sm text-muted-foreground", className)} {...props} />
));

TableCaption.displayName = "TableCaption";
