"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type HealthState = {
  status: string;
  detail: string;
};

type Organization = {
  id: string;
  name: string;
  base_currency: string;
  status: string;
  created_at: string;
};

type DashboardSummary = {
  periodDays: number;
  walletCount: number;
  activeWalletCount: number;
  transactionCount: number;
  confirmedTransactionCount: number;
  activeChains: number;
  inflowUsd: number;
  outflowUsd: number;
  netFlowUsd: number;
  grossUsd: number;
  openReconciliationCount: number;
};

type AssetPosition = {
  token_symbol: string;
  tx_count: number;
  amount_sum: number;
  usd_sum: number;
};

type Wallet = {
  id: string;
  chain: string;
  address: string;
  label: string | null;
  source_type: string;
  is_active: number;
};

type LedgerTransaction = {
  id: string;
  wallet_id: string;
  tx_hash: string;
  chain: string;
  token_symbol: string | null;
  amount_decimal: string;
  fiat_value_usd: string | null;
  direction: string;
  status: string;
  occurred_at: string;
  counterparty: string | null;
  classification: string | null;
};

type ReconciliationRun = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  discrepancy_count: number;
  matched_count: number;
  unmatched_count: number;
  notes: string | null;
  created_at: string;
};

type ReportItem = {
  id: string;
  report_type: string;
  title: string;
  status: string;
  generated_at: string | null;
  created_at: string;
};

type AlertItem = {
  id: string;
  name: string;
  alert_type: string;
  threshold_operator: string | null;
  threshold_value: number | null;
  channel: string;
  severity: string;
  is_active: number;
  last_triggered_at: string | null;
};

type RuleItem = {
  id: string;
  name: string;
  rule_type: string;
  priority: number;
  is_active: number;
  conditions_json: string;
  actions_json: string;
};

type ErpConnection = {
  id: string;
  system_name: string;
  status: string;
  last_sync_at: string | null;
  created_at: string;
};

type TeamMember = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
};

type TransactionNote = {
  id: string;
  note_text: string;
  created_at: string;
  author_display_name: string | null;
  author_email: string | null;
};

type WebhookSubscription = {
  id: string;
  name: string;
  endpoint_url: string;
  status: string;
  event_types_json: string;
};

type CostBasisSummary = {
  method: string;
  tokenSymbol: string;
  remainingQuantity: number;
  remainingCostUsd: number;
  realizedGainLossUsd: number;
  averageCostPerUnitUsd: number;
  sampleSize: number;
};

function fmtUsd(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value ?? 0);
}

function isoFromDatetimeLocal(value: string): string {
  if (!value) {
    return new Date().toISOString();
  }
  return new Date(value).toISOString();
}

function parseJsonInput(raw: string, fallback: Record<string, unknown>): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }
  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  return parsed;
}

function parseJsonArray(raw: string, fallback: string[]): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }
  const parsed = JSON.parse(trimmed) as unknown;
  if (!Array.isArray(parsed)) {
    return fallback;
  }
  return parsed.map((item) => String(item));
}

