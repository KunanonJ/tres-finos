CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
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

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  discrepancy_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_recon_org_period
  ON reconciliation_runs(organization_id, period_start, period_end);
