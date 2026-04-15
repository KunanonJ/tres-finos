import type { Metadata } from "next";

import "@/app/globals.css";

import { themeInitScript } from "@/lib/themeInitScript";

export const metadata: Metadata = {
  title: "Tres Finos | CFO Dashboard",
  description: "Q1 2026 finance dashboard rebuilt on Next.js 16 with typed data and shared components.",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="en" className="h-full font-sans" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
    </head>
    <body className="min-h-full">
      <a
        href="#dashboard-main"
        className="sr-only transition-[transform,opacity,box-shadow] duration-200 ease-out focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground motion-reduce:transition-none focus:scale-[1.02] motion-reduce:focus:scale-100"
      >
        Skip to main content
      </a>
      {children}
    </body>
  </html>
);

export default RootLayout;
