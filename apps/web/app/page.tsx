import { Suspense } from "react";

import { DashboardShell } from "@/components/shared/DashboardShell";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { getDashboardData } from "@/lib/dashboardData";

const DashboardSection = async () => {
  const dashboardData = await getDashboardData();
  return <DashboardShell data={dashboardData} />;
};

const HomePage = () => (
  <Suspense fallback={<DashboardSkeleton />}>
    <DashboardSection />
  </Suspense>
);

export default HomePage;
