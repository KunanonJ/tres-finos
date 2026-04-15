export type HealthState = {
  status: string;
  detail: string;
};

export type Organization = {
  id: string;
  name: string;
  base_currency: string;
  status: string;
  created_at: string;
};

export type DashboardSummary = {
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

export type AssetPosition = {
  token_symbol: string;
  tx_count: number;
  amount_sum: number;
  usd_sum: number;
};

export type Wallet = {
  id: string;
  chain: string;
  address: string;
  label: string | null;
  source_type: string;
  is_active: number;
};

export type LedgerTransaction = {
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

export type ReconciliationRun = {
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

export type ReportItem = {
  id: string;
  report_type: string;
  title: string;
  status: string;
  generated_at: string | null;
  created_at: string;
};

export type AlertItem = {
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

export type RuleItem = {
  id: string;
  name: string;
  rule_type: string;
  priority: number;
  is_active: number;
  conditions_json: string;
  actions_json: string;
};

export type ErpConnection = {
  id: string;
  system_name: string;
  status: string;
  last_sync_at: string | null;
  created_at: string;
};

export type TeamMember = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
};

export type TransactionNote = {
  id: string;
  note_text: string;
  created_at: string;
  author_display_name: string | null;
  author_email: string | null;
};

export type WebhookSubscription = {
  id: string;
  name: string;
  endpoint_url: string;
  status: string;
  event_types_json: string;
};

export type CostBasisSummary = {
  method: string;
  tokenSymbol: string;
  remainingQuantity: number;
  remainingCostUsd: number;
  realizedGainLossUsd: number;
  averageCostPerUnitUsd: number;
  sampleSize: number;
};

export type ContactItem = {
  id: string;
  name: string;
  email: string | null;
  wallet_address: string | null;
  counterparty_type: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export type CustodianItem = {
  id: string;
  name: string;
  provider_type: string;
  account_reference: string | null;
  status: string;
  last_sync_at: string | null;
};

export type UnidentifiedAddressItem = {
  id: string;
  chain: string;
  address: string;
  label: string | null;
  status: string;
  last_seen_at: string | null;
};

export type AssetInventoryItem = {
  token_symbol: string;
  chain: string;
  asset_class: string;
  wallet_count: number;
  quantity_sum: number;
  value_usd_sum: number;
  latest_snapshot_at: string;
};

export type PositionItem = {
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

export type InvoiceItem = {
  id: string;
  customer_name: string;
  invoice_number: string | null;
  amount_usd: string;
  status: string;
  due_date: string | null;
  issued_at: string | null;
};

export type BillItem = {
  id: string;
  vendor_name: string;
  bill_number: string | null;
  amount_usd: string;
  status: string;
  due_date: string | null;
  issued_at: string | null;
};

export type PublishedReport = {
  id: string;
  report_id: string;
  title: string;
  report_type: string;
  visibility: string;
  published_by: string | null;
  published_at: string;
  status: string;
};

export type FrameworkCaseItem = {
  id: string;
  framework_code: string;
  title: string;
  status: string;
  due_date: string | null;
  owner: string | null;
  created_at: string;
};

export type FrameworkCatalogItem = {
  code: string;
  name: string;
  status: string;
};
