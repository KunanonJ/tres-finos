export interface Env {
  tres_finos_db: D1Database;
}

type JsonObject = Record<string, unknown>;

const CORS_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
  "access-control-allow-headers": "content-type"
};

function json(data: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseLimit(url: URL, fallback = 100, max = 500): number {
  const raw = Number(url.searchParams.get("limit") ?? fallback);
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return clamp(Math.floor(raw), 1, max);
}

function safeJsonString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value ?? {});
}

async function all(db: D1Database, sql: string, params: unknown[] = []): Promise<JsonObject[]> {
  const stmt = db.prepare(sql);
  const result = params.length > 0 ? await stmt.bind(...params).all<JsonObject>() : await stmt.all<JsonObject>();
  return result.results ?? [];
}

async function first(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<JsonObject | null> {
  const rows = await all(db, `${sql} LIMIT 1`, params);
  return rows[0] ?? null;
}

async function run(db: D1Database, sql: string, params: unknown[] = []): Promise<D1Result> {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    return stmt.bind(...params).run();
  }
  return stmt.run();
}

async function organizationExists(db: D1Database, organizationId: string): Promise<boolean> {
  const row = await first(db, "SELECT id FROM organizations WHERE id = ?", [organizationId]);
  return Boolean(row?.id);
}

async function walletExists(db: D1Database, walletId: string): Promise<boolean> {
  const row = await first(db, "SELECT id FROM wallets WHERE id = ?", [walletId]);
  return Boolean(row?.id);
}

async function getDashboardSummary(
  db: D1Database,
  organizationId: string,
  periodDays = 30
): Promise<JsonObject> {
  const fromDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  const walletAgg = await first(
    db,
    "SELECT COUNT(*) AS wallet_count, COUNT(CASE WHEN is_active = 1 THEN 1 END) AS active_wallet_count FROM wallets WHERE organization_id = ?",
    [organizationId]
  );

  const txAgg = await first(
    db,
    `SELECT
      COUNT(*) AS transaction_count,
      COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) AS confirmed_transaction_count,
      SUM(CASE WHEN direction = 'IN' THEN COALESCE(CAST(fiat_value_usd AS REAL), 0) ELSE 0 END) AS inflow_usd,
      SUM(CASE WHEN direction = 'OUT' THEN COALESCE(CAST(fiat_value_usd AS REAL), 0) ELSE 0 END) AS outflow_usd,
      SUM(COALESCE(CAST(fiat_value_usd AS REAL), 0)) AS gross_usd,
      COUNT(DISTINCT chain) AS active_chains
    FROM ledger_transactions
    WHERE organization_id = ? AND occurred_at >= ?`,
    [organizationId, fromDate]
  );

  const reconAgg = await first(
    db,
    "SELECT COUNT(*) AS open_reconciliation_count FROM reconciliation_runs WHERE organization_id = ? AND status != 'COMPLETED'",
    [organizationId]
  );

  const inflowUsd = asNumber(txAgg?.inflow_usd);
  const outflowUsd = asNumber(txAgg?.outflow_usd);

  return {
    periodDays,
    walletCount: asNumber(walletAgg?.wallet_count),
    activeWalletCount: asNumber(walletAgg?.active_wallet_count),
    transactionCount: asNumber(txAgg?.transaction_count),
    confirmedTransactionCount: asNumber(txAgg?.confirmed_transaction_count),
    activeChains: asNumber(txAgg?.active_chains),
    inflowUsd,
    outflowUsd,
    netFlowUsd: inflowUsd - outflowUsd,
    grossUsd: asNumber(txAgg?.gross_usd),
    openReconciliationCount: asNumber(reconAgg?.open_reconciliation_count)
  };
}

async function getTopAssets(
  db: D1Database,
  organizationId: string,
  limit: number
): Promise<JsonObject[]> {
  return all(
    db,
    `SELECT
      COALESCE(token_symbol, 'UNKNOWN') AS token_symbol,
      COUNT(*) AS tx_count,
      ROUND(SUM(CAST(amount_decimal AS REAL)), 8) AS amount_sum,
      ROUND(SUM(COALESCE(CAST(fiat_value_usd AS REAL), 0)), 2) AS usd_sum
    FROM ledger_transactions
    WHERE organization_id = ?
    GROUP BY COALESCE(token_symbol, 'UNKNOWN')
    ORDER BY usd_sum DESC
    LIMIT ?`,
    [organizationId, limit]
  );
}

function parseBool(v: unknown): boolean | null {
  if (typeof v === "boolean") {
    return v;
  }
  if (typeof v === "number") {
    return v !== 0;
  }
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return null;
}

function parseJsonObject(value: unknown, fallback: JsonObject = {}): JsonObject {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value as JsonObject;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as JsonObject;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function upper(value: string | null | undefined): string {
  return (value ?? "").toUpperCase();
}

function lower(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function matchesRule(
  conditions: JsonObject,
  candidate: {
    walletId: string;
    chain: string;
    direction: string;
    tokenSymbol: string;
    counterparty: string;
    fiatValueUsd: number;
  }
): boolean {
  if (typeof conditions.walletId === "string" && conditions.walletId !== candidate.walletId) {
    return false;
  }

  if (typeof conditions.chain === "string" && lower(conditions.chain) !== candidate.chain) {
    return false;
  }

  if (typeof conditions.direction === "string" && upper(conditions.direction) !== candidate.direction) {
    return false;
  }

  if (typeof conditions.tokenSymbol === "string" && upper(conditions.tokenSymbol) !== candidate.tokenSymbol) {
    return false;
  }

  if (typeof conditions.counterparty === "string" && lower(conditions.counterparty) !== candidate.counterparty) {
    return false;
  }

  if (
    typeof conditions.counterpartyContains === "string" &&
    !candidate.counterparty.includes(lower(conditions.counterpartyContains))
  ) {
    return false;
  }

  if (conditions.minUsd !== undefined && candidate.fiatValueUsd < asNumber(conditions.minUsd)) {
    return false;
  }

  if (conditions.maxUsd !== undefined && candidate.fiatValueUsd > asNumber(conditions.maxUsd)) {
    return false;
  }

  return true;
}

async function getAutoClassification(
  db: D1Database,
  organizationId: string,
  candidate: {
    walletId: string;
    chain: string;
    direction: string;
    tokenSymbol: string;
    counterparty: string;
    fiatValueUsd: number;
  }
): Promise<string | null> {
  const rules = await all(
    db,
    `SELECT conditions_json, actions_json
     FROM automation_rules
     WHERE organization_id = ?
       AND is_active = 1
       AND rule_type IN ('CLASSIFICATION', 'AUTO_CLASSIFICATION')
     ORDER BY priority ASC, created_at ASC
     LIMIT 200`,
    [organizationId]
  );

  for (const rule of rules) {
    const conditions = parseJsonObject(rule.conditions_json);
    if (!matchesRule(conditions, candidate)) {
      continue;
    }

    const actions = parseJsonObject(rule.actions_json);
    if (typeof actions.classification === "string" && actions.classification.trim()) {
      return actions.classification.trim();
    }
  }

  return null;
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replaceAll("\"", "\"\"")}"`;
  }
  return raw;
}

