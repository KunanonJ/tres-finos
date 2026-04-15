import { type DashboardSummary, type AssetPosition, type Organization } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "https://tres-finos-api.chameleon-finance.workers.dev";

async function getOrganizations(): Promise<Organization[]> {
  try {
    const res = await fetch(`${API_URL}/v1/organizations`, { 
      next: { revalidate: 60 } 
    });
    if (!res.ok) throw new Error("Failed to fetch organizations");
    const data = await res.json();
    return data.items ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getDashboardSummary(organizationId: string): Promise<DashboardSummary | null> {
  try {
    const res = await fetch(`${API_URL}/v1/dashboard/summary?organizationId=${organizationId}&periodDays=30`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch dashboard summary");
    const data = await res.json();
    return data.summary ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getTopAssets(organizationId: string): Promise<AssetPosition[]> {
  try {
    const res = await fetch(`${API_URL}/v1/dashboard/top-assets?organizationId=${organizationId}&limit=8`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch top assets");
    const data = await res.json();
    return data.items ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function fmtUsd(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value ?? 0);
}

export default async function DashboardPage() {
  const organizations = await getOrganizations();
  const activeOrgId = organizations[0]?.id;

  if (!activeOrgId) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-muted-foreground">
        No active organization found. Please create one to view the dashboard.
      </div>
    );
  }

  const [summary, topAssets] = await Promise.all([
    getDashboardSummary(activeOrgId),
    getTopAssets(activeOrgId),
  ]);

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Net Flow (30d)</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{fmtUsd(summary?.netFlowUsd)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Inflow {fmtUsd(summary?.inflowUsd)} / Outflow {fmtUsd(summary?.outflowUsd)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Transactions (30d)</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{summary?.transactionCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.confirmedTransactionCount ?? 0} confirmed transactions
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Connected Wallets</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{summary?.activeWalletCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {summary?.activeChains ?? 0} active networks
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Open Reconciliations</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{summary?.openReconciliationCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending validation runs</p>
          </div>
        </div>
      </div>

      {/* Top Assets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">Top Asset Positions</h3>
            <p className="text-sm text-muted-foreground">Highest volume assets in the treasury by USD equivalent.</p>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {topAssets.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No assets found</div>
              ) : (
                topAssets.map((asset) => (
                  <div key={asset.token_symbol} className="flex items-center">
                    <div className="ml-4 space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{asset.token_symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {asset.amount_sum.toLocaleString()} {asset.token_symbol}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      {fmtUsd(asset.usd_sum)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