export default function HomePage() {
  const apiBaseUrl = useMemo(
    () =>
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
      "https://tres-finos-api.chameleon-finance.workers.dev",
    []
  );

  const [health, setHealth] = useState<HealthState>({
    status: "checking",
    detail: "Probing API health endpoint"
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [topAssets, setTopAssets] = useState<AssetPosition[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationRun[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [erpConnections, setErpConnections] = useState<ErpConnection[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("");
  const [transactionNotes, setTransactionNotes] = useState<TransactionNote[]>([]);
  const [costBasisSummary, setCostBasisSummary] = useState<CostBasisSummary | null>(null);

  const [orgName, setOrgName] = useState<string>("");
  const [walletForm, setWalletForm] = useState({
    chain: "ethereum",
    address: "",
    label: "",
    sourceType: "ONCHAIN"
  });

  const [txFilters, setTxFilters] = useState({
    search: "",
    direction: "",
    minUsd: ""
  });

  const [txForm, setTxForm] = useState({
    walletId: "",
    txHash: "",
    chain: "ethereum",
    tokenSymbol: "USDC",
    amountDecimal: "",
    fiatValueUsd: "",
    direction: "IN",
    status: "CONFIRMED",
    occurredAtLocal: new Date().toISOString().slice(0, 16),
    classification: "",
    counterparty: ""
  });

  const [reconForm, setReconForm] = useState({
    periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
    status: "DRAFT",
    notes: ""
  });

  const [reportForm, setReportForm] = useState({
    reportType: "TREASURY_SUMMARY",
    title: "Monthly Treasury Summary"
  });

  const [alertForm, setAlertForm] = useState({
    name: "Large Outflow Alert",
    alertType: "OUTFLOW_USD",
    thresholdOperator: "GT",
    thresholdValue: "10000",
    channel: "EMAIL",
    severity: "HIGH"
  });

  const [ruleForm, setRuleForm] = useState({
    name: "Classify USDC Treasury",
    ruleType: "CLASSIFICATION",
    priority: "50",
    conditionsJson: '{"tokenSymbol":"USDC"}',
    actionsJson: '{"classification":"TREASURY_TRANSFER"}'
  });

  const [erpForm, setErpForm] = useState({
    systemName: "NETSUITE",
    configJson: '{"syncFrequency":"daily","currency":"USD"}'
  });

  const [teamForm, setTeamForm] = useState({
    email: "",
    displayName: "",
    role: "ACCOUNTANT"
  });

  const [noteForm, setNoteForm] = useState({
    authorMemberId: "",
    noteText: ""
  });

  const [webhookForm, setWebhookForm] = useState({
    name: "Transaction Events",
    endpointUrl: "https://example.com/webhooks/tres",
    eventTypesJson: '["transaction.created","report.completed"]'
  });

  const [costBasisForm, setCostBasisForm] = useState({
    tokenSymbol: "USDC",
    method: "FIFO"
  });

  const apiGet = useCallback(
    async <T,>(path: string): Promise<T> => {
      const response = await fetch(`${apiBaseUrl}${path}`);
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed with ${response.status}`);
      }
      return (await response.json()) as T;
    },
    [apiBaseUrl]
  );

  const apiPost = useCallback(
    async <T,>(path: string, body: Record<string, unknown>): Promise<T> => {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed with ${response.status}`);
      }
      return (await response.json()) as T;
    },
    [apiBaseUrl]
  );

  const apiPatch = useCallback(
    async <T,>(path: string, body: Record<string, unknown>): Promise<T> => {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed with ${response.status}`);
      }
      return (await response.json()) as T;
    },
    [apiBaseUrl]
  );

  const loadHealth = useCallback(async () => {
    try {
      const data = await apiGet<{ status?: string }>("/health");
      setHealth({ status: data.status ?? "ok", detail: "Connected" });
    } catch {
      setHealth({ status: "unavailable", detail: "Connection failed" });
    }
  }, [apiGet]);

  const loadOrganizations = useCallback(async () => {
    const result = await apiGet<{ items: Organization[] }>("/v1/organizations");
    setOrganizations(result.items ?? []);

    if (!selectedOrganizationId && result.items?.length) {
      setSelectedOrganizationId(result.items[0].id);
    }
  }, [apiGet, selectedOrganizationId]);

  const loadOrganizationData = useCallback(
    async (organizationId: string) => {
      if (!organizationId) {
        return;
      }

      const txParams = new URLSearchParams({ organizationId });
      if (txFilters.search.trim()) {
        txParams.set("search", txFilters.search.trim());
      }
      if (txFilters.direction.trim()) {
        txParams.set("direction", txFilters.direction.trim());
      }
      if (txFilters.minUsd.trim()) {
        txParams.set("minUsd", txFilters.minUsd.trim());
      }

      setLoading(true);
      setError("");
      try {
        const [
          summary,
          assets,
          walletData,
          txData,
          reconData,
          reportData,
          alertData,
          ruleData,
          erpData,
          teamData,
          webhookData
        ] =
          await Promise.all([
            apiGet<{ summary: DashboardSummary }>(
              `/v1/dashboard/summary?organizationId=${organizationId}&periodDays=30`
            ),
            apiGet<{ items: AssetPosition[] }>(
              `/v1/dashboard/top-assets?organizationId=${organizationId}&limit=8`
            ),
            apiGet<{ items: Wallet[] }>(`/v1/wallets?organizationId=${organizationId}`),
            apiGet<{ items: LedgerTransaction[] }>(`/v1/transactions?${txParams.toString()}`),
            apiGet<{ items: ReconciliationRun[] }>(
              `/v1/reconciliations?organizationId=${organizationId}&limit=20`
            ),
            apiGet<{ items: ReportItem[] }>(`/v1/reports?organizationId=${organizationId}&limit=20`),
            apiGet<{ items: AlertItem[] }>(`/v1/alerts?organizationId=${organizationId}&limit=20`),
            apiGet<{ items: RuleItem[] }>(`/v1/rules?organizationId=${organizationId}&limit=20`),
            apiGet<{ items: ErpConnection[] }>(
              `/v1/integrations/erp?organizationId=${organizationId}&limit=20`
            ),
            apiGet<{ items: TeamMember[] }>(`/v1/team-members?organizationId=${organizationId}&limit=50`),
            apiGet<{ items: WebhookSubscription[] }>(
              `/v1/webhooks?organizationId=${organizationId}&limit=50`
            )
          ]);

        setDashboardSummary(summary.summary);
        setTopAssets(assets.items ?? []);
        setWallets(walletData.items ?? []);
        setTransactions(txData.items ?? []);
        setReconciliations(reconData.items ?? []);
        setReports(reportData.items ?? []);
        setAlerts(alertData.items ?? []);
        setRules(ruleData.items ?? []);
        setErpConnections(erpData.items ?? []);
        setTeamMembers(teamData.items ?? []);
        setWebhooks(webhookData.items ?? []);

        if (!txForm.walletId && walletData.items?.length) {
          setTxForm((prev) => ({ ...prev, walletId: walletData.items[0].id }));
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed loading organization data");
      } finally {
        setLoading(false);
      }
    },
    [apiGet, txFilters.direction, txFilters.minUsd, txFilters.search, txForm.walletId]
  );

  const loadTransactionNotes = useCallback(
    async (transactionId: string) => {
      if (!selectedOrganizationId || !transactionId) {
        setTransactionNotes([]);
        return;
      }

      try {
        const result = await apiGet<{ items: TransactionNote[] }>(
          `/v1/transactions/${transactionId}/notes?organizationId=${selectedOrganizationId}&limit=50`
        );
        setTransactionNotes(result.items ?? []);
      } catch {
        setTransactionNotes([]);
      }
    },
    [apiGet, selectedOrganizationId]
  );

  useEffect(() => {
    void loadHealth();
    void loadOrganizations();
  }, [loadHealth, loadOrganizations]);

  useEffect(() => {
    if (selectedOrganizationId) {
      void loadOrganizationData(selectedOrganizationId);
    } else {
      setSelectedTransactionId("");
      setTransactionNotes([]);
    }
  }, [loadOrganizationData, selectedOrganizationId]);

  useEffect(() => {
    if (!selectedTransactionId) {
      setTransactionNotes([]);
      return;
    }
    void loadTransactionNotes(selectedTransactionId);
  }, [loadTransactionNotes, selectedTransactionId]);

  const handleCreateOrganization = useCallback(async () => {
    if (!orgName.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const created = await apiPost<{ id: string }>("/v1/organizations", {
        name: orgName.trim(),
        baseCurrency: "USD"
      });
      setOrgName("");
      await loadOrganizations();
      setSelectedOrganizationId(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating organization");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizations, orgName]);

  const handleCreateWallet = useCallback(async () => {
    if (!selectedOrganizationId || !walletForm.address.trim() || !walletForm.chain.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/wallets", {
        organizationId: selectedOrganizationId,
        chain: walletForm.chain,
        address: walletForm.address,
        label: walletForm.label,
        sourceType: walletForm.sourceType
      });
      setWalletForm((prev) => ({ ...prev, address: "", label: "" }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating wallet");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, selectedOrganizationId, walletForm]);

  const handleCreateTransaction = useCallback(async () => {
    if (!selectedOrganizationId || !txForm.walletId || !txForm.txHash.trim() || !txForm.amountDecimal) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/transactions", {
        organizationId: selectedOrganizationId,
        walletId: txForm.walletId,
        txHash: txForm.txHash.trim(),
        chain: txForm.chain,
        tokenSymbol: txForm.tokenSymbol.trim() || null,
        amountDecimal: txForm.amountDecimal,
        fiatValueUsd: txForm.fiatValueUsd || null,
        direction: txForm.direction,
        status: txForm.status,
        occurredAt: isoFromDatetimeLocal(txForm.occurredAtLocal),
        classification: txForm.classification || null,
        counterparty: txForm.counterparty || null
      });

      setTxForm((prev) => ({
        ...prev,
        txHash: "",
        amountDecimal: "",
        fiatValueUsd: "",
        classification: "",
        counterparty: ""
      }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating transaction");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, selectedOrganizationId, txForm]);

  const handleCreateReconciliation = useCallback(async () => {
    if (!selectedOrganizationId || !reconForm.periodStart || !reconForm.periodEnd) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/reconciliations", {
        organizationId: selectedOrganizationId,
        periodStart: `${reconForm.periodStart}T00:00:00.000Z`,
        periodEnd: `${reconForm.periodEnd}T23:59:59.999Z`,
        status: reconForm.status,
        notes: reconForm.notes,
        discrepancyCount: 0,
        matchedCount: 0,
        unmatchedCount: 0
      });

      setReconForm((prev) => ({ ...prev, notes: "" }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating reconciliation run");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, reconForm, selectedOrganizationId]);

  const handleAutoReconciliation = useCallback(async () => {
    if (!selectedOrganizationId) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/reconciliations/auto-run", {
        organizationId: selectedOrganizationId,
        periodStart: `${reconForm.periodStart}T00:00:00.000Z`,
        periodEnd: `${reconForm.periodEnd}T23:59:59.999Z`
      });
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed running auto reconciliation");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, reconForm.periodEnd, reconForm.periodStart, selectedOrganizationId]);

  const handleCreateReport = useCallback(async () => {
    if (!selectedOrganizationId || !reportForm.title.trim() || !reportForm.reportType) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/reports", {
        organizationId: selectedOrganizationId,
        reportType: reportForm.reportType,
        title: reportForm.title.trim(),
        parameters: { generatedBy: "web-console" }
      });
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating report");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, reportForm.reportType, reportForm.title, selectedOrganizationId]);

  const handleRunReport = useCallback(
    async (reportId: string) => {
      setLoading(true);
      setError("");
      try {
        await apiPost(`/v1/reports/${reportId}/run`, {});
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed running report");
      } finally {
        setLoading(false);
      }
    },
    [apiPost, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreateAlert = useCallback(async () => {
    if (!selectedOrganizationId || !alertForm.name.trim() || !alertForm.alertType) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/alerts", {
        organizationId: selectedOrganizationId,
        name: alertForm.name,
        alertType: alertForm.alertType,
        thresholdOperator: alertForm.thresholdOperator,
        thresholdValue: Number(alertForm.thresholdValue || 0),
        channel: alertForm.channel,
        severity: alertForm.severity,
        isActive: true
      });

      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating alert");
    } finally {
      setLoading(false);
    }
  }, [alertForm, apiPost, loadOrganizationData, selectedOrganizationId]);

  const toggleAlert = useCallback(
    async (alertId: string, isActive: boolean) => {
      try {
        await apiPatch(`/v1/alerts/${alertId}`, { isActive: !isActive });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating alert");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreateRule = useCallback(async () => {
    if (!selectedOrganizationId || !ruleForm.name.trim() || !ruleForm.ruleType.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/rules", {
        organizationId: selectedOrganizationId,
        name: ruleForm.name.trim(),
        ruleType: ruleForm.ruleType.trim(),
        priority: Number(ruleForm.priority || 100),
        conditions: parseJsonInput(ruleForm.conditionsJson, {}),
        actions: parseJsonInput(ruleForm.actionsJson, {}),
        isActive: true
      });

      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating rule");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, ruleForm, selectedOrganizationId]);

  const toggleRule = useCallback(
    async (ruleId: string, isActive: boolean) => {
      try {
        await apiPatch(`/v1/rules/${ruleId}`, { isActive: !isActive });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating rule");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreateErpConnection = useCallback(async () => {
    if (!selectedOrganizationId || !erpForm.systemName.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/integrations/erp", {
        organizationId: selectedOrganizationId,
        systemName: erpForm.systemName.trim(),
        status: "CONNECTED",
        config: parseJsonInput(erpForm.configJson, {})
      });

      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating ERP connection");
    } finally {
      setLoading(false);
    }
  }, [apiPost, erpForm.configJson, erpForm.systemName, loadOrganizationData, selectedOrganizationId]);

  const handleSyncErp = useCallback(
    async (connectionId: string) => {
      try {
        await apiPost(`/v1/integrations/erp/${connectionId}/sync`, {});
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed syncing ERP connection");
      }
    },
    [apiPost, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreateTeamMember = useCallback(async () => {
    if (!selectedOrganizationId || !teamForm.email.trim() || !teamForm.displayName.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/team-members", {
        organizationId: selectedOrganizationId,
        email: teamForm.email.trim(),
        displayName: teamForm.displayName.trim(),
        role: teamForm.role
      });
      setTeamForm((prev) => ({ ...prev, email: "", displayName: "" }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating team member");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, selectedOrganizationId, teamForm]);

  const handleCreateTransactionNote = useCallback(async () => {
    if (!selectedOrganizationId || !selectedTransactionId || !noteForm.noteText.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost(`/v1/transactions/${selectedTransactionId}/notes`, {
        organizationId: selectedOrganizationId,
        authorMemberId: noteForm.authorMemberId || null,
        noteText: noteForm.noteText.trim(),
        mentions: []
      });
      setNoteForm((prev) => ({ ...prev, noteText: "" }));
      await loadTransactionNotes(selectedTransactionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating note");
    } finally {
      setLoading(false);
    }
  }, [
    apiPost,
    loadTransactionNotes,
    noteForm.authorMemberId,
    noteForm.noteText,
    selectedOrganizationId,
    selectedTransactionId
  ]);

  const handleCreateWebhook = useCallback(async () => {
    if (!selectedOrganizationId || !webhookForm.name.trim() || !webhookForm.endpointUrl.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/webhooks", {
        organizationId: selectedOrganizationId,
        name: webhookForm.name.trim(),
        endpointUrl: webhookForm.endpointUrl.trim(),
        eventTypes: parseJsonArray(webhookForm.eventTypesJson, ["transaction.created"]),
        status: "ACTIVE"
      });
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating webhook");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, selectedOrganizationId, webhookForm]);

  const handleTestWebhook = useCallback(
    async (webhookId: string) => {
      try {
        await apiPost(`/v1/webhooks/${webhookId}/test`, {
          eventType: "transaction.created",
          payload: { source: "web-console", generatedAt: new Date().toISOString() }
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed sending webhook test event");
      }
    },
    [apiPost]
  );

  const handleCalculateCostBasis = useCallback(async () => {
    if (!selectedOrganizationId || !costBasisForm.tokenSymbol.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await apiPost<{ summary: CostBasisSummary }>("/v1/cost-basis/calculate", {
        organizationId: selectedOrganizationId,
        tokenSymbol: costBasisForm.tokenSymbol.trim(),
        method: costBasisForm.method
      });
      setCostBasisSummary(result.summary ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed calculating cost basis");
      setCostBasisSummary(null);
    } finally {
      setLoading(false);
    }
  }, [apiPost, costBasisForm.method, costBasisForm.tokenSymbol, selectedOrganizationId]);

  const handleExportTransactions = useCallback(() => {
    if (!selectedOrganizationId) {
      return;
    }
    const target = `${apiBaseUrl}/v1/transactions/export?organizationId=${selectedOrganizationId}&format=csv&limit=1000`;
    window.open(target, "_blank", "noopener,noreferrer");
  }, [apiBaseUrl, selectedOrganizationId]);

  const quickNav = [
    { label: "Overview", href: "#overview" },
    { label: "Ledger", href: "#ledger" },
    { label: "Reconciliation", href: "#reconciliation" },
    { label: "Reporting", href: "#reporting" },
    { label: "Governance", href: "#governance" },
    { label: "Automation", href: "#automation" }
  ];

  return (
    <main className="ops-shell mx-auto min-h-screen max-w-7xl px-6 py-10">
      <header className="hero-panel mb-8 rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
              TRES FinOS
            </p>
            <h1 className="text-3xl font-semibold text-ink">Web3 Finance Operations Console</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-700">
              Expanded PRD scope foundation: contextual ledger, reconciliations, reports,
              alerts/rules automation, cost-basis workflows, RBAC collaboration, webhooks, and ERP integrations.
            </p>
            <p className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              UX/UI Blueprint v1
            </p>
          </div>
          <div className="status-pill rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">API Status</p>
            <p className="text-lg font-semibold text-ink">{health.status}</p>
            <p className="text-xs text-slate-500">{health.detail}</p>
          </div>
        </div>

        <nav className="module-nav mt-5 flex flex-wrap gap-2">
          {quickNav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="module-link rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <section
        id="overview"
        className="module-panel mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Organization Context
        </h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedOrganizationId}
            onChange={(event) => setSelectedOrganizationId(event.target.value)}
          >
            <option value="">Select organization</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="New organization name"
            value={orgName}
            onChange={(event) => setOrgName(event.target.value)}
          />
          <button
            className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
            onClick={() => void handleCreateOrganization()}
            disabled={loading}
          >
            Create Org
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-alert">{error}</p>}
      </section>

      {selectedOrganizationId ? (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-6">
            <article className="metric-tile rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Wallets</p>
              <p className="text-2xl font-semibold text-ink">{dashboardSummary?.walletCount ?? 0}</p>
            </article>
            <article className="metric-tile rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Transactions (30d)</p>
              <p className="text-2xl font-semibold text-ink">
                {dashboardSummary?.transactionCount ?? 0}
              </p>
            </article>
            <article className="metric-tile rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Inflow</p>
              <p className="text-2xl font-semibold text-signal">
                {fmtUsd(dashboardSummary?.inflowUsd)}
              </p>
            </article>
            <article className="metric-tile rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Outflow</p>
              <p className="text-2xl font-semibold text-alert">
                {fmtUsd(dashboardSummary?.outflowUsd)}
              </p>
            </article>
            <article className="metric-tile rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Net Flow</p>
              <p className="text-2xl font-semibold text-ink">
                {fmtUsd(dashboardSummary?.netFlowUsd)}
              </p>
            </article>
            <article className="metric-tile rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Open Recon</p>
              <p className="text-2xl font-semibold text-ink">
                {dashboardSummary?.openReconciliationCount ?? 0}
              </p>
            </article>
          </section>

          <section id="reporting" className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Top Asset Positions
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2">Token</th>
                      <th className="py-2">Tx</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAssets.map((item) => (
                      <tr key={item.token_symbol} className="border-b border-slate-100">
                        <td className="py-2 font-medium">{item.token_symbol}</td>
                        <td className="py-2">{item.tx_count}</td>
                        <td className="py-2">{item.amount_sum}</td>
                        <td className="py-2">{fmtUsd(item.usd_sum)}</td>
                      </tr>
                    ))}
                    {topAssets.length === 0 && (
                      <tr>
                        <td className="py-2 text-slate-500" colSpan={4}>
                          No position data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Wallets
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Chain (ethereum)"
                  value={walletForm.chain}
                  onChange={(event) =>
                    setWalletForm((prev) => ({ ...prev, chain: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Label"
                  value={walletForm.label}
                  onChange={(event) =>
                    setWalletForm((prev) => ({ ...prev, label: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                  placeholder="Wallet address"
                  value={walletForm.address}
                  onChange={(event) =>
                    setWalletForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={walletForm.sourceType}
                  onChange={(event) =>
                    setWalletForm((prev) => ({ ...prev, sourceType: event.target.value }))
                  }
                >
                  <option value="ONCHAIN">ONCHAIN</option>
                  <option value="CEX">CEX</option>
                  <option value="CUSTODY">CUSTODY</option>
                  <option value="BANK">BANK</option>
                </select>
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateWallet()}
                  disabled={loading}
                >
                  Add Wallet
                </button>
              </div>

              <div className="mt-4 max-h-56 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-2">Chain</th>
                      <th className="px-2 py-2">Label</th>
                      <th className="px-2 py-2">Address</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map((wallet) => (
                      <tr key={wallet.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 uppercase">{wallet.chain}</td>
                        <td className="px-2 py-2">{wallet.label || "-"}</td>
                        <td className="px-2 py-2 font-mono">{wallet.address.slice(0, 14)}...</td>
                        <td className="px-2 py-2">{wallet.source_type}</td>
                        <td className="px-2 py-2">{wallet.is_active ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section
            id="ledger"
            className="module-panel mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Contextual Ledger
            </h3>
            <div className="grid gap-2 md:grid-cols-5">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={txForm.walletId}
                onChange={(event) => setTxForm((prev) => ({ ...prev, walletId: event.target.value }))}
              >
                <option value="">Select wallet</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.chain}:{wallet.address.slice(0, 10)}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="tx hash"
                value={txForm.txHash}
                onChange={(event) => setTxForm((prev) => ({ ...prev, txHash: event.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="token"
                value={txForm.tokenSymbol}
                onChange={(event) =>
                  setTxForm((prev) => ({ ...prev, tokenSymbol: event.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="amount"
                value={txForm.amountDecimal}
                onChange={(event) =>
                  setTxForm((prev) => ({ ...prev, amountDecimal: event.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="fiat USD"
                value={txForm.fiatValueUsd}
                onChange={(event) =>
                  setTxForm((prev) => ({ ...prev, fiatValueUsd: event.target.value }))
                }
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={txForm.direction}
                onChange={(event) =>
                  setTxForm((prev) => ({ ...prev, direction: event.target.value }))
                }
              >
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="INTERNAL">INTERNAL</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={txForm.status}
                onChange={(event) => setTxForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
              </select>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="datetime-local"
                value={txForm.occurredAtLocal}
                onChange={(event) =>
                  setTxForm((prev) => ({ ...prev, occurredAtLocal: event.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="classification"
                value={txForm.classification}
                onChange={(event) =>
                  setTxForm((prev) => ({ ...prev, classification: event.target.value }))
                }
              />
              <button
                className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                onClick={() => void handleCreateTransaction()}
                disabled={loading}
              >
                Add Transaction
              </button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-5">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Search tx hash/token/counterparty"
                value={txFilters.search}
                onChange={(event) => setTxFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={txFilters.direction}
                onChange={(event) =>
                  setTxFilters((prev) => ({ ...prev, direction: event.target.value }))
                }
              >
                <option value="">All directions</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="INTERNAL">INTERNAL</option>
              </select>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Min USD"
                value={txFilters.minUsd}
                onChange={(event) => setTxFilters((prev) => ({ ...prev, minUsd: event.target.value }))}
              />
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => void loadOrganizationData(selectedOrganizationId)}
              >
                Apply Filters
              </button>
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={handleExportTransactions}
              >
                Export CSV
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-2 py-2">Occurred</th>
                    <th className="px-2 py-2">Tx Hash</th>
                    <th className="px-2 py-2">Token</th>
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">USD</th>
                    <th className="px-2 py-2">Direction</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className={`border-b border-slate-100 ${
                        selectedTransactionId === transaction.id ? "bg-slate-100/70" : ""
                      }`}
                      onClick={() => setSelectedTransactionId(transaction.id)}
                    >
                      <td className="px-2 py-2">{new Date(transaction.occurred_at).toLocaleString()}</td>
                      <td className="px-2 py-2 font-mono">{transaction.tx_hash.slice(0, 12)}...</td>
                      <td className="px-2 py-2">{transaction.token_symbol || "-"}</td>
                      <td className="px-2 py-2">{transaction.amount_decimal}</td>
                      <td className="px-2 py-2">{fmtUsd(Number(transaction.fiat_value_usd || 0))}</td>
                      <td className="px-2 py-2">{transaction.direction}</td>
                      <td className="px-2 py-2">{transaction.status}</td>
                      <td className="px-2 py-2">{transaction.classification || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Transaction Collaboration Notes
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedTransactionId
                  ? `Selected transaction: ${selectedTransactionId}`
                  : "Select a transaction row to add notes"}
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={noteForm.authorMemberId}
                  onChange={(event) =>
                    setNoteForm((prev) => ({ ...prev, authorMemberId: event.target.value }))
                  }
                >
                  <option value="">Author (optional)</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.display_name} ({member.role})
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                  placeholder="@mention context or audit note"
                  value={noteForm.noteText}
                  onChange={(event) =>
                    setNoteForm((prev) => ({ ...prev, noteText: event.target.value }))
                  }
                />
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateTransactionNote()}
                  disabled={!selectedTransactionId || loading}
                >
                  Add Note
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                {transactionNotes.map((note) => (
                  <li key={note.id} className="rounded border border-slate-200 p-2">
                    <p>{note.note_text}</p>
                    <p className="mt-1 text-slate-500">
                      {note.author_display_name || note.author_email || "system"} ·{" "}
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
                {selectedTransactionId && transactionNotes.length === 0 && (
                  <li className="rounded border border-dashed border-slate-200 p-2 text-slate-500">
                    No notes yet.
                  </li>
                )}
              </ul>
            </div>
          </section>

          <section id="reconciliation" className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Reconciliation Engine
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  value={reconForm.periodStart}
                  onChange={(event) =>
                    setReconForm((prev) => ({ ...prev, periodStart: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  value={reconForm.periodEnd}
                  onChange={(event) =>
                    setReconForm((prev) => ({ ...prev, periodEnd: event.target.value }))
                  }
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={reconForm.status}
                  onChange={(event) => setReconForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="FAILED">FAILED</option>
                </select>
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateReconciliation()}
                  disabled={loading}
                >
                  Create Run
                </button>
                <button
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => void handleAutoReconciliation()}
                  disabled={loading}
                >
                  Auto-Run
                </button>
              </div>
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                placeholder="Reconciliation notes"
                value={reconForm.notes}
                onChange={(event) => setReconForm((prev) => ({ ...prev, notes: event.target.value }))}
              />

              <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-2">Period</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Discrepancies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliations.map((reconciliation) => (
                      <tr key={reconciliation.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">
                          {new Date(reconciliation.period_start).toLocaleDateString()} -{" "}
                          {new Date(reconciliation.period_end).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-2">{reconciliation.status}</td>
                        <td className="px-2 py-2">{reconciliation.discrepancy_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Report Center
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={reportForm.reportType}
                  onChange={(event) =>
                    setReportForm((prev) => ({ ...prev, reportType: event.target.value }))
                  }
                >
                  <option value="TREASURY_SUMMARY">TREASURY_SUMMARY</option>
                  <option value="TRANSACTION_HISTORY">TRANSACTION_HISTORY</option>
                  <option value="RECONCILIATION_SUMMARY">RECONCILIATION_SUMMARY</option>
                </select>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Report title"
                  value={reportForm.title}
                  onChange={(event) => setReportForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </div>
              <button
                className="mt-2 rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                onClick={() => void handleCreateReport()}
                disabled={loading}
              >
                Create Report
              </button>

              <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-2">Title</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">{report.title}</td>
                        <td className="px-2 py-2">{report.report_type}</td>
                        <td className="px-2 py-2">{report.status}</td>
                        <td className="px-2 py-2">
                          <button
                            className="rounded border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100"
                            onClick={() => void handleRunReport(report.id)}
                          >
                            Run
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="governance" className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Cost Basis Lab
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Token (USDC)"
                  value={costBasisForm.tokenSymbol}
                  onChange={(event) =>
                    setCostBasisForm((prev) => ({ ...prev, tokenSymbol: event.target.value }))
                  }
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={costBasisForm.method}
                  onChange={(event) =>
                    setCostBasisForm((prev) => ({ ...prev, method: event.target.value }))
                  }
                >
                  <option value="FIFO">FIFO</option>
                  <option value="LIFO">LIFO</option>
                  <option value="WAC">WAC</option>
                  <option value="SPECIFIC_MAX_GAIN">SPECIFIC_MAX_GAIN</option>
                  <option value="SPECIFIC_MAX_LOSS">SPECIFIC_MAX_LOSS</option>
                </select>
              </div>
              <button
                className="mt-2 rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                onClick={() => void handleCalculateCostBasis()}
                disabled={loading}
              >
                Calculate
              </button>
              {costBasisSummary && (
                <div className="mt-3 rounded-lg border border-slate-200 p-3 text-xs">
                  <p>
                    {costBasisSummary.tokenSymbol} · {costBasisSummary.method}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Remaining qty: {costBasisSummary.remainingQuantity.toLocaleString()}
                  </p>
                  <p className="text-slate-600">
                    Remaining cost: {fmtUsd(costBasisSummary.remainingCostUsd)}
                  </p>
                  <p className="text-slate-600">
                    Realized P/L: {fmtUsd(costBasisSummary.realizedGainLossUsd)}
                  </p>
                </div>
              )}
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Team Access (RBAC)
              </h3>
              <div className="grid gap-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Email"
                  value={teamForm.email}
                  onChange={(event) => setTeamForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Display name"
                  value={teamForm.displayName}
                  onChange={(event) =>
                    setTeamForm((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={teamForm.role}
                  onChange={(event) => setTeamForm((prev) => ({ ...prev, role: event.target.value }))}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="AUDITOR">AUDITOR</option>
                </select>
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateTeamMember()}
                  disabled={loading}
                >
                  Add Member
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                {teamMembers.map((member) => (
                  <li key={member.id} className="rounded-lg border border-slate-200 p-2">
                    <p className="font-medium">{member.display_name}</p>
                    <p className="text-slate-500">
                      {member.email} · {member.role}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Webhook Routing
              </h3>
              <div className="grid gap-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Webhook name"
                  value={webhookForm.name}
                  onChange={(event) =>
                    setWebhookForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Endpoint URL"
                  value={webhookForm.endpointUrl}
                  onChange={(event) =>
                    setWebhookForm((prev) => ({ ...prev, endpointUrl: event.target.value }))
                  }
                />
                <textarea
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={webhookForm.eventTypesJson}
                  onChange={(event) =>
                    setWebhookForm((prev) => ({ ...prev, eventTypesJson: event.target.value }))
                  }
                />
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateWebhook()}
                  disabled={loading}
                >
                  Add Webhook
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                {webhooks.map((webhook) => (
                  <li key={webhook.id} className="rounded-lg border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{webhook.name}</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() => void handleTestWebhook(webhook.id)}
                      >
                        Test
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {webhook.status} · {webhook.endpoint_url}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="automation" className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Alerts
              </h3>
              <div className="grid gap-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={alertForm.name}
                  onChange={(event) => setAlertForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={alertForm.alertType}
                    onChange={(event) =>
                      setAlertForm((prev) => ({ ...prev, alertType: event.target.value }))
                    }
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={alertForm.thresholdValue}
                    onChange={(event) =>
                      setAlertForm((prev) => ({ ...prev, thresholdValue: event.target.value }))
                    }
                  />
                </div>
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateAlert()}
                  disabled={loading}
                >
                  Create Alert
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                {alerts.map((alert) => (
                  <li key={alert.id} className="rounded-lg border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{alert.name}</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() => void toggleAlert(alert.id, Boolean(alert.is_active))}
                      >
                        {alert.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {alert.alert_type} {alert.threshold_operator || ""} {alert.threshold_value || ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Automation Rules
              </h3>
              <div className="grid gap-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Rule name"
                  value={ruleForm.name}
                  onChange={(event) => setRuleForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Rule type"
                  value={ruleForm.ruleType}
                  onChange={(event) =>
                    setRuleForm((prev) => ({ ...prev, ruleType: event.target.value }))
                  }
                />
                <textarea
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={ruleForm.conditionsJson}
                  onChange={(event) =>
                    setRuleForm((prev) => ({ ...prev, conditionsJson: event.target.value }))
                  }
                />
                <textarea
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={ruleForm.actionsJson}
                  onChange={(event) =>
                    setRuleForm((prev) => ({ ...prev, actionsJson: event.target.value }))
                  }
                />
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateRule()}
                  disabled={loading}
                >
                  Create Rule
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                {rules.map((rule) => (
                  <li key={rule.id} className="rounded-lg border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() => void toggleRule(rule.id, Boolean(rule.is_active))}
                      >
                        {rule.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {rule.rule_type} (priority {rule.priority})
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                ERP Integrations
              </h3>
              <div className="grid gap-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="System (NETSUITE/XERO/SAP)"
                  value={erpForm.systemName}
                  onChange={(event) => setErpForm((prev) => ({ ...prev, systemName: event.target.value }))}
                />
                <textarea
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                  value={erpForm.configJson}
                  onChange={(event) => setErpForm((prev) => ({ ...prev, configJson: event.target.value }))}
                />
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateErpConnection()}
                  disabled={loading}
                >
                  Add ERP Connection
                </button>
              </div>

              <ul className="mt-3 space-y-2 text-xs">
                {erpConnections.map((connection) => (
                  <li key={connection.id} className="rounded-lg border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{connection.system_name}</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() => void handleSyncErp(connection.id)}
                      >
                        Sync
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {connection.status} · last sync: {connection.last_sync_at || "never"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      ) : (
        <section className="module-panel module-empty rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-600">
          Create or select an organization to start building your financial operating model.
        </section>
      )}

      <footer className="ops-footer mt-10 text-xs text-slate-500">
        {loading ? "Processing request..." : "Ready"} · API Base: {apiBaseUrl}
      </footer>
    </main>
  );
}