function toCsv(rows: JsonObject[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvResponse(content: string, filename: string): Response {
  return new Response(content, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}

type CostBasisMethod = "FIFO" | "LIFO" | "WAC" | "SPECIFIC_MAX_GAIN" | "SPECIFIC_MAX_LOSS";

function normalizeCostBasisMethod(value: unknown): CostBasisMethod {
  const method = upper(typeof value === "string" ? value : "FIFO");
  if (
    method === "FIFO" ||
    method === "LIFO" ||
    method === "WAC" ||
    method === "SPECIFIC_MAX_GAIN" ||
    method === "SPECIFIC_MAX_LOSS"
  ) {
    return method;
  }
  return "FIFO";
}

async function calculateCostBasis(
  db: D1Database,
  organizationId: string,
  tokenSymbol: string,
  method: CostBasisMethod
): Promise<JsonObject> {
  const rows = await all(
    db,
    `SELECT amount_decimal, direction, fiat_value_usd, cost_basis_usd, occurred_at
     FROM ledger_transactions
     WHERE organization_id = ? AND UPPER(COALESCE(token_symbol, '')) = ?
     ORDER BY occurred_at ASC`,
    [organizationId, upper(tokenSymbol)]
  );

  type Lot = { qty: number; totalCost: number };
  const lots: Lot[] = [];

  let inventoryQty = 0;
  let inventoryCost = 0;
  let inQuantity = 0;
  let outQuantity = 0;
  let realizedGainLossUsd = 0;

  const consumeFromLots = (qtyOut: number): number => {
    let remaining = qtyOut;
    let consumed = 0;

    const pickIndex = (): number => {
      if (lots.length === 0) {
        return -1;
      }

      if (method === "LIFO") {
        return lots.length - 1;
      }

      if (method === "SPECIFIC_MAX_GAIN") {
        let minIdx = 0;
        let minUnit = lots[0].qty > 0 ? lots[0].totalCost / lots[0].qty : Number.POSITIVE_INFINITY;
        for (let i = 1; i < lots.length; i += 1) {
          const unit = lots[i].qty > 0 ? lots[i].totalCost / lots[i].qty : Number.POSITIVE_INFINITY;
          if (unit < minUnit) {
            minUnit = unit;
            minIdx = i;
          }
        }
        return minIdx;
      }

      if (method === "SPECIFIC_MAX_LOSS") {
        let maxIdx = 0;
        let maxUnit = lots[0].qty > 0 ? lots[0].totalCost / lots[0].qty : 0;
        for (let i = 1; i < lots.length; i += 1) {
          const unit = lots[i].qty > 0 ? lots[i].totalCost / lots[i].qty : 0;
          if (unit > maxUnit) {
            maxUnit = unit;
            maxIdx = i;
          }
        }
        return maxIdx;
      }

      return 0;
    };

    while (remaining > 0.000000001 && lots.length > 0) {
      const idx = pickIndex();
      if (idx < 0) {
        break;
      }

      const lot = lots[idx];
      if (lot.qty <= 0) {
        lots.splice(idx, 1);
        continue;
      }

      const unitCost = lot.totalCost / lot.qty;
      const taken = Math.min(remaining, lot.qty);
      consumed += taken * unitCost;
      lot.qty -= taken;
      lot.totalCost -= taken * unitCost;
      remaining -= taken;

      if (lot.qty <= 0.000000001) {
        lots.splice(idx, 1);
      } else {
        lots[idx] = lot;
      }
    }

    return consumed;
  };

  for (const row of rows) {
    const quantity = Math.abs(asNumber(row.amount_decimal));
    const direction = upper(String(row.direction ?? ""));
    const costReference =
      row.cost_basis_usd !== null && row.cost_basis_usd !== undefined
        ? asNumber(row.cost_basis_usd)
        : asNumber(row.fiat_value_usd);

    if (quantity <= 0) {
      continue;
    }

    if (direction === "IN" || direction === "INTERNAL") {
      inQuantity += quantity;
      inventoryQty += quantity;
      inventoryCost += costReference;
      if (method !== "WAC") {
        lots.push({ qty: quantity, totalCost: costReference });
      }
      continue;
    }

    if (direction !== "OUT") {
      continue;
    }

    outQuantity += quantity;
    const proceeds = asNumber(row.fiat_value_usd);

    let consumedCost = 0;
    if (method === "WAC") {
      const avgCost = inventoryQty > 0 ? inventoryCost / inventoryQty : 0;
      consumedCost = quantity * avgCost;
      inventoryQty = Math.max(0, inventoryQty - quantity);
      inventoryCost = Math.max(0, inventoryCost - consumedCost);
    } else {
      consumedCost = consumeFromLots(quantity);
      inventoryQty = Math.max(0, inventoryQty - quantity);
      inventoryCost = Math.max(0, inventoryCost - consumedCost);
    }

    realizedGainLossUsd += proceeds - consumedCost;
  }

  return {
    organizationId,
    tokenSymbol: upper(tokenSymbol),
    method,
    inQuantity: Number(inQuantity.toFixed(8)),
    outQuantity: Number(outQuantity.toFixed(8)),
    remainingQuantity: Number(inventoryQty.toFixed(8)),
    remainingCostUsd: Number(inventoryCost.toFixed(2)),
    realizedGainLossUsd: Number(realizedGainLossUsd.toFixed(2)),
    averageCostPerUnitUsd: Number((inventoryQty > 0 ? inventoryCost / inventoryQty : 0).toFixed(8)),
    sampleSize: rows.length
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { tres_finos_db: db } = env;
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname;
    const segments = pathname.split("/").filter(Boolean);

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    try {
      if (method === "GET" && pathname === "/health") {
        return json({
          status: "ok",
          service: "tres-api-worker",
          timestamp: nowIso()
        });
      }

      if (method === "GET" && pathname === "/v1") {
        return json({
          name: "tres-finos-api",
          version: "0.4.0",
          stage: "prd-phase3-expanded-worker"
        });
      }

      if (segments[0] !== "v1") {
        return error("Not Found", 404);
      }

      // Organizations
      if (method === "GET" && pathname === "/v1/organizations") {
        const items = await all(
          db,
          "SELECT id, name, base_currency, status, created_at, updated_at FROM organizations ORDER BY created_at DESC"
        );
        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/organizations") {
        const body = await readJson<{ name?: string; baseCurrency?: string }>(request);
        if (!body?.name?.trim()) {
          return error("name is required");
        }

        const organizationId = makeId("org");
        await run(
          db,
          "INSERT INTO organizations (id, name, base_currency) VALUES (?, ?, ?)",
          [organizationId, body.name.trim(), body.baseCurrency?.toUpperCase() || "USD"]
        );

        return json({ id: organizationId, name: body.name.trim() }, 201);
      }

      if (method === "PATCH" && segments.length === 3 && segments[1] === "organizations") {
        const organizationId = segments[2];
        const body = await readJson<{ name?: string; status?: string; baseCurrency?: string }>(request);
        if (!body) {
          return error("invalid JSON body");
        }

        await run(
          db,
          "UPDATE organizations SET name = COALESCE(?, name), status = COALESCE(?, status), base_currency = COALESCE(?, base_currency), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [body.name?.trim() || null, body.status?.toUpperCase() || null, body.baseCurrency?.toUpperCase() || null, organizationId]
        );

        return json({ updated: true, id: organizationId });
      }

      // Team members
      if (method === "GET" && pathname === "/v1/team-members") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const items = await all(
          db,
          `SELECT
            id, organization_id, email, display_name, role, status, permissions_json, created_at, updated_at
          FROM team_members
          WHERE organization_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
          [organizationId, parseLimit(url, 100, 500)]
        );
        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/team-members") {
        const body = await readJson<{
          organizationId?: string;
          email?: string;
          displayName?: string;
          role?: string;
          permissions?: JsonObject;
        }>(request);
        if (!body?.organizationId || !body.email?.trim() || !body.displayName?.trim()) {
          return error("organizationId, email and displayName are required");
        }
        if (!(await organizationExists(db, body.organizationId))) {
          return error("organization not found", 404);
        }

        const memberId = makeId("usr");
        try {
          await run(
            db,
            `INSERT INTO team_members (
              id, organization_id, email, display_name, role, permissions_json
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              memberId,
              body.organizationId,
              lower(body.email.trim()),
              body.displayName.trim(),
              upper(body.role || "ACCOUNTANT"),
              safeJsonString(body.permissions ?? {})
            ]
          );
        } catch {
          return error("team member already exists in organization", 409);
        }

        return json({ id: memberId }, 201);
      }

      if (method === "PATCH" && segments.length === 3 && segments[1] === "team-members") {
        const memberId = segments[2];
        const body = await readJson<{
          displayName?: string;
          role?: string;
          status?: string;
          permissions?: JsonObject;
        }>(request);
        if (!body) {
          return error("invalid JSON body");
        }

        await run(
          db,
          `UPDATE team_members SET
            display_name = COALESCE(?, display_name),
            role = COALESCE(?, role),
            status = COALESCE(?, status),
            permissions_json = COALESCE(?, permissions_json),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            body.displayName?.trim() ?? null,
            body.role ? upper(body.role) : null,
            body.status ? upper(body.status) : null,
            body.permissions ? safeJsonString(body.permissions) : null,
            memberId
          ]
        );

        return json({ updated: true, id: memberId });
      }

      // Dashboard
      if (method === "GET" && pathname === "/v1/dashboard/summary") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }
        if (!(await organizationExists(db, organizationId))) {
          return error("organization not found", 404);
        }

        const periodDays = clamp(asNumber(url.searchParams.get("periodDays"), 30), 1, 365);
        const summary = await getDashboardSummary(db, organizationId, periodDays);
        return json({ summary });
      }

      if (method === "GET" && pathname === "/v1/dashboard/top-assets") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }
        if (!(await organizationExists(db, organizationId))) {
          return error("organization not found", 404);
        }

        const limit = parseLimit(url, 10, 50);
        const items = await getTopAssets(db, organizationId, limit);
        return json({ items });
      }

      // Wallets
      if (method === "GET" && pathname === "/v1/wallets") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const items = await all(
          db,
          "SELECT id, organization_id, chain, address, label, source_type, is_active, created_at, updated_at FROM wallets WHERE organization_id = ? ORDER BY created_at DESC",
          [organizationId]
        );
        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/wallets") {
        const body = await readJson<{
          organizationId?: string;
          chain?: string;
          address?: string;
          label?: string;
          sourceType?: string;
        }>(request);

        if (!body?.organizationId || !body?.chain || !body?.address) {
          return error("organizationId, chain and address are required");
        }

        if (!(await organizationExists(db, body.organizationId))) {
          return error("organization not found", 404);
        }

        const walletId = makeId("wal");
        try {
          await run(
            db,
            "INSERT INTO wallets (id, organization_id, chain, address, label, source_type) VALUES (?, ?, ?, ?, ?, ?)",
            [
              walletId,
              body.organizationId,
              body.chain.toLowerCase(),
              body.address.toLowerCase(),
              body.label?.trim() || null,
              body.sourceType?.toUpperCase() || "ONCHAIN"
            ]
          );
        } catch {
          return error("wallet already exists or references are invalid", 409);
        }

        return json({ id: walletId }, 201);
      }

      if (method === "PATCH" && segments.length === 3 && segments[1] === "wallets") {
        const walletId = segments[2];
        const body = await readJson<{ label?: string; isActive?: boolean; sourceType?: string }>(request);
        if (!body) {
          return error("invalid JSON body");
        }

        const isActive = parseBool(body.isActive);
        await run(
          db,
          "UPDATE wallets SET label = COALESCE(?, label), source_type = COALESCE(?, source_type), is_active = COALESCE(?, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [body.label?.trim() || null, body.sourceType?.toUpperCase() || null, isActive === null ? null : isActive ? 1 : 0, walletId]
        );

        return json({ updated: true, id: walletId });
      }

      // Transactions
      if (method === "GET" && pathname === "/v1/transactions") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const clauses: string[] = ["organization_id = ?"];
        const params: unknown[] = [organizationId];

        const walletId = url.searchParams.get("walletId");
        if (walletId) {
          clauses.push("wallet_id = ?");
          params.push(walletId);
        }

        const chain = url.searchParams.get("chain");
        if (chain) {
          clauses.push("chain = ?");
          params.push(chain.toLowerCase());
        }

        const tokenSymbol = url.searchParams.get("tokenSymbol");
        if (tokenSymbol) {
          clauses.push("COALESCE(token_symbol, '') = ?");
          params.push(tokenSymbol.toUpperCase());
        }

        const direction = url.searchParams.get("direction");
        if (direction) {
          clauses.push("direction = ?");
          params.push(direction.toUpperCase());
        }

        const status = url.searchParams.get("status");
        if (status) {
          clauses.push("status = ?");
          params.push(status.toUpperCase());
        }

        const from = url.searchParams.get("from");
        if (from) {
          clauses.push("occurred_at >= ?");
          params.push(from);
        }

        const to = url.searchParams.get("to");
        if (to) {
          clauses.push("occurred_at <= ?");
          params.push(to);
        }

        const minUsd = url.searchParams.get("minUsd");
        if (minUsd) {
          clauses.push("COALESCE(CAST(fiat_value_usd AS REAL), 0) >= ?");
          params.push(asNumber(minUsd));
        }

        const maxUsd = url.searchParams.get("maxUsd");
        if (maxUsd) {
          clauses.push("COALESCE(CAST(fiat_value_usd AS REAL), 0) <= ?");
          params.push(asNumber(maxUsd));
        }

        const search = url.searchParams.get("search")?.trim();
        if (search) {
          clauses.push("(tx_hash LIKE ? OR COALESCE(token_symbol, '') LIKE ? OR COALESCE(counterparty, '') LIKE ?)");
          const pattern = `%${search}%`;
          params.push(pattern, pattern, pattern);
        }

        const limit = parseLimit(url, 200, 500);
        params.push(limit);

        const items = await all(
          db,
          `SELECT
            id, organization_id, wallet_id, tx_hash, chain, token_symbol, token_address,
            amount_decimal, fiat_value_usd, cost_basis_usd, direction, status,
            classification, counterparty, metadata_json, occurred_at, created_at, updated_at
          FROM ledger_transactions
          WHERE ${clauses.join(" AND ")}
          ORDER BY occurred_at DESC
          LIMIT ?`,
          params
        );

        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/transactions") {
        const body = await readJson<{
          organizationId?: string;
          walletId?: string;
          txHash?: string;
          chain?: string;
          amountDecimal?: string;
          direction?: "IN" | "OUT" | "INTERNAL";
          status?: "PENDING" | "CONFIRMED" | "FAILED";
          occurredAt?: string;
          tokenSymbol?: string;
          tokenAddress?: string;
          fiatValueUsd?: string;
          costBasisUsd?: string;
          classification?: string;
          counterparty?: string;
          metadata?: JsonObject;
        }>(request);

        if (
          !body?.organizationId ||
          !body.walletId ||
          !body.txHash ||
          !body.chain ||
          !body.amountDecimal ||
          !body.direction ||
          !body.occurredAt
        ) {
          return error(
            "organizationId, walletId, txHash, chain, amountDecimal, direction, occurredAt are required"
          );
        }

        if (!(await organizationExists(db, body.organizationId))) {
          return error("organization not found", 404);
        }

        if (!(await walletExists(db, body.walletId))) {
          return error("wallet not found", 404);
        }

        let resolvedClassification = body.classification?.trim() || null;
        if (!resolvedClassification) {
          resolvedClassification = await getAutoClassification(db, body.organizationId, {
            walletId: body.walletId,
            chain: lower(body.chain),
            direction: upper(body.direction),
            tokenSymbol: upper(body.tokenSymbol),
            counterparty: lower(body.counterparty),
            fiatValueUsd: asNumber(body.fiatValueUsd)
          });
        }

        const txId = makeId("tx");
        try {
          await run(
            db,
            `INSERT INTO ledger_transactions (
              id, organization_id, wallet_id, tx_hash, chain, token_symbol, token_address,
              amount_decimal, fiat_value_usd, cost_basis_usd, direction, status,
              classification, counterparty, metadata_json, occurred_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              txId,
              body.organizationId,
              body.walletId,
              body.txHash,
              body.chain.toLowerCase(),
              body.tokenSymbol?.toUpperCase() ?? null,
              body.tokenAddress?.toLowerCase() ?? null,
              body.amountDecimal,
              body.fiatValueUsd ?? null,
              body.costBasisUsd ?? null,
              body.direction,
              body.status ?? "CONFIRMED",
              resolvedClassification,
              body.counterparty ?? null,
              safeJsonString(body.metadata ?? null),
              body.occurredAt
            ]
          );
        } catch {
          return error("transaction already exists or references are invalid", 409);
        }

        return json({ id: txId }, 201);
      }

      if (method === "POST" && pathname === "/v1/transactions/bulk") {
        const body = await readJson<{
          organizationId?: string;
          walletId?: string;
          items?: Array<{
            txHash: string;
            chain: string;
            amountDecimal: string;
            direction: "IN" | "OUT" | "INTERNAL";
            occurredAt: string;
            tokenSymbol?: string;
            tokenAddress?: string;
            fiatValueUsd?: string;
            costBasisUsd?: string;
            status?: "PENDING" | "CONFIRMED" | "FAILED";
            classification?: string;
            counterparty?: string;
            metadata?: JsonObject;
          }>;
        }>(request);

        if (!body?.organizationId || !body.walletId || !body.items?.length) {
          return error("organizationId, walletId and items are required");
        }

        if (!(await organizationExists(db, body.organizationId))) {
          return error("organization not found", 404);
        }

        if (!(await walletExists(db, body.walletId))) {
          return error("wallet not found", 404);
        }

        const inserted: string[] = [];
        const skipped: string[] = [];

        for (const item of body.items) {
          let resolvedClassification = item.classification?.trim() || null;
          if (!resolvedClassification) {
            resolvedClassification = await getAutoClassification(db, body.organizationId, {
              walletId: body.walletId,
              chain: lower(item.chain),
              direction: upper(item.direction),
              tokenSymbol: upper(item.tokenSymbol),
              counterparty: lower(item.counterparty),
              fiatValueUsd: asNumber(item.fiatValueUsd)
            });
          }

          const txId = makeId("tx");
          try {
            await run(
              db,
              `INSERT INTO ledger_transactions (
                id, organization_id, wallet_id, tx_hash, chain, token_symbol, token_address,
                amount_decimal, fiat_value_usd, cost_basis_usd, direction, status,
                classification, counterparty, metadata_json, occurred_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                txId,
                body.organizationId,
                body.walletId,
                item.txHash,
                item.chain.toLowerCase(),
                item.tokenSymbol?.toUpperCase() ?? null,
                item.tokenAddress?.toLowerCase() ?? null,
                item.amountDecimal,
                item.fiatValueUsd ?? null,
                item.costBasisUsd ?? null,
                item.direction,
                item.status ?? "CONFIRMED",
                resolvedClassification,
                item.counterparty ?? null,
                safeJsonString(item.metadata ?? null),
                item.occurredAt
              ]
            );
            inserted.push(txId);
          } catch {
            skipped.push(item.txHash);
          }
        }

        return json({ insertedCount: inserted.length, skippedCount: skipped.length, inserted, skipped }, 201);
      }

      if (method === "GET" && pathname === "/v1/transactions/export") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const format = lower(url.searchParams.get("format") || "csv");
        const rows = await all(
          db,
          `SELECT
            id, wallet_id, tx_hash, chain, token_symbol, amount_decimal, fiat_value_usd,
            cost_basis_usd, direction, status, classification, counterparty, occurred_at
          FROM ledger_transactions
          WHERE organization_id = ?
          ORDER BY occurred_at DESC
          LIMIT ?`,
          [organizationId, parseLimit(url, 500, 2000)]
        );

        if (format === "json") {
          return json({ items: rows, count: rows.length });
        }

        const columns = [
          "id",
          "wallet_id",
          "tx_hash",
          "chain",
          "token_symbol",
          "amount_decimal",
          "fiat_value_usd",
          "cost_basis_usd",
          "direction",
          "status",
          "classification",
          "counterparty",
          "occurred_at"
        ];
        return csvResponse(
          toCsv(rows, columns),
          `transactions-${organizationId}-${new Date().toISOString().slice(0, 10)}.csv`
        );
      }

      if (
        method === "GET" &&
        segments.length === 4 &&
        segments[1] === "transactions" &&
        segments[3] === "notes"
      ) {
        const transactionId = segments[2];
        const items = await all(
          db,
          `SELECT
            n.id,
            n.organization_id,
            n.transaction_id,
            n.author_member_id,
            n.note_text,
            n.mentions_json,
            n.created_at,
            tm.display_name AS author_display_name,
            tm.email AS author_email
          FROM transaction_notes n
          LEFT JOIN team_members tm ON tm.id = n.author_member_id
          WHERE n.transaction_id = ?
          ORDER BY n.created_at DESC
          LIMIT ?`,
          [transactionId, parseLimit(url, 100, 500)]
        );
        return json({ items });
      }

      if (
        method === "POST" &&
        segments.length === 4 &&
        segments[1] === "transactions" &&
        segments[3] === "notes"
      ) {
        const transactionId = segments[2];
        const body = await readJson<{
          organizationId?: string;
          authorMemberId?: string;
          noteText?: string;
          mentions?: string[];
        }>(request);
        if (!body?.organizationId || !body.noteText?.trim()) {
          return error("organizationId and noteText are required");
        }

        const tx = await first(
          db,
          "SELECT id FROM ledger_transactions WHERE id = ? AND organization_id = ?",
          [transactionId, body.organizationId]
        );
        if (!tx) {
          return error("transaction not found", 404);
        }

        const noteId = makeId("nte");
        await run(
          db,
          `INSERT INTO transaction_notes (
            id, organization_id, transaction_id, author_member_id, note_text, mentions_json
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            noteId,
            body.organizationId,
            transactionId,
            body.authorMemberId ?? null,
            body.noteText.trim(),
            safeJsonString(body.mentions ?? [])
          ]
        );
        return json({ id: noteId }, 201);
      }

      if (
        method === "GET" &&
        segments.length === 4 &&
        segments[1] === "transactions" &&
        segments[3] === "splits"
      ) {
        const transactionId = segments[2];
        const items = await all(
          db,
          `SELECT
            id, organization_id, transaction_id, split_ref, amount_decimal, cost_basis_usd,
            department, obligation_ref, created_by_member_id, created_at, updated_at
          FROM transaction_splits
          WHERE transaction_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
          [transactionId, parseLimit(url, 100, 500)]
        );
        return json({ items });
      }

      if (
        method === "POST" &&
        segments.length === 4 &&
        segments[1] === "transactions" &&
        segments[3] === "splits"
      ) {
        const transactionId = segments[2];
        const body = await readJson<{
          organizationId?: string;
          splitRef?: string;
          amountDecimal?: string;
          costBasisUsd?: string;
          department?: string;
          obligationRef?: string;
          createdByMemberId?: string;
        }>(request);
        if (!body?.organizationId || !body.amountDecimal) {
          return error("organizationId and amountDecimal are required");
        }

        const tx = await first(
          db,
          "SELECT id FROM ledger_transactions WHERE id = ? AND organization_id = ?",
          [transactionId, body.organizationId]
        );
        if (!tx) {
          return error("transaction not found", 404);
        }

        const splitId = makeId("spl");
        await run(
          db,
          `INSERT INTO transaction_splits (
            id, organization_id, transaction_id, split_ref, amount_decimal, cost_basis_usd,
            department, obligation_ref, created_by_member_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            splitId,
            body.organizationId,
            transactionId,
            body.splitRef?.trim() || null,
            body.amountDecimal,
            body.costBasisUsd ?? null,
            body.department?.trim() || null,
            body.obligationRef?.trim() || null,
            body.createdByMemberId ?? null
          ]
        );
        return json({ id: splitId }, 201);
      }

      if (method === "GET" && pathname === "/v1/transaction-groups") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const items = await all(
          db,
          `SELECT
            g.id,
            g.organization_id,
            g.name,
            g.purpose,
            g.created_by_member_id,
            g.created_at,
            g.updated_at,
            COUNT(m.id) AS transaction_count
          FROM transaction_groups g
          LEFT JOIN transaction_group_members m ON m.group_id = g.id
          WHERE g.organization_id = ?
          GROUP BY g.id
          ORDER BY g.created_at DESC
          LIMIT ?`,
          [organizationId, parseLimit(url, 100, 500)]
        );

        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/transaction-groups") {
        const body = await readJson<{
          organizationId?: string;
          name?: string;
          purpose?: string;
          createdByMemberId?: string;
          transactionIds?: string[];
        }>(request);
        if (!body?.organizationId || !body.name?.trim()) {
          return error("organizationId and name are required");
        }

        const groupId = makeId("grp");
        await run(
          db,
          `INSERT INTO transaction_groups (
            id, organization_id, name, purpose, created_by_member_id
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            groupId,
            body.organizationId,
            body.name.trim(),
            body.purpose?.trim() || null,
            body.createdByMemberId ?? null
          ]
        );

        const linked: string[] = [];
        for (const transactionId of body.transactionIds ?? []) {
          try {
            await run(
              db,
              "INSERT INTO transaction_group_members (id, group_id, transaction_id) VALUES (?, ?, ?)",
              [makeId("grm"), groupId, transactionId]
            );
            linked.push(transactionId);
          } catch {
            // Ignore duplicates or invalid references while keeping group creation successful.
          }
        }

        return json({ id: groupId, linkedCount: linked.length, linked }, 201);
      }

      if (method === "POST" && pathname === "/v1/cost-basis/calculate") {
        const body = await readJson<{
          organizationId?: string;
          tokenSymbol?: string;
          method?: string;
        }>(request);
        if (!body?.organizationId || !body.tokenSymbol?.trim()) {
          return error("organizationId and tokenSymbol are required");
        }

        if (!(await organizationExists(db, body.organizationId))) {
          return error("organization not found", 404);
        }

        const method = normalizeCostBasisMethod(body.method);
        const summary = await calculateCostBasis(db, body.organizationId, body.tokenSymbol, method);
        return json({ summary });
      }

      // Reconciliations
      if (method === "GET" && pathname === "/v1/reconciliations") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const items = await all(
          db,
          "SELECT * FROM reconciliation_runs WHERE organization_id = ? ORDER BY period_start DESC LIMIT ?",
          [organizationId, parseLimit(url, 100, 300)]
        );

        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/reconciliations/auto-run") {
        const body = await readJson<{
          organizationId?: string;
          periodStart?: string;
          periodEnd?: string;
        }>(request);
        if (!body?.organizationId) {
          return error("organizationId is required");
        }

        const periodStart =
          body.periodStart ??
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const periodEnd = body.periodEnd ?? nowIso();

        const agg = await first(
          db,
          `SELECT
            COUNT(*) AS total_count,
            COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) AS matched_count
          FROM ledger_transactions
          WHERE organization_id = ?
            AND occurred_at >= ?
            AND occurred_at <= ?`,
          [body.organizationId, periodStart, periodEnd]
        );

        const totalCount = asNumber(agg?.total_count);
        const matchedCount = asNumber(agg?.matched_count);
        const unmatchedCount = Math.max(0, totalCount - matchedCount);
        const discrepancyCount = unmatchedCount;

        const reconciliationId = makeId("rec");
        await run(
          db,
          `INSERT INTO reconciliation_runs (
            id, organization_id, period_start, period_end, status, discrepancy_count,
            matched_count, unmatched_count, notes
          ) VALUES (?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)`,
          [
            reconciliationId,
            body.organizationId,
            periodStart,
            periodEnd,
            discrepancyCount,
            matchedCount,
            unmatchedCount,
            "Auto-run reconciliation generated by API workflow"
          ]
        );

        return json(
          {
            id: reconciliationId,
            status: "COMPLETED",
            summary: {
              totalCount,
              matchedCount,
              unmatchedCount,
              discrepancyCount
            }
          },
          201
        );
      }

      if (method === "POST" && pathname === "/v1/reconciliations") {
        const body = await readJson<{
          organizationId?: string;
          periodStart?: string;
          periodEnd?: string;
          status?: "DRAFT" | "COMPLETED" | "FAILED";
          discrepancyCount?: number;
          matchedCount?: number;
          unmatchedCount?: number;
          notes?: string;
        }>(request);

        if (!body?.organizationId || !body.periodStart || !body.periodEnd) {
          return error("organizationId, periodStart and periodEnd are required");
        }

        const reconciliationId = makeId("rec");
        await run(
          db,
          `INSERT INTO reconciliation_runs (
            id, organization_id, period_start, period_end, status, discrepancy_count,
            matched_count, unmatched_count, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reconciliationId,
            body.organizationId,
            body.periodStart,
            body.periodEnd,
            body.status ?? "DRAFT",
            body.discrepancyCount ?? 0,
            body.matchedCount ?? 0,
            body.unmatchedCount ?? 0,
            body.notes ?? null
          ]
        );

        return json({ id: reconciliationId }, 201);
      }

      if (method === "PATCH" && segments.length === 3 && segments[1] === "reconciliations") {
        const reconciliationId = segments[2];
        const body = await readJson<{
          status?: "DRAFT" | "COMPLETED" | "FAILED";
          discrepancyCount?: number;
          matchedCount?: number;
          unmatchedCount?: number;
          notes?: string;
        }>(request);

        if (!body) {
          return error("invalid JSON body");
        }

        await run(
          db,
          `UPDATE reconciliation_runs
           SET status = COALESCE(?, status),
               discrepancy_count = COALESCE(?, discrepancy_count),
               matched_count = COALESCE(?, matched_count),
               unmatched_count = COALESCE(?, unmatched_count),
               notes = COALESCE(?, notes),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            body.status ?? null,
            body.discrepancyCount ?? null,
            body.matchedCount ?? null,
            body.unmatchedCount ?? null,
            body.notes ?? null,
            reconciliationId
          ]
        );

        return json({ updated: true, id: reconciliationId });
      }

      // Reports
      if (method === "GET" && pathname === "/v1/reports") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const items = await all(
          db,
          "SELECT id, organization_id, report_type, title, parameters_json, status, generated_at, created_at, updated_at FROM reports WHERE organization_id = ? ORDER BY created_at DESC LIMIT ?",
          [organizationId, parseLimit(url, 100, 300)]
        );

        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/reports") {
        const body = await readJson<{
          organizationId?: string;
          reportType?: string;
          title?: string;
          parameters?: JsonObject;
        }>(request);

        if (!body?.organizationId || !body.reportType || !body.title?.trim()) {
          return error("organizationId, reportType and title are required");
        }

        const reportId = makeId("rpt");
        await run(
          db,
          "INSERT INTO reports (id, organization_id, report_type, title, parameters_json, status) VALUES (?, ?, ?, ?, ?, 'DRAFT')",
          [
            reportId,
            body.organizationId,
            body.reportType.toUpperCase(),
            body.title.trim(),
            safeJsonString(body.parameters ?? {})
          ]
        );

        return json({ id: reportId }, 201);
      }

      if (method === "GET" && segments.length === 3 && segments[1] === "reports") {
        const reportId = segments[2];
        const report = await first(db, "SELECT * FROM reports WHERE id = ?", [reportId]);
        if (!report) {
          return error("report not found", 404);
        }
        return json({ report });
      }

      if (
        method === "POST" &&
        segments.length === 4 &&
        segments[1] === "reports" &&
        segments[3] === "run"
      ) {
        const reportId = segments[2];
        const report = await first(
          db,
          "SELECT id, organization_id, report_type, title, parameters_json FROM reports WHERE id = ?",
          [reportId]
        );

        if (!report) {
          return error("report not found", 404);
        }

        const organizationId = String(report.organization_id);
        const reportType = String(report.report_type || "TREASURY_SUMMARY").toUpperCase();

        let payload: JsonObject;
        if (reportType === "TRANSACTION_HISTORY") {
          const transactions = await all(
            db,
            "SELECT id, tx_hash, chain, token_symbol, amount_decimal, fiat_value_usd, direction, status, occurred_at FROM ledger_transactions WHERE organization_id = ? ORDER BY occurred_at DESC LIMIT 100",
            [organizationId]
          );
          payload = { items: transactions };
        } else if (reportType === "RECONCILIATION_SUMMARY") {
          const reconciliations = await all(
            db,
            "SELECT id, period_start, period_end, status, discrepancy_count, matched_count, unmatched_count FROM reconciliation_runs WHERE organization_id = ? ORDER BY period_start DESC LIMIT 100",
            [organizationId]
          );
          payload = { items: reconciliations };
        } else {
          const summary = await getDashboardSummary(db, organizationId, 30);
          const topAssets = await getTopAssets(db, organizationId, 10);
          payload = { summary, topAssets };
        }

        await run(
          db,
          "UPDATE reports SET status = 'COMPLETED', generated_at = ?, result_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [nowIso(), safeJsonString(payload), reportId]
        );

        return json({ id: reportId, status: "COMPLETED", payload });
      }

      // Alerts
      if (method === "GET" && pathname === "/v1/alerts") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const items = await all(
          db,
          "SELECT * FROM alerts WHERE organization_id = ? ORDER BY created_at DESC LIMIT ?",
          [organizationId, parseLimit(url, 100, 300)]
        );

        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/alerts") {
        const body = await readJson<{
          organizationId?: string;
          name?: string;
          alertType?: string;
          thresholdOperator?: string;
          thresholdValue?: number;
          channel?: string;
          severity?: string;
          isActive?: boolean;
        }>(request);

        if (!body?.organizationId || !body.name?.trim() || !body.alertType) {
          return error("organizationId, name and alertType are required");
        }

        const alertId = makeId("alt");
        const isActive = parseBool(body.isActive);

        await run(
          db,
          `INSERT INTO alerts (
            id, organization_id, name, alert_type, threshold_operator,
            threshold_value, channel, severity, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            alertId,
            body.organizationId,
            body.name.trim(),
            body.alertType.toUpperCase(),
            body.thresholdOperator?.toUpperCase() ?? null,
            body.thresholdValue ?? null,
            body.channel?.toUpperCase() || "EMAIL",
            body.severity?.toUpperCase() || "MEDIUM",
            isActive === null ? 1 : isActive ? 1 : 0
          ]
        );

        return json({ id: alertId }, 201);
      }

      if (method === "PATCH" && segments.length === 3 && segments[1] === "alerts") {
        const alertId = segments[2];
        const body = await readJson<{
          name?: string;
          thresholdOperator?: string;
          thresholdValue?: number;
          channel?: string;
          severity?: string;
          isActive?: boolean;
          lastTriggeredAt?: string;
        }>(request);

        if (!body) {
          return error("invalid JSON body");
        }

        const isActive = parseBool(body.isActive);
        await run(
          db,
          `UPDATE alerts SET
            name = COALESCE(?, name),
            threshold_operator = COALESCE(?, threshold_operator),
            threshold_value = COALESCE(?, threshold_value),
            channel = COALESCE(?, channel),
            severity = COALESCE(?, severity),
            is_active = COALESCE(?, is_active),
            last_triggered_at = COALESCE(?, last_triggered_at),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            body.name?.trim() ?? null,
            body.thresholdOperator?.toUpperCase() ?? null,
            body.thresholdValue ?? null,
            body.channel?.toUpperCase() ?? null,
            body.severity?.toUpperCase() ?? null,
            isActive === null ? null : isActive ? 1 : 0,
            body.lastTriggeredAt ?? null,
            alertId
          ]
        );

        return json({ updated: true, id: alertId });
      }

      // Automation rules
      if (method === "GET" && pathname === "/v1/rules") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const items = await all(
          db,
          "SELECT * FROM automation_rules WHERE organization_id = ? ORDER BY priority ASC, created_at DESC LIMIT ?",
          [organizationId, parseLimit(url, 100, 300)]
        );

        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/rules") {
        const body = await readJson<{
          organizationId?: string;
          name?: string;
          ruleType?: string;
          conditions?: JsonObject;
          actions?: JsonObject;
          priority?: number;
          isActive?: boolean;
        }>(request);

        if (!body?.organizationId || !body.name?.trim() || !body.ruleType) {
          return error("organizationId, name and ruleType are required");
        }

        const ruleId = makeId("rul");
        const isActive = parseBool(body.isActive);
        await run(
          db,
          `INSERT INTO automation_rules (
            id, organization_id, name, rule_type, conditions_json, actions_json, priority, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ruleId,
            body.organizationId,
            body.name.trim(),
            body.ruleType.toUpperCase(),
            safeJsonString(body.conditions ?? {}),
            safeJsonString(body.actions ?? {}),
            body.priority ?? 100,
            isActive === null ? 1 : isActive ? 1 : 0
          ]
        );

        return json({ id: ruleId }, 201);
      }

      if (method === "PATCH" && segments.length === 3 && segments[1] === "rules") {
        const ruleId = segments[2];
        const body = await readJson<{
          name?: string;
          conditions?: JsonObject;
          actions?: JsonObject;
          priority?: number;
          isActive?: boolean;
        }>(request);

        if (!body) {
          return error("invalid JSON body");
        }

        const isActive = parseBool(body.isActive);
        await run(
          db,
          `UPDATE automation_rules SET
            name = COALESCE(?, name),
            conditions_json = COALESCE(?, conditions_json),
            actions_json = COALESCE(?, actions_json),
            priority = COALESCE(?, priority),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            body.name?.trim() ?? null,
            body.conditions ? safeJsonString(body.conditions) : null,
            body.actions ? safeJsonString(body.actions) : null,
            body.priority ?? null,
            isActive === null ? null : isActive ? 1 : 0,
            ruleId
          ]
        );

        return json({ updated: true, id: ruleId });
      }

      // Webhooks
      if (method === "GET" && pathname === "/v1/webhooks") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const items = await all(
          db,
          `SELECT
            id, organization_id, name, endpoint_url, secret_hint, event_types_json,
            status, created_at, updated_at
          FROM webhook_subscriptions
          WHERE organization_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
          [organizationId, parseLimit(url, 100, 500)]
        );
        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/webhooks") {
        const body = await readJson<{
          organizationId?: string;
          name?: string;
          endpointUrl?: string;
          secretHint?: string;
          eventTypes?: string[];
          status?: string;
        }>(request);
        if (!body?.organizationId || !body.name?.trim() || !body.endpointUrl?.trim()) {
          return error("organizationId, name and endpointUrl are required");
        }

        const webhookId = makeId("whk");
        await run(
          db,
          `INSERT INTO webhook_subscriptions (
            id, organization_id, name, endpoint_url, secret_hint, event_types_json, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            webhookId,
            body.organizationId,
            body.name.trim(),
            body.endpointUrl.trim(),
            body.secretHint?.trim() || null,
            safeJsonString(body.eventTypes ?? ["transaction.created"]),
            upper(body.status || "ACTIVE")
          ]
        );

        return json({ id: webhookId }, 201);
      }

      if (method === "PATCH" && segments.length === 3 && segments[1] === "webhooks") {
        const webhookId = segments[2];
        const body = await readJson<{
          name?: string;
          endpointUrl?: string;
          secretHint?: string;
          eventTypes?: string[];
          status?: string;
        }>(request);
        if (!body) {
          return error("invalid JSON body");
        }

        await run(
          db,
          `UPDATE webhook_subscriptions SET
            name = COALESCE(?, name),
            endpoint_url = COALESCE(?, endpoint_url),
            secret_hint = COALESCE(?, secret_hint),
            event_types_json = COALESCE(?, event_types_json),
            status = COALESCE(?, status),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            body.name?.trim() ?? null,
            body.endpointUrl?.trim() ?? null,
            body.secretHint?.trim() ?? null,
            body.eventTypes ? safeJsonString(body.eventTypes) : null,
            body.status ? upper(body.status) : null,
            webhookId
          ]
        );

        return json({ updated: true, id: webhookId });
      }

      if (
        method === "GET" &&
        segments.length === 4 &&
        segments[1] === "webhooks" &&
        segments[3] === "events"
      ) {
        const webhookId = segments[2];
        const items = await all(
          db,
          `SELECT
            id, organization_id, webhook_id, event_type, payload_json,
            delivery_status, delivered_at, created_at
          FROM webhook_events
          WHERE webhook_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
          [webhookId, parseLimit(url, 100, 500)]
        );
        return json({ items });
      }

      if (
        method === "POST" &&
        segments.length === 4 &&
        segments[1] === "webhooks" &&
        segments[3] === "test"
      ) {
        const webhookId = segments[2];
        const body = await readJson<{ eventType?: string; payload?: JsonObject }>(request);

        const webhook = await first(
          db,
          "SELECT id, organization_id, status FROM webhook_subscriptions WHERE id = ?",
          [webhookId]
        );
        if (!webhook) {
          return error("webhook not found", 404);
        }

        const eventId = makeId("whe");
        await run(
          db,
          `INSERT INTO webhook_events (
            id, organization_id, webhook_id, event_type, payload_json, delivery_status, delivered_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            eventId,
            String(webhook.organization_id),
            webhookId,
            body?.eventType?.trim() || "webhook.test",
            safeJsonString(
              body?.payload ?? {
                ping: true,
                source: "tres-finos-api",
                generatedAt: nowIso()
              }
            ),
            "SIMULATED",
            nowIso()
          ]
        );

        return json({ webhookId, eventId, simulated: true }, 201);
      }

      // ERP integrations
      if (method === "GET" && pathname === "/v1/integrations/erp") {
        const organizationId = url.searchParams.get("organizationId");
        if (!organizationId) {
          return error("organizationId is required");
        }

        const items = await all(
          db,
          "SELECT * FROM erp_connections WHERE organization_id = ? ORDER BY created_at DESC LIMIT ?",
          [organizationId, parseLimit(url, 100, 300)]
        );

        return json({ items });
      }

      if (method === "POST" && pathname === "/v1/integrations/erp") {
        const body = await readJson<{
          organizationId?: string;
          systemName?: string;
          config?: JsonObject;
          status?: string;
        }>(request);

        if (!body?.organizationId || !body.systemName?.trim()) {
          return error("organizationId and systemName are required");
        }

        const connectionId = makeId("erp");
        await run(
          db,
          "INSERT INTO erp_connections (id, organization_id, system_name, status, config_json) VALUES (?, ?, ?, ?, ?)",
          [
            connectionId,
            body.organizationId,
            body.systemName.trim().toUpperCase(),
            body.status?.toUpperCase() || "CONNECTED",
            safeJsonString(body.config ?? {})
          ]
        );

        return json({ id: connectionId }, 201);
      }

      if (
        method === "POST" &&
        segments.length === 5 &&
        segments[1] === "integrations" &&
        segments[2] === "erp" &&
        segments[4] === "sync"
      ) {
        const connectionId = segments[3];
        await run(
          db,
          "UPDATE erp_connections SET last_sync_at = ?, status = 'SYNCED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [nowIso(), connectionId]
        );

        return json({ synced: true, id: connectionId, at: nowIso() });
      }

      return error("Not Found", 404);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unhandled server error";
      return json({ error: message }, 500);
    }
  }
};
