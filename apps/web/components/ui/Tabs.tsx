"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

type TabsRootProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>;
type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>;
type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>;
type TabsContentProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>;

export const Tabs = ({ className, ...props }: TabsRootProps) => (
  <TabsPrimitive.Root className={cn("flex flex-col gap-6", className)} {...props} />
);

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex w-full flex-wrap items-center gap-2 rounded-[1.4rem] border border-border/70 bg-card/70 p-2 motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none md:w-auto",
      className,
    )}
    {...props}
  />
));

TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex min-w-[9rem] items-center justify-center rounded-[1rem] px-4 py-2.5 text-sm font-medium text-muted-foreground motion-safe:transition-[color,background-color,border-color,box-shadow,transform] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:scale-[1.02] motion-reduce:data-[state=active]:scale-100 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
      className,
    )}
    {...props}
  />
));

TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "focus-visible:outline-none motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
      className,
    )}
    {...props}
  />
));

TabsContent.displayName = "TabsContent";
