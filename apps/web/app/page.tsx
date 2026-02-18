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

type ContactItem = {
  id: string;
  name: string;
  email: string | null;
  wallet_address: string | null;
  counterparty_type: string;
  status: string;
  notes: string | null;
  created_at: string;
};

type CustodianItem = {
  id: string;
  name: string;
  provider_type: string;
  account_reference: string | null;
  status: string;
  last_sync_at: string | null;
};

type UnidentifiedAddressItem = {
  id: string;
  chain: string;
  address: string;
  label: string | null;
  status: string;
  last_seen_at: string | null;
};

type AssetInventoryItem = {
  token_symbol: string;
  chain: string;
  asset_class: string;
  wallet_count: number;
  quantity_sum: number;
  value_usd_sum: number;
  latest_snapshot_at: string;
};

type PositionItem = {
  id: string;
  wallet_id: string | null;
  token_symbol: string;
  asset_class: string;
  quantity_decimal: string;
  cost_basis_usd: string | null;
  market_value_usd: string | null;
  reconciliation_status: string;
  is_zero_balance: number;
  as_of: string;
  wallet_chain: string | null;
  wallet_address: string | null;
};

type InvoiceItem = {
  id: string;
  customer_name: string;
  invoice_number: string | null;
  amount_usd: string;
  status: string;
  due_date: string | null;
  issued_at: string | null;
};

type BillItem = {
  id: string;
  vendor_name: string;
  bill_number: string | null;
  amount_usd: string;
  status: string;
  due_date: string | null;
  issued_at: string | null;
};

type PublishedReport = {
  id: string;
  report_id: string;
  title: string;
  report_type: string;
  visibility: string;
  published_by: string | null;
  published_at: string;
  status: string;
};

type FrameworkCaseItem = {
  id: string;
  framework_code: string;
  title: string;
  status: string;
  due_date: string | null;
  owner: string | null;
  created_at: string;
};

type FrameworkCatalogItem = {
  code: string;
  name: string;
  status: string;
};

function fmtUsd(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value ?? 0);
}

