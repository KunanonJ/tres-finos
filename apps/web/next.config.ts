import type { NextConfig } from "next";

/**
 * GitHub project Pages live at `/{repo}` (e.g. /tres-finos). Set in CI:
 * `NEXT_PUBLIC_BASE_PATH=/tres-finos`
 * Omit locally so `npm run dev` serves at `/`.
 */
const basePathRaw = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const basePath = basePathRaw.replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
