export interface Env {
  tres_finos_db: D1Database;
}

type JsonRecord = Record<string, unknown>;

function json(data: JsonRecord | JsonRecord[], status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    }
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

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        status: "ok",
        service: "tres-api-worker",
        timestamp: new Date().toISOString()
      });
    }

    if (request.method === "GET" && url.pathname === "/v1") {
      return json({
        name: "tres-finos-api",
        version: "0.2.0",
        stage: "cloudflare-worker-d1"
      });
    }

    if (request.method === "GET" && url.pathname === "/v1/organizations") {
      const data = await env.tres_finos_db
        .prepare("SELECT id, name, created_at, updated_at FROM organizations ORDER BY created_at DESC")
        .all<JsonRecord>();

      return json({ items: data.results ?? [] });
    }

    if (request.method === "POST" && url.pathname === "/v1/organizations") {
      const body = await readJson<{ name?: string }>(request);
      if (!body?.name?.trim()) {
        return error("name is required");
      }

      const organizationId = id("org");
      await env.tres_finos_db
        .prepare("INSERT INTO organizations (id, name) VALUES (?, ?)")
        .bind(organizationId, body.name.trim())
        .run();

      return json({ id: organizationId, name: body.name.trim() }, 201);
    }

    if (request.method === "GET" && url.pathname === "/v1/wallets") {
      const organizationId = url.searchParams.get("organizationId");

      if (!organizationId) {
        return error("organizationId is required");
      }

      const data = await env.tres_finos_db
        .prepare(
          "SELECT id, organization_id, chain, address, label, created_at, updated_at FROM wallets WHERE organization_id = ? ORDER BY created_at DESC"
        )
        .bind(organizationId)
        .all<JsonRecord>();

      return json({ items: data.results ?? [] });
    }

    if (request.method === "POST" && url.pathname === "/v1/wallets") {
      const body = await readJson<{
        organizationId?: string;
        chain?: string;
        address?: string;
        label?: string;
      }>(request);

      if (!body?.organizationId || !body?.chain || !body?.address) {
        return error("organizationId, chain and address are required");
      }

      const walletId = id("wal");
      try {
        await env.tres_finos_db
          .prepare(
            "INSERT INTO wallets (id, organization_id, chain, address, label) VALUES (?, ?, ?, ?, ?)"
          )
          .bind(
            walletId,
            body.organizationId,
            body.chain.toLowerCase(),
            body.address.toLowerCase(),
            body.label?.trim() || null
          )
          .run();
      } catch {
        return error("wallet already exists or organization is invalid", 409);
      }

      return json({ id: walletId }, 201);
    }

    if (request.method === "GET" && url.pathname === "/v1/transactions") {
      const organizationId = url.searchParams.get("organizationId");
      const walletId = url.searchParams.get("walletId");

      if (!organizationId && !walletId) {
        return error("organizationId or walletId is required");
      }

      if (walletId) {
        const data = await env.tres_finos_db
          .prepare(
            "SELECT * FROM ledger_transactions WHERE wallet_id = ? ORDER BY occurred_at DESC LIMIT 200"
          )
          .bind(walletId)
          .all<JsonRecord>();
        return json({ items: data.results ?? [] });
      }

      const data = await env.tres_finos_db
        .prepare(
          "SELECT * FROM ledger_transactions WHERE organization_id = ? ORDER BY occurred_at DESC LIMIT 200"
        )
        .bind(organizationId)
        .all<JsonRecord>();

      return json({ items: data.results ?? [] });
    }

    if (request.method === "POST" && url.pathname === "/v1/transactions") {
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

      const txId = id("tx");
      try {
        await env.tres_finos_db
          .prepare(
            `INSERT INTO ledger_transactions (
              id, organization_id, wallet_id, tx_hash, chain, token_symbol, token_address,
              amount_decimal, fiat_value_usd, cost_basis_usd, direction, status, occurred_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            txId,
            body.organizationId,
            body.walletId,
            body.txHash,
            body.chain.toLowerCase(),
            body.tokenSymbol ?? null,
            body.tokenAddress?.toLowerCase() ?? null,
            body.amountDecimal,
            body.fiatValueUsd ?? null,
            body.costBasisUsd ?? null,
            body.direction,
            body.status ?? "CONFIRMED",
            body.occurredAt
          )
          .run();
      } catch {
        return error("transaction already exists or references are invalid", 409);
      }

      return json({ id: txId }, 201);
    }

    if (request.method === "GET" && url.pathname === "/v1/reconciliations") {
      const organizationId = url.searchParams.get("organizationId");
      if (!organizationId) {
        return error("organizationId is required");
      }

      const data = await env.tres_finos_db
        .prepare(
          "SELECT * FROM reconciliation_runs WHERE organization_id = ? ORDER BY period_start DESC LIMIT 100"
        )
        .bind(organizationId)
        .all<JsonRecord>();

      return json({ items: data.results ?? [] });
    }

    if (request.method === "POST" && url.pathname === "/v1/reconciliations") {
      const body = await readJson<{
        organizationId?: string;
        periodStart?: string;
        periodEnd?: string;
        status?: "DRAFT" | "COMPLETED" | "FAILED";
        discrepancyCount?: number;
        notes?: string;
      }>(request);

      if (!body?.organizationId || !body.periodStart || !body.periodEnd) {
        return error("organizationId, periodStart and periodEnd are required");
      }

      const reconciliationId = id("rec");
      await env.tres_finos_db
        .prepare(
          `INSERT INTO reconciliation_runs (
            id, organization_id, period_start, period_end, status, discrepancy_count, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          reconciliationId,
          body.organizationId,
          body.periodStart,
          body.periodEnd,
          body.status ?? "DRAFT",
          body.discrepancyCount ?? 0,
          body.notes ?? null
        )
        .run();

      return json({ id: reconciliationId }, 201);
    }

    return error("Not Found", 404);
  }
};
