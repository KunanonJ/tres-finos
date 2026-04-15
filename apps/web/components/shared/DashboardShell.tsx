import type { DashboardData } from "@/types/dashboard";

import { DashboardExperience } from "@/components/shared/DashboardExperience";

interface DashboardShellProps {
  data: DashboardData;
}

export const DashboardShell = ({ data }: DashboardShellProps) => <DashboardExperience data={data} />;