function fmtNumber(value: number | null | undefined, maxFractionDigits = 4): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits
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
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [custodians, setCustodians] = useState<CustodianItem[]>([]);
  const [unidentifiedAddresses, setUnidentifiedAddresses] = useState<UnidentifiedAddressItem[]>([]);
  const [assetInventory, setAssetInventory] = useState<AssetInventoryItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [showZeroPositions, setShowZeroPositions] = useState<boolean>(false);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [publishedReports, setPublishedReports] = useState<PublishedReport[]>([]);
  const [xeroConnections, setXeroConnections] = useState<ErpConnection[]>([]);
  const [quickbooksConnections, setQuickbooksConnections] = useState<ErpConnection[]>([]);
  const [frameworkCases1099, setFrameworkCases1099] = useState<FrameworkCaseItem[]>([]);
  const [frameworkCatalog, setFrameworkCatalog] = useState<FrameworkCatalogItem[]>([]);
  const [ledgerTab, setLedgerTab] = useState<
    "TRANSACTIONS" | "COST_BASIS" | "ROLL_FORWARD" | "TRIAL_BALANCE"
  >("TRANSACTIONS");

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

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    walletAddress: "",
    counterpartyType: "EXTERNAL"
  });

  const [custodianForm, setCustodianForm] = useState({
    name: "",
    providerType: "CUSTODY",
    accountReference: ""
  });

  const [unidentifiedForm, setUnidentifiedForm] = useState({
    chain: "ethereum",
    address: "",
    label: ""
  });

  const [positionForm, setPositionForm] = useState({
    walletId: "",
    tokenSymbol: "USDC",
    assetClass: "TOKEN",
    quantityDecimal: "",
    costBasisUsd: "",
    marketValueUsd: "",
    reconciliationStatus: "PENDING"
  });

  const [invoiceForm, setInvoiceForm] = useState({
    customerName: "",
    invoiceNumber: "",
    amountUsd: "",
    status: "DRAFT",
    dueDate: ""
  });

  const [billForm, setBillForm] = useState({
    vendorName: "",
    billNumber: "",
    amountUsd: "",
    status: "OPEN",
    dueDate: ""
  });

  const [xeroForm, setXeroForm] = useState({
    configJson: '{"mode":"balances_only"}'
  });

  const [quickbooksForm, setQuickbooksForm] = useState({
    configJson: '{"mode":"full_transactions"}'
  });

  const [frameworkForm, setFrameworkForm] = useState({
    title: "",
    dueDate: "",
    owner: "",
    status: "OPEN"
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
          publishedReportData,
          alertData,
          ruleData,
          erpData,
          xeroData,
          quickbooksData,
          teamData,
          webhookData,
          contactData,
          custodianData,
          unidentifiedData,
          assetInventoryData,
          positionData,
          invoiceData,
          billData,
          frameworkCaseData,
          frameworkCatalogData
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
            apiGet<{ items: PublishedReport[] }>(
              `/v1/reports/published?organizationId=${organizationId}&limit=20`
            ),
            apiGet<{ items: AlertItem[] }>(`/v1/alerts?organizationId=${organizationId}&limit=20`),
            apiGet<{ items: RuleItem[] }>(`/v1/rules?organizationId=${organizationId}&limit=20`),
            apiGet<{ items: ErpConnection[] }>(
              `/v1/integrations/erp?organizationId=${organizationId}&limit=20`
            ),
            apiGet<{ items: ErpConnection[] }>(
              `/v1/integrations/xero?organizationId=${organizationId}&limit=20`
            ),
            apiGet<{ items: ErpConnection[] }>(
              `/v1/integrations/quickbooks?organizationId=${organizationId}&limit=20`
            ),
            apiGet<{ items: TeamMember[] }>(`/v1/team-members?organizationId=${organizationId}&limit=50`),
            apiGet<{ items: WebhookSubscription[] }>(
              `/v1/webhooks?organizationId=${organizationId}&limit=50`
            ),
            apiGet<{ items: ContactItem[] }>(
              `/v1/accounts/contacts?organizationId=${organizationId}&limit=100`
            ),
            apiGet<{ items: CustodianItem[] }>(
              `/v1/accounts/custodians?organizationId=${organizationId}&limit=100`
            ),
            apiGet<{ items: UnidentifiedAddressItem[] }>(
              `/v1/accounts/unidentified-addresses?organizationId=${organizationId}&limit=100`
            ),
            apiGet<{ items: AssetInventoryItem[] }>(`/v1/assets?organizationId=${organizationId}&limit=100`),
            apiGet<{ items: PositionItem[] }>(
              `/v1/positions?organizationId=${organizationId}&showZero=${showZeroPositions ? "true" : "false"}&limit=200`
            ),
            apiGet<{ items: InvoiceItem[] }>(
              `/v1/payments/invoices?organizationId=${organizationId}&limit=100`
            ),
            apiGet<{ items: BillItem[] }>(`/v1/payments/bills?organizationId=${organizationId}&limit=100`),
            apiGet<{ items: FrameworkCaseItem[] }>(
              `/v1/frameworks/1099?organizationId=${organizationId}&limit=100`
            ),
            apiGet<{ items: FrameworkCatalogItem[] }>(`/v1/frameworks/catalog`)
          ]);

        setDashboardSummary(summary.summary);
        setTopAssets(assets.items ?? []);
        setWallets(walletData.items ?? []);
        setTransactions(txData.items ?? []);
        setReconciliations(reconData.items ?? []);
        setReports(reportData.items ?? []);
        setPublishedReports(publishedReportData.items ?? []);
        setAlerts(alertData.items ?? []);
        setRules(ruleData.items ?? []);
        setErpConnections(erpData.items ?? []);
        setXeroConnections(xeroData.items ?? []);
        setQuickbooksConnections(quickbooksData.items ?? []);
        setTeamMembers(teamData.items ?? []);
        setWebhooks(webhookData.items ?? []);
        setContacts(contactData.items ?? []);
        setCustodians(custodianData.items ?? []);
        setUnidentifiedAddresses(unidentifiedData.items ?? []);
        setAssetInventory(assetInventoryData.items ?? []);
        setPositions(positionData.items ?? []);
        setInvoices(invoiceData.items ?? []);
        setBills(billData.items ?? []);
        setFrameworkCases1099(frameworkCaseData.items ?? []);
        setFrameworkCatalog(frameworkCatalogData.items ?? []);

        if (!txForm.walletId && walletData.items?.length) {
          setTxForm((prev) => ({ ...prev, walletId: walletData.items[0].id }));
        }
        if (!positionForm.walletId && walletData.items?.length) {
          setPositionForm((prev) => ({ ...prev, walletId: walletData.items[0].id }));
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed loading organization data");
      } finally {
        setLoading(false);
      }
    },
    [
      apiGet,
      positionForm.walletId,
      showZeroPositions,
      txFilters.direction,
      txFilters.minUsd,
      txFilters.search,
      txForm.walletId
    ]
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

  const handleCreateContact = useCallback(async () => {
    if (!selectedOrganizationId || !contactForm.name.trim()) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/accounts/contacts", {
        organizationId: selectedOrganizationId,
        name: contactForm.name.trim(),
        email: contactForm.email.trim() || null,
        walletAddress: contactForm.walletAddress.trim() || null,
        counterpartyType: contactForm.counterpartyType
      });
      setContactForm((prev) => ({ ...prev, name: "", email: "", walletAddress: "" }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating contact");
    } finally {
      setLoading(false);
    }
  }, [apiPost, contactForm, loadOrganizationData, selectedOrganizationId]);

  const handleUpdateContactStatus = useCallback(
    async (contactId: string, status: string) => {
      try {
        await apiPatch(`/v1/accounts/contacts/${contactId}`, { status });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating contact");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreateCustodian = useCallback(async () => {
    if (!selectedOrganizationId || !custodianForm.name.trim()) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/accounts/custodians", {
        organizationId: selectedOrganizationId,
        name: custodianForm.name.trim(),
        providerType: custodianForm.providerType,
        accountReference: custodianForm.accountReference.trim() || null
      });
      setCustodianForm((prev) => ({ ...prev, name: "", accountReference: "" }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating custodian");
    } finally {
      setLoading(false);
    }
  }, [apiPost, custodianForm, loadOrganizationData, selectedOrganizationId]);

  const handleUpdateCustodianStatus = useCallback(
    async (custodianId: string, status: string) => {
      try {
        await apiPatch(`/v1/accounts/custodians/${custodianId}`, { status });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating custodian");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreateUnidentifiedAddress = useCallback(async () => {
    if (!selectedOrganizationId || !unidentifiedForm.chain.trim() || !unidentifiedForm.address.trim()) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/accounts/unidentified-addresses", {
        organizationId: selectedOrganizationId,
        chain: unidentifiedForm.chain.trim(),
        address: unidentifiedForm.address.trim(),
        label: unidentifiedForm.label.trim() || null
      });
      setUnidentifiedForm((prev) => ({ ...prev, address: "", label: "" }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating unidentified address");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, selectedOrganizationId, unidentifiedForm]);

  const handleResolveUnidentifiedAddress = useCallback(
    async (item: UnidentifiedAddressItem) => {
      try {
        await apiPatch(`/v1/accounts/unidentified-addresses/${item.id}`, {
          status: "RESOLVED",
          label: item.label || "Labeled Address"
        });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating unidentified address");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreatePosition = useCallback(async () => {
    if (!selectedOrganizationId || !positionForm.tokenSymbol.trim() || !positionForm.quantityDecimal) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/positions", {
        organizationId: selectedOrganizationId,
        walletId: positionForm.walletId || null,
        tokenSymbol: positionForm.tokenSymbol.trim(),
        assetClass: positionForm.assetClass,
        quantityDecimal: positionForm.quantityDecimal,
        costBasisUsd: positionForm.costBasisUsd || null,
        marketValueUsd: positionForm.marketValueUsd || null,
        reconciliationStatus: positionForm.reconciliationStatus,
        asOf: new Date().toISOString()
      });
      setPositionForm((prev) => ({
        ...prev,
        quantityDecimal: "",
        costBasisUsd: "",
        marketValueUsd: ""
      }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating position");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, positionForm, selectedOrganizationId]);

  const handleUpdatePositionStatus = useCallback(
    async (positionId: string, reconciliationStatus: string) => {
      try {
        await apiPatch(`/v1/positions/${positionId}`, { reconciliationStatus });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating position");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreateInvoice = useCallback(async () => {
    if (!selectedOrganizationId || !invoiceForm.customerName.trim() || !invoiceForm.amountUsd) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/payments/invoices", {
        organizationId: selectedOrganizationId,
        customerName: invoiceForm.customerName.trim(),
        invoiceNumber: invoiceForm.invoiceNumber.trim() || null,
        amountUsd: invoiceForm.amountUsd,
        status: invoiceForm.status,
        dueDate: invoiceForm.dueDate || null
      });
      setInvoiceForm((prev) => ({ ...prev, customerName: "", invoiceNumber: "", amountUsd: "" }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating invoice");
    } finally {
      setLoading(false);
    }
  }, [apiPost, invoiceForm, loadOrganizationData, selectedOrganizationId]);

  const handleCreateBill = useCallback(async () => {
    if (!selectedOrganizationId || !billForm.vendorName.trim() || !billForm.amountUsd) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/payments/bills", {
        organizationId: selectedOrganizationId,
        vendorName: billForm.vendorName.trim(),
        billNumber: billForm.billNumber.trim() || null,
        amountUsd: billForm.amountUsd,
        status: billForm.status,
        dueDate: billForm.dueDate || null
      });
      setBillForm((prev) => ({ ...prev, vendorName: "", billNumber: "", amountUsd: "" }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating bill");
    } finally {
      setLoading(false);
    }
  }, [apiPost, billForm, loadOrganizationData, selectedOrganizationId]);

  const handleSetInvoiceStatus = useCallback(
    async (invoiceId: string, status: string) => {
      try {
        await apiPatch(`/v1/payments/invoices/${invoiceId}`, { status });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating invoice");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handleSetBillStatus = useCallback(
    async (billId: string, status: string) => {
      try {
        await apiPatch(`/v1/payments/bills/${billId}`, { status });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating bill");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handlePublishReport = useCallback(
    async (reportId: string) => {
      setLoading(true);
      setError("");
      try {
        await apiPost(`/v1/reports/${reportId}/publish`, {
          visibility: "INTERNAL",
          publishedBy: "web-console"
        });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed publishing report");
      } finally {
        setLoading(false);
      }
    },
    [apiPost, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreateXeroConnection = useCallback(async () => {
    if (!selectedOrganizationId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/integrations/xero", {
        organizationId: selectedOrganizationId,
        config: parseJsonInput(xeroForm.configJson, {}),
        status: "CONNECTED"
      });
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed connecting Xero");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, selectedOrganizationId, xeroForm.configJson]);

  const handleCreateQuickbooksConnection = useCallback(async () => {
    if (!selectedOrganizationId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/integrations/quickbooks", {
        organizationId: selectedOrganizationId,
        config: parseJsonInput(quickbooksForm.configJson, {}),
        status: "CONNECTED"
      });
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed connecting QuickBooks");
    } finally {
      setLoading(false);
    }
  }, [apiPost, loadOrganizationData, quickbooksForm.configJson, selectedOrganizationId]);

  const handleMarkIntegrationSynced = useCallback(
    async (provider: "xero" | "quickbooks", connectionId: string) => {
      try {
        await apiPatch(`/v1/integrations/${provider}/${connectionId}`, {
          status: "SYNCED",
          lastSyncAt: new Date().toISOString()
        });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating integration sync status");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handleCreateFrameworkCase = useCallback(async () => {
    if (!selectedOrganizationId || !frameworkForm.title.trim()) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/v1/frameworks/1099", {
        organizationId: selectedOrganizationId,
        title: frameworkForm.title.trim(),
        dueDate: frameworkForm.dueDate || null,
        owner: frameworkForm.owner.trim() || null,
        status: frameworkForm.status
      });
      setFrameworkForm((prev) => ({ ...prev, title: "", dueDate: "", owner: "" }));
      await loadOrganizationData(selectedOrganizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed creating framework case");
    } finally {
      setLoading(false);
    }
  }, [apiPost, frameworkForm, loadOrganizationData, selectedOrganizationId]);

  const handleUpdateFrameworkCaseStatus = useCallback(
    async (caseId: string, status: string) => {
      try {
        await apiPatch(`/v1/frameworks/1099/${caseId}`, { status });
        if (selectedOrganizationId) {
          await loadOrganizationData(selectedOrganizationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed updating framework case");
      }
    },
    [apiPatch, loadOrganizationData, selectedOrganizationId]
  );

  const handleExportTransactions = useCallback(() => {
    if (!selectedOrganizationId) {
      return;
    }
    const target = `${apiBaseUrl}/v1/transactions/export?organizationId=${selectedOrganizationId}&format=csv&limit=1000`;
    window.open(target, "_blank", "noopener,noreferrer");
  }, [apiBaseUrl, selectedOrganizationId]);

  const quickNav = [
    { label: "Overview", href: "#overview" },
    { label: "Accounts", href: "#accounts" },
    { label: "Assets", href: "#assets" },
    { label: "Positions", href: "#positions" },
    { label: "Payments", href: "#payments" },
    { label: "Ledger", href: "#ledger" },
    { label: "Reconciliation", href: "#reconciliation" },
    { label: "Reporting", href: "#reporting" },
    { label: "Integrations", href: "#integrations" },
    { label: "Frameworks", href: "#frameworks" },
    { label: "Governance", href: "#governance" },
    { label: "Automation", href: "#automation" }
  ];

  const netWorthSeries = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const transaction of transactions) {
      const dayKey = new Date(transaction.occurred_at).toISOString().slice(0, 10);
      const current = byDay.get(dayKey) ?? 0;
      byDay.set(dayKey, current + Number(transaction.fiat_value_usd || 0));
    }

    let cumulative = 0;
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => {
        cumulative += value;
        return { date, value: cumulative };
      });
  }, [transactions]);

  const networkExposure = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of transactions) {
      const key = transaction.chain || "unknown";
      totals.set(key, (totals.get(key) ?? 0) + Number(transaction.fiat_value_usd || 0));
    }
    return Array.from(totals.entries())
      .map(([chain, value]) => ({ chain, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const recentActivity = useMemo(() => transactions.slice(0, 6), [transactions]);

  const rollForwardRows = useMemo(() => {
    const rows = new Map<string, { token: string; inflow: number; outflow: number }>();
    for (const transaction of transactions) {
      const token = transaction.token_symbol || "UNKNOWN";
      if (!rows.has(token)) {
        rows.set(token, { token, inflow: 0, outflow: 0 });
      }
      const record = rows.get(token)!;
      const value = Number(transaction.fiat_value_usd || 0);
      if (transaction.direction === "OUT") {
        record.outflow += value;
      } else {
        record.inflow += value;
      }
    }
    return Array.from(rows.values()).sort((a, b) => b.inflow - a.inflow);
  }, [transactions]);

  const trialBalanceRows = useMemo(() => {
    return rollForwardRows.map((row) => ({
      account: row.token,
      debit: row.inflow,
      credit: row.outflow,
      net: row.inflow - row.outflow
    }));
  }, [rollForwardRows]);

  const ledgerPivotRows = useMemo(() => {
    const groups = new Map<string, { group: string; count: number; usd: number }>();
    for (const transaction of transactions) {
      const group = transaction.classification || transaction.direction || "UNCLASSIFIED";
      if (!groups.has(group)) {
        groups.set(group, { group, count: 0, usd: 0 });
      }
      const entry = groups.get(group)!;
      entry.count += 1;
      entry.usd += Number(transaction.fiat_value_usd || 0);
    }
    return Array.from(groups.values()).sort((a, b) => b.usd - a.usd);
  }, [transactions]);

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

          <section className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Net Worth Over Time
              </h3>
              <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Net Worth (Cumulative)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {netWorthSeries.map((point) => (
                      <tr key={point.date} className="border-b border-slate-100">
                        <td className="px-2 py-2">{point.date}</td>
                        <td className="px-2 py-2">{fmtUsd(point.value)}</td>
                      </tr>
                    ))}
                    {netWorthSeries.length === 0 && (
                      <tr>
                        <td className="px-2 py-2 text-slate-500" colSpan={2}>
                          Create transactions to visualize trend data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Network Exposure
              </h3>
              <ul className="space-y-2 text-xs">
                {networkExposure.map((item) => (
                  <li
                    key={item.chain}
                    className="flex items-center justify-between rounded border border-slate-200 px-2 py-1.5"
                  >
                    <span className="font-medium uppercase">{item.chain}</span>
                    <span>{fmtUsd(item.value)}</span>
                  </li>
                ))}
                {networkExposure.length === 0 && (
                  <li className="rounded border border-dashed border-slate-200 px-2 py-2 text-slate-500">
                    No network exposure yet.
                  </li>
                )}
              </ul>
              <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recent Activity
              </h4>
              <ul className="mt-2 space-y-2 text-xs">
                {recentActivity.map((transaction) => (
                  <li key={transaction.id} className="rounded border border-slate-200 px-2 py-2">
                    <p className="font-medium">
                      {transaction.token_symbol || "UNKNOWN"} {transaction.direction}{" "}
                      {fmtNumber(Number(transaction.amount_decimal), 6)}
                    </p>
                    <p className="text-slate-500">{new Date(transaction.occurred_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </div>
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

          <section id="accounts" className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Contact Management
              </h3>
              <div className="grid gap-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Contact name"
                  value={contactForm.name}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Wallet address"
                  value={contactForm.walletAddress}
                  onChange={(event) =>
                    setContactForm((prev) => ({ ...prev, walletAddress: event.target.value }))
                  }
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={contactForm.counterpartyType}
                  onChange={(event) =>
                    setContactForm((prev) => ({ ...prev, counterpartyType: event.target.value }))
                  }
                >
                  <option value="EXTERNAL">EXTERNAL</option>
                  <option value="INTERNAL">INTERNAL</option>
                  <option value="VENDOR">VENDOR</option>
                  <option value="CUSTOMER">CUSTOMER</option>
                </select>
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateContact()}
                  disabled={loading}
                >
                  Add Contact
                </button>
              </div>
              <ul className="mt-3 max-h-48 space-y-2 overflow-auto text-xs">
                {contacts.map((contact) => (
                  <li key={contact.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{contact.name}</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() =>
                          void handleUpdateContactStatus(
                            contact.id,
                            contact.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                          )
                        }
                      >
                        {contact.status}
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">{contact.email || contact.wallet_address || "-"}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Custodian Management
              </h3>
              <div className="grid gap-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Custodian name"
                  value={custodianForm.name}
                  onChange={(event) => setCustodianForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={custodianForm.providerType}
                  onChange={(event) =>
                    setCustodianForm((prev) => ({ ...prev, providerType: event.target.value }))
                  }
                >
                  <option value="CUSTODY">CUSTODY</option>
                  <option value="EXCHANGE">EXCHANGE</option>
                  <option value="BROKER">BROKER</option>
                </select>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Account reference"
                  value={custodianForm.accountReference}
                  onChange={(event) =>
                    setCustodianForm((prev) => ({ ...prev, accountReference: event.target.value }))
                  }
                />
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateCustodian()}
                  disabled={loading}
                >
                  Add Custodian
                </button>
              </div>
              <ul className="mt-3 max-h-48 space-y-2 overflow-auto text-xs">
                {custodians.map((custodian) => (
                  <li key={custodian.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{custodian.name}</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() =>
                          void handleUpdateCustodianStatus(
                            custodian.id,
                            custodian.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                          )
                        }
                      >
                        {custodian.status}
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {custodian.provider_type} · {custodian.account_reference || "no reference"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Unidentified Address Queue
              </h3>
              <div className="grid gap-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Chain"
                  value={unidentifiedForm.chain}
                  onChange={(event) =>
                    setUnidentifiedForm((prev) => ({ ...prev, chain: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Address"
                  value={unidentifiedForm.address}
                  onChange={(event) =>
                    setUnidentifiedForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Suggested label"
                  value={unidentifiedForm.label}
                  onChange={(event) =>
                    setUnidentifiedForm((prev) => ({ ...prev, label: event.target.value }))
                  }
                />
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateUnidentifiedAddress()}
                  disabled={loading}
                >
                  Add Address
                </button>
              </div>
              <ul className="mt-3 max-h-48 space-y-2 overflow-auto text-xs">
                {unidentifiedAddresses.map((item) => (
                  <li key={item.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono">{item.address.slice(0, 14)}...</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() => void handleResolveUnidentifiedAddress(item)}
                      >
                        {item.status}
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500 uppercase">
                      {item.chain} · {item.label || "unlabeled"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="assets" className="module-panel mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Assets Inventory
            </h3>
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-2 py-2">Token</th>
                    <th className="px-2 py-2">Network</th>
                    <th className="px-2 py-2">Class</th>
                    <th className="px-2 py-2">Wallets</th>
                    <th className="px-2 py-2">Quantity</th>
                    <th className="px-2 py-2">Value</th>
                    <th className="px-2 py-2">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {assetInventory.map((asset) => (
                    <tr key={`${asset.token_symbol}-${asset.chain}`} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium">{asset.token_symbol}</td>
                      <td className="px-2 py-2 uppercase">{asset.chain}</td>
                      <td className="px-2 py-2">{asset.asset_class}</td>
                      <td className="px-2 py-2">{asset.wallet_count}</td>
                      <td className="px-2 py-2">{fmtNumber(asset.quantity_sum, 6)}</td>
                      <td className="px-2 py-2">{fmtUsd(asset.value_usd_sum)}</td>
                      <td className="px-2 py-2">
                        {asset.latest_snapshot_at
                          ? new Date(asset.latest_snapshot_at).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {assetInventory.length === 0 && (
                    <tr>
                      <td className="px-2 py-2 text-slate-500" colSpan={7}>
                        No assets inventory yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section id="positions" className="module-panel mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Positions</h3>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={showZeroPositions}
                  onChange={(event) => setShowZeroPositions(event.target.checked)}
                />
                Show zero balance
              </label>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={positionForm.walletId}
                onChange={(event) => setPositionForm((prev) => ({ ...prev, walletId: event.target.value }))}
              >
                <option value="">Wallet (optional)</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.chain}:{wallet.address.slice(0, 10)}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Token"
                value={positionForm.tokenSymbol}
                onChange={(event) =>
                  setPositionForm((prev) => ({ ...prev, tokenSymbol: event.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Quantity"
                value={positionForm.quantityDecimal}
                onChange={(event) =>
                  setPositionForm((prev) => ({ ...prev, quantityDecimal: event.target.value }))
                }
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={positionForm.reconciliationStatus}
                onChange={(event) =>
                  setPositionForm((prev) => ({ ...prev, reconciliationStatus: event.target.value }))
                }
              >
                <option value="PENDING">PENDING</option>
                <option value="RECONCILED">RECONCILED</option>
                <option value="UNMATCHED">UNMATCHED</option>
              </select>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Cost basis USD"
                value={positionForm.costBasisUsd}
                onChange={(event) =>
                  setPositionForm((prev) => ({ ...prev, costBasisUsd: event.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Market value USD"
                value={positionForm.marketValueUsd}
                onChange={(event) =>
                  setPositionForm((prev) => ({ ...prev, marketValueUsd: event.target.value }))
                }
              />
              <button
                className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink md:col-span-2"
                onClick={() => void handleCreatePosition()}
                disabled={loading}
              >
                Add Position
              </button>
            </div>
            <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-2 py-2">Token</th>
                    <th className="px-2 py-2">Wallet</th>
                    <th className="px-2 py-2">Qty</th>
                    <th className="px-2 py-2">Cost</th>
                    <th className="px-2 py-2">Market</th>
                    <th className="px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium">{position.token_symbol}</td>
                      <td className="px-2 py-2">
                        {position.wallet_chain && position.wallet_address
                          ? `${position.wallet_chain}:${position.wallet_address.slice(0, 8)}...`
                          : "-"}
                      </td>
                      <td className="px-2 py-2">{position.quantity_decimal}</td>
                      <td className="px-2 py-2">{fmtUsd(Number(position.cost_basis_usd || 0))}</td>
                      <td className="px-2 py-2">{fmtUsd(Number(position.market_value_usd || 0))}</td>
                      <td className="px-2 py-2">
                        <button
                          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                          onClick={() =>
                            void handleUpdatePositionStatus(
                              position.id,
                              position.reconciliation_status === "RECONCILED" ? "PENDING" : "RECONCILED"
                            )
                          }
                        >
                          {position.reconciliation_status}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {positions.length === 0 && (
                    <tr>
                      <td className="px-2 py-2 text-slate-500" colSpan={6}>
                        No positions available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section id="payments" className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Accounts Receivable (Invoices)
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Customer"
                  value={invoiceForm.customerName}
                  onChange={(event) =>
                    setInvoiceForm((prev) => ({ ...prev, customerName: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Invoice #"
                  value={invoiceForm.invoiceNumber}
                  onChange={(event) =>
                    setInvoiceForm((prev) => ({ ...prev, invoiceNumber: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Amount USD"
                  value={invoiceForm.amountUsd}
                  onChange={(event) =>
                    setInvoiceForm((prev) => ({ ...prev, amountUsd: event.target.value }))
                  }
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={invoiceForm.status}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="SENT">SENT</option>
                  <option value="PAID">PAID</option>
                </select>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                />
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink md:col-span-2"
                  onClick={() => void handleCreateInvoice()}
                  disabled={loading}
                >
                  Create Invoice
                </button>
              </div>
              <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-xs">
                {invoices.map((invoice) => (
                  <li key={invoice.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {invoice.customer_name} · {fmtUsd(Number(invoice.amount_usd))}
                      </span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() =>
                          void handleSetInvoiceStatus(
                            invoice.id,
                            invoice.status === "PAID" ? "SENT" : "PAID"
                          )
                        }
                      >
                        {invoice.status}
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">#{invoice.invoice_number || "-"} · due {invoice.due_date || "-"}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Accounts Payable (Bills)
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Vendor"
                  value={billForm.vendorName}
                  onChange={(event) => setBillForm((prev) => ({ ...prev, vendorName: event.target.value }))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Bill #"
                  value={billForm.billNumber}
                  onChange={(event) => setBillForm((prev) => ({ ...prev, billNumber: event.target.value }))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Amount USD"
                  value={billForm.amountUsd}
                  onChange={(event) => setBillForm((prev) => ({ ...prev, amountUsd: event.target.value }))}
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={billForm.status}
                  onChange={(event) => setBillForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PAID">PAID</option>
                </select>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                  type="date"
                  value={billForm.dueDate}
                  onChange={(event) => setBillForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                />
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink md:col-span-2"
                  onClick={() => void handleCreateBill()}
                  disabled={loading}
                >
                  Create Bill
                </button>
              </div>
              <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-xs">
                {bills.map((bill) => (
                  <li key={bill.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {bill.vendor_name} · {fmtUsd(Number(bill.amount_usd))}
                      </span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() =>
                          void handleSetBillStatus(bill.id, bill.status === "PAID" ? "OPEN" : "PAID")
                        }
                      >
                        {bill.status}
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">#{bill.bill_number || "-"} · due {bill.due_date || "-"}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            id="ledger"
            className="module-panel mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Contextual Ledger
            </h3>
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { key: "TRANSACTIONS", label: "Transactions" },
                { key: "COST_BASIS", label: "Cost Basis" },
                { key: "ROLL_FORWARD", label: "Roll Forward" },
                { key: "TRIAL_BALANCE", label: "Trial Balance" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                    ledgerTab === tab.key
                      ? "border-slate-700 bg-slate-700 text-white"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() =>
                    setLedgerTab(
                      tab.key as "TRANSACTIONS" | "COST_BASIS" | "ROLL_FORWARD" | "TRIAL_BALANCE"
                    )
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

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

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                onClick={() => setTxFilters({ search: "staking", direction: "IN", minUsd: "0" })}
              >
                Preset: Staking Inflows
              </button>
              <button
                className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                onClick={() => setTxFilters({ search: "bridge", direction: "OUT", minUsd: "1000" })}
              >
                Preset: Bridge Outflows
              </button>
              <button
                className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                onClick={() => setTxFilters({ search: "", direction: "", minUsd: "" })}
              >
                Reset Presets
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

            {ledgerTab === "COST_BASIS" && (
              <div className="mt-4 rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cost Basis Snapshot
                </p>
                {costBasisSummary ? (
                  <div className="mt-2 grid gap-1 text-xs text-slate-700">
                    <p>
                      Method: <strong>{costBasisSummary.method}</strong>
                    </p>
                    <p>Token: {costBasisSummary.tokenSymbol}</p>
                    <p>Remaining Quantity: {fmtNumber(costBasisSummary.remainingQuantity, 8)}</p>
                    <p>Remaining Cost: {fmtUsd(costBasisSummary.remainingCostUsd)}</p>
                    <p>Realized P/L: {fmtUsd(costBasisSummary.realizedGainLossUsd)}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Run a cost basis calculation in Governance to populate this tab.
                  </p>
                )}
              </div>
            )}

            {ledgerTab === "ROLL_FORWARD" && (
              <div className="mt-4 max-h-56 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-2">Token</th>
                      <th className="px-2 py-2">Inflow USD</th>
                      <th className="px-2 py-2">Outflow USD</th>
                      <th className="px-2 py-2">Net USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rollForwardRows.map((row) => (
                      <tr key={row.token} className="border-b border-slate-100">
                        <td className="px-2 py-2">{row.token}</td>
                        <td className="px-2 py-2">{fmtUsd(row.inflow)}</td>
                        <td className="px-2 py-2">{fmtUsd(row.outflow)}</td>
                        <td className="px-2 py-2">{fmtUsd(row.inflow - row.outflow)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ledgerTab === "TRIAL_BALANCE" && (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-2 py-2">Account</th>
                        <th className="px-2 py-2">Debit</th>
                        <th className="px-2 py-2">Credit</th>
                        <th className="px-2 py-2">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalanceRows.map((row) => (
                        <tr key={row.account} className="border-b border-slate-100">
                          <td className="px-2 py-2">{row.account}</td>
                          <td className="px-2 py-2">{fmtUsd(row.debit)}</td>
                          <td className="px-2 py-2">{fmtUsd(row.credit)}</td>
                          <td className="px-2 py-2">{fmtUsd(row.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-2 py-2">Pivot Group</th>
                        <th className="px-2 py-2">Rows</th>
                        <th className="px-2 py-2">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerPivotRows.map((row) => (
                        <tr key={row.group} className="border-b border-slate-100">
                          <td className="px-2 py-2">{row.group}</td>
                          <td className="px-2 py-2">{row.count}</td>
                          <td className="px-2 py-2">{fmtUsd(row.usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">{report.title}</td>
                        <td className="px-2 py-2">{report.report_type}</td>
                        <td className="px-2 py-2">{report.status}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button
                              className="rounded border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100"
                              onClick={() => void handleRunReport(report.id)}
                            >
                              Run
                            </button>
                            <button
                              className="rounded border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100"
                              onClick={() => void handlePublishReport(report.id)}
                            >
                              Publish
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Published Reports
              </h4>
              <ul className="mt-2 max-h-40 space-y-2 overflow-auto text-xs">
                {publishedReports.map((publication) => (
                  <li key={publication.id} className="rounded border border-slate-200 p-2">
                    <p className="font-medium">{publication.title}</p>
                    <p className="mt-1 text-slate-500">
                      {publication.report_type} · {publication.visibility} ·{" "}
                      {new Date(publication.published_at).toLocaleString()}
                    </p>
                  </li>
                ))}
                {publishedReports.length === 0 && (
                  <li className="rounded border border-dashed border-slate-200 p-2 text-slate-500">
                    No published reports yet.
                  </li>
                )}
              </ul>
            </div>
          </section>

          <section id="integrations" className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                ERP Integrations
              </h3>
              <div className="grid gap-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="System (NETSUITE/SAP)"
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
                  <li key={connection.id} className="rounded border border-slate-200 p-2">
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

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Xero Integration
              </h3>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                value={xeroForm.configJson}
                onChange={(event) => setXeroForm({ configJson: event.target.value })}
              />
              <button
                className="mt-2 rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                onClick={() => void handleCreateXeroConnection()}
                disabled={loading}
              >
                Connect Xero
              </button>
              <ul className="mt-3 space-y-2 text-xs">
                {xeroConnections.map((connection) => (
                  <li key={connection.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">XERO</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() => void handleMarkIntegrationSynced("xero", connection.id)}
                      >
                        Mark Synced
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">{connection.status}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                QuickBooks Integration
              </h3>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                value={quickbooksForm.configJson}
                onChange={(event) => setQuickbooksForm({ configJson: event.target.value })}
              />
              <button
                className="mt-2 rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                onClick={() => void handleCreateQuickbooksConnection()}
                disabled={loading}
              >
                Connect QuickBooks
              </button>
              <ul className="mt-3 space-y-2 text-xs">
                {quickbooksConnections.map((connection) => (
                  <li key={connection.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">QUICKBOOKS</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() => void handleMarkIntegrationSynced("quickbooks", connection.id)}
                      >
                        Mark Synced
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">{connection.status}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="frameworks" className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Frameworks Workspace (1099)
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                  placeholder="Case title"
                  value={frameworkForm.title}
                  onChange={(event) => setFrameworkForm((prev) => ({ ...prev, title: event.target.value }))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  value={frameworkForm.dueDate}
                  onChange={(event) => setFrameworkForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Owner"
                  value={frameworkForm.owner}
                  onChange={(event) => setFrameworkForm((prev) => ({ ...prev, owner: event.target.value }))}
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={frameworkForm.status}
                  onChange={(event) => setFrameworkForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
                <button
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-ink"
                  onClick={() => void handleCreateFrameworkCase()}
                  disabled={loading}
                >
                  Add Case
                </button>
              </div>
              <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-xs">
                {frameworkCases1099.map((item) => (
                  <li key={item.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.title}</span>
                      <button
                        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                        onClick={() =>
                          void handleUpdateFrameworkCaseStatus(
                            item.id,
                            item.status === "COMPLETED" ? "OPEN" : "COMPLETED"
                          )
                        }
                      >
                        {item.status}
                      </button>
                    </div>
                    <p className="mt-1 text-slate-500">
                      owner: {item.owner || "unassigned"} · due: {item.due_date || "n/a"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="module-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Framework Catalog
              </h3>
              <ul className="space-y-2 text-xs">
                {frameworkCatalog.map((item) => (
                  <li key={item.code} className="rounded border border-slate-200 p-2">
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-slate-500">
                      {item.code} · {item.status}
                    </p>
                  </li>
                ))}
              </ul>
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
                Workflow Orchestration
              </h3>
              <div className="rounded-lg border border-slate-200 p-3 text-xs">
                <p className="text-slate-500">Active alerts</p>
                <p className="text-lg font-semibold text-ink">
                  {alerts.filter((item) => Boolean(item.is_active)).length}
                </p>
              </div>
              <div className="mt-2 rounded-lg border border-slate-200 p-3 text-xs">
                <p className="text-slate-500">Active rules</p>
                <p className="text-lg font-semibold text-ink">
                  {rules.filter((item) => Boolean(item.is_active)).length}
                </p>
              </div>
              <div className="mt-2 rounded-lg border border-slate-200 p-3 text-xs">
                <p className="text-slate-500">Active webhooks</p>
                <p className="text-lg font-semibold text-ink">
                  {webhooks.filter((item) => item.status === "ACTIVE").length}
                </p>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Use Alerts, Rules, and Webhooks to orchestrate treasury workflows end-to-end.
              </p>
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
