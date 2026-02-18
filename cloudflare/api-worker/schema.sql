CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
  source_type TEXT NOT NULL DEFAULT 'ONCHAIN',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_chain_address
  ON wallets(chain, address);

CREATE INDEX IF NOT EXISTS idx_wallet_organization
  ON wallets(organization_id);

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  chain TEXT NOT NULL,
  token_symbol TEXT,
  token_address TEXT,
  amount_decimal TEXT NOT NULL,
  fiat_value_usd TEXT,
  cost_basis_usd TEXT,
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  classification TEXT,
  counterparty TEXT,
  metadata_json TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_chain_hash_wallet
  ON ledger_transactions(chain, tx_hash, wallet_id);

CREATE INDEX IF NOT EXISTS idx_tx_org_occurred
  ON ledger_transactions(organization_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_tx_wallet_occurred
  ON ledger_transactions(wallet_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_tx_org_chain
  ON ledger_transactions(organization_id, chain);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  discrepancy_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  unmatched_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_recon_org_period
  ON reconciliation_runs(organization_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  parameters_json TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  result_json TEXT,
  generated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_org_created
  ON reports(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  threshold_operator TEXT,
  threshold_value REAL,
  channel TEXT NOT NULL DEFAULT 'EMAIL',
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_org_active
  ON alerts(organization_id, is_active);

CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  conditions_json TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_rules_org_priority
  ON automation_rules(organization_id, priority);

CREATE TABLE IF NOT EXISTS erp_connections (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  system_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONNECTED',
  config_json TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_erp_org_system
  ON erp_connections(organization_id, system_name);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ACCOUNTANT',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  permissions_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_member_org_email
  ON team_members(organization_id, email);

CREATE INDEX IF NOT EXISTS idx_team_member_org_role
  ON team_members(organization_id, role);

CREATE TABLE IF NOT EXISTS transaction_notes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  author_member_id TEXT,
  note_text TEXT NOT NULL,
  mentions_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (transaction_id) REFERENCES ledger_transactions(id),
  FOREIGN KEY (author_member_id) REFERENCES team_members(id)
);

CREATE INDEX IF NOT EXISTS idx_tx_notes_tx
  ON transaction_notes(transaction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tx_notes_org
  ON transaction_notes(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS transaction_groups (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  purpose TEXT,
  created_by_member_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by_member_id) REFERENCES team_members(id)
);

CREATE INDEX IF NOT EXISTS idx_tx_groups_org
  ON transaction_groups(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS transaction_group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES transaction_groups(id),
  FOREIGN KEY (transaction_id) REFERENCES ledger_transactions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_group_member_unique
  ON transaction_group_members(group_id, transaction_id);

CREATE INDEX IF NOT EXISTS idx_tx_group_member_tx
  ON transaction_group_members(transaction_id);

CREATE TABLE IF NOT EXISTS transaction_splits (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  split_ref TEXT,
  amount_decimal TEXT NOT NULL,
  cost_basis_usd TEXT,
  department TEXT,
  obligation_ref TEXT,
  created_by_member_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (transaction_id) REFERENCES ledger_transactions(id),
  FOREIGN KEY (created_by_member_id) REFERENCES team_members(id)
);

CREATE INDEX IF NOT EXISTS idx_tx_splits_tx
  ON transaction_splits(transaction_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret_hint TEXT,
  event_types_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org_status
  ON webhook_subscriptions(organization_id, status);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  webhook_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'SIMULATED',
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (webhook_id) REFERENCES webhook_subscriptions(id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook
  ON webhook_events(webhook_id, created_at DESC);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  wallet_address TEXT,
  counterparty_type TEXT NOT NULL DEFAULT 'EXTERNAL',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_org_status
  ON contacts(organization_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS custodians (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'CUSTODY',
  account_reference TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata_json TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_custodians_org_status
  ON custodians(organization_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS unidentified_addresses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  first_seen_at TEXT,
  last_seen_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unidentified_org_chain_address
  ON unidentified_addresses(organization_id, chain, address);

CREATE INDEX IF NOT EXISTS idx_unidentified_org_status
  ON unidentified_addresses(organization_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS assets_snapshots (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  wallet_id TEXT,
  chain TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL DEFAULT 'TOKEN',
  quantity_decimal TEXT NOT NULL,
  unit_price_usd TEXT,
  value_usd TEXT NOT NULL DEFAULT '0',
  snapshot_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

CREATE INDEX IF NOT EXISTS idx_assets_snapshots_org_time
  ON assets_snapshots(organization_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_assets_snapshots_org_symbol
  ON assets_snapshots(organization_id, token_symbol, chain, snapshot_at DESC);

CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  wallet_id TEXT,
  token_symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL DEFAULT 'TOKEN',
  quantity_decimal TEXT NOT NULL,
  cost_basis_usd TEXT,
  market_value_usd TEXT,
  reconciliation_status TEXT NOT NULL DEFAULT 'PENDING',
  is_zero_balance INTEGER NOT NULL DEFAULT 0,
  as_of TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

CREATE INDEX IF NOT EXISTS idx_positions_org_as_of
  ON positions(organization_id, as_of DESC);

CREATE INDEX IF NOT EXISTS idx_positions_org_status
  ON positions(organization_id, reconciliation_status, is_zero_balance);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  invoice_number TEXT,
  amount_usd TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  due_date TEXT,
  issued_at TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_status
  ON invoices(organization_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  bill_number TEXT,
  amount_usd TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  due_date TEXT,
  issued_at TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_bills_org_status
  ON bills(organization_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  payment_kind TEXT NOT NULL,
  payment_record_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount_usd TEXT,
  occurred_at TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_org_record
  ON payment_events(organization_id, payment_kind, payment_record_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS report_publications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'INTERNAL',
  published_by TEXT,
  published_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PUBLISHED',
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE INDEX IF NOT EXISTS idx_report_publications_org_time
  ON report_publications(organization_id, published_at DESC);

CREATE TABLE IF NOT EXISTS framework_cases (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  framework_code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  due_date TEXT,
  owner TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_framework_cases_org_code
  ON framework_cases(organization_id, framework_code, status, created_at DESC);
