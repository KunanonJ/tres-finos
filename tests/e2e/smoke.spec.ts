import { expect, test } from '@playwright/test';

const apiBase = process.env.E2E_API_URL ?? 'https://tres-finos-api.chameleon-finance.workers.dev';

test('homepage renders platform shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Web3 Finance Operations Console' })).toBeVisible();
  await expect(page.getByText('Organization Context')).toBeVisible();
});

test('api health endpoint responds ok', async ({ request }) => {
  const response = await request.get(`${apiBase}/health`);
  expect(response.ok()).toBeTruthy();

  const body = (await response.json()) as { status?: string };
  expect(body.status).toBe('ok');
});

test('api can create and list organization', async ({ request }) => {
  const name = `E2E Org ${Date.now()}`;

  const createRes = await request.post(`${apiBase}/v1/organizations`, {
    data: { name }
  });
  expect(createRes.ok()).toBeTruthy();

  const created = (await createRes.json()) as { id?: string; name?: string };
  expect(created.id).toBeTruthy();

  const listRes = await request.get(`${apiBase}/v1/organizations`);
  expect(listRes.ok()).toBeTruthy();

  const listBody = (await listRes.json()) as { items?: Array<{ id: string; name: string }> };
  const found = (listBody.items ?? []).some((item) => item.id === created.id && item.name === name);
  expect(found).toBeTruthy();
});

test('api expanded modules: wallet, transaction, dashboard, report run', async ({ request }) => {
  const organizationName = `E2E Expanded ${Date.now()}`;

  const createOrgRes = await request.post(`${apiBase}/v1/organizations`, {
    data: { name: organizationName, baseCurrency: 'USD' }
  });
  expect(createOrgRes.ok()).toBeTruthy();
  const org = (await createOrgRes.json()) as { id: string };
  expect(org.id).toBeTruthy();

  const createWalletRes = await request.post(`${apiBase}/v1/wallets`, {
    data: {
      organizationId: org.id,
      chain: 'ethereum',
      address: `0x${Date.now()}0000000000000000000000000000000000`.slice(0, 42),
      label: 'E2E Treasury',
      sourceType: 'ONCHAIN'
    }
  });
  expect(createWalletRes.ok()).toBeTruthy();
  const wallet = (await createWalletRes.json()) as { id: string };
  expect(wallet.id).toBeTruthy();

  const createTxRes = await request.post(`${apiBase}/v1/transactions`, {
    data: {
      organizationId: org.id,
      walletId: wallet.id,
      txHash: `0xe2e${Date.now()}`,
      chain: 'ethereum',
      tokenSymbol: 'USDC',
      amountDecimal: '2500.00',
      fiatValueUsd: '2500.00',
      direction: 'IN',
      status: 'CONFIRMED',
      occurredAt: new Date().toISOString(),
      classification: 'TREASURY_TRANSFER'
    }
  });
  expect(createTxRes.ok()).toBeTruthy();

  const summaryRes = await request.get(
    `${apiBase}/v1/dashboard/summary?organizationId=${org.id}&periodDays=30`
  );
  expect(summaryRes.ok()).toBeTruthy();
  const summaryBody = (await summaryRes.json()) as {
    summary?: { walletCount?: number; transactionCount?: number };
  };
  expect((summaryBody.summary?.walletCount ?? 0) >= 1).toBeTruthy();
  expect((summaryBody.summary?.transactionCount ?? 0) >= 1).toBeTruthy();

  const createReportRes = await request.post(`${apiBase}/v1/reports`, {
    data: {
      organizationId: org.id,
      reportType: 'TREASURY_SUMMARY',
      title: 'E2E Treasury Summary'
    }
  });
  expect(createReportRes.ok()).toBeTruthy();
  const report = (await createReportRes.json()) as { id: string };
  expect(report.id).toBeTruthy();

  const runReportRes = await request.post(`${apiBase}/v1/reports/${report.id}/run`, {
    data: {}
  });
  expect(runReportRes.ok()).toBeTruthy();
  const runReportBody = (await runReportRes.json()) as { status?: string };
  expect(runReportBody.status).toBe('COMPLETED');
});

test('api phase3 modules: team, notes, cost basis, webhooks, export', async ({ request }) => {
  const organizationName = `E2E Phase3 ${Date.now()}`;

  const createOrgRes = await request.post(`${apiBase}/v1/organizations`, {
    data: { name: organizationName, baseCurrency: 'USD' }
  });
  expect(createOrgRes.ok()).toBeTruthy();
  const org = (await createOrgRes.json()) as { id: string };

  const createWalletRes = await request.post(`${apiBase}/v1/wallets`, {
    data: {
      organizationId: org.id,
      chain: 'ethereum',
      address: `0x${Date.now()}1111111111111111111111111111111111`.slice(0, 42),
      label: 'Phase3 Wallet',
      sourceType: 'ONCHAIN'
    }
  });
  expect(createWalletRes.ok()).toBeTruthy();
  const wallet = (await createWalletRes.json()) as { id: string };

  const createTxRes = await request.post(`${apiBase}/v1/transactions`, {
    data: {
      organizationId: org.id,
      walletId: wallet.id,
      txHash: `0xe2ephase3${Date.now()}`,
      chain: 'ethereum',
      tokenSymbol: 'USDC',
      amountDecimal: '1000.00',
      fiatValueUsd: '1000.00',
      direction: 'IN',
      status: 'CONFIRMED',
      occurredAt: new Date().toISOString()
    }
  });
  expect(createTxRes.ok()).toBeTruthy();
  const tx = (await createTxRes.json()) as { id: string };

  const createMemberRes = await request.post(`${apiBase}/v1/team-members`, {
    data: {
      organizationId: org.id,
      email: `tester+${Date.now()}@example.com`,
      displayName: 'E2E Tester',
      role: 'ACCOUNTANT'
    }
  });
  expect(createMemberRes.ok()).toBeTruthy();
  const member = (await createMemberRes.json()) as { id: string };

  const createNoteRes = await request.post(`${apiBase}/v1/transactions/${tx.id}/notes`, {
    data: {
      organizationId: org.id,
      authorMemberId: member.id,
      noteText: 'E2E collaboration note'
    }
  });
  expect(createNoteRes.ok()).toBeTruthy();

  const listNoteRes = await request.get(`${apiBase}/v1/transactions/${tx.id}/notes?organizationId=${org.id}`);
  expect(listNoteRes.ok()).toBeTruthy();
  const noteBody = (await listNoteRes.json()) as { items?: Array<{ note_text: string }> };
  expect((noteBody.items ?? []).some((item) => item.note_text === 'E2E collaboration note')).toBeTruthy();

  const costBasisRes = await request.post(`${apiBase}/v1/cost-basis/calculate`, {
    data: {
      organizationId: org.id,
      tokenSymbol: 'USDC',
      method: 'FIFO'
    }
  });
  expect(costBasisRes.ok()).toBeTruthy();
  const costBasisBody = (await costBasisRes.json()) as {
    summary?: { method?: string; tokenSymbol?: string; sampleSize?: number };
  };
  expect(costBasisBody.summary?.method).toBe('FIFO');
  expect(costBasisBody.summary?.tokenSymbol).toBe('USDC');
  expect((costBasisBody.summary?.sampleSize ?? 0) >= 1).toBeTruthy();

  const createWebhookRes = await request.post(`${apiBase}/v1/webhooks`, {
    data: {
      organizationId: org.id,
      name: 'E2E Webhook',
      endpointUrl: 'https://example.com/e2e-webhook',
      eventTypes: ['transaction.created']
    }
  });
  expect(createWebhookRes.ok()).toBeTruthy();
  const webhook = (await createWebhookRes.json()) as { id: string };

  const testWebhookRes = await request.post(`${apiBase}/v1/webhooks/${webhook.id}/test`, {
    data: { eventType: 'transaction.created', payload: { source: 'e2e' } }
  });
  expect(testWebhookRes.ok()).toBeTruthy();

  const exportRes = await request.get(
    `${apiBase}/v1/transactions/export?organizationId=${org.id}&format=csv&limit=100`
  );
  expect(exportRes.ok()).toBeTruthy();
  expect(exportRes.headers()['content-type']).toContain('text/csv');
  const csvText = await exportRes.text();
  expect(csvText).toContain('tx_hash');
});

test('api phase4 modules: accounts, assets, positions, payments, reports publish, integrations, frameworks', async ({
  request
}) => {
  const organizationName = `E2E Phase4 ${Date.now()}`;

  const createOrgRes = await request.post(`${apiBase}/v1/organizations`, {
    data: { name: organizationName, baseCurrency: 'USD' }
  });
  expect(createOrgRes.ok()).toBeTruthy();
  const org = (await createOrgRes.json()) as { id: string };

  const createWalletRes = await request.post(`${apiBase}/v1/wallets`, {
    data: {
      organizationId: org.id,
      chain: 'ethereum',
      address: `0x${Date.now()}2222222222222222222222222222222222`.slice(0, 42),
      label: 'Phase4 Wallet',
      sourceType: 'ONCHAIN'
    }
  });
  expect(createWalletRes.ok()).toBeTruthy();
  const wallet = (await createWalletRes.json()) as { id: string };

  const createTxRes = await request.post(`${apiBase}/v1/transactions`, {
    data: {
      organizationId: org.id,
      walletId: wallet.id,
      txHash: `0xe2ephase4${Date.now()}`,
      chain: 'ethereum',
      tokenSymbol: 'ETH',
      amountDecimal: '1.75',
      fiatValueUsd: '5000.00',
      direction: 'IN',
      status: 'CONFIRMED',
      occurredAt: new Date().toISOString()
    }
  });
  expect(createTxRes.ok()).toBeTruthy();

  const createContactRes = await request.post(`${apiBase}/v1/accounts/contacts`, {
    data: {
      organizationId: org.id,
      name: 'Counterparty Alpha',
      email: `counterparty+${Date.now()}@example.com`,
      walletAddress: wallet.id
    }
  });
  expect(createContactRes.ok()).toBeTruthy();

  const contactsRes = await request.get(`${apiBase}/v1/accounts/contacts?organizationId=${org.id}`);
  expect(contactsRes.ok()).toBeTruthy();
  const contactsBody = (await contactsRes.json()) as { items?: Array<{ name: string }> };
  expect((contactsBody.items ?? []).some((item) => item.name === 'Counterparty Alpha')).toBeTruthy();

  const createCustodianRes = await request.post(`${apiBase}/v1/accounts/custodians`, {
    data: {
      organizationId: org.id,
      name: 'Custody Partner',
      providerType: 'CUSTODY',
      accountReference: `ACC-${Date.now()}`
    }
  });
  expect(createCustodianRes.ok()).toBeTruthy();

  const createUnknownRes = await request.post(`${apiBase}/v1/accounts/unidentified-addresses`, {
    data: {
      organizationId: org.id,
      chain: 'ethereum',
      address: `0x${Date.now()}3333333333333333333333333333333333`.slice(0, 42),
      label: 'Unknown Queue Item'
    }
  });
  expect(createUnknownRes.ok()).toBeTruthy();
  const unknown = (await createUnknownRes.json()) as { id: string };

  const resolveUnknownRes = await request.patch(
    `${apiBase}/v1/accounts/unidentified-addresses/${unknown.id}`,
    {
      data: { status: 'RESOLVED', label: 'Resolved Counterparty' }
    }
  );
  expect(resolveUnknownRes.ok()).toBeTruthy();

  const assetsRes = await request.get(`${apiBase}/v1/assets?organizationId=${org.id}`);
  expect(assetsRes.ok()).toBeTruthy();
  const assetsBody = (await assetsRes.json()) as { items?: Array<{ token_symbol: string }> };
  expect((assetsBody.items ?? []).some((item) => item.token_symbol === 'ETH')).toBeTruthy();

  const createPositionRes = await request.post(`${apiBase}/v1/positions`, {
    data: {
      organizationId: org.id,
      walletId: wallet.id,
      tokenSymbol: 'ETH',
      assetClass: 'TOKEN',
      quantityDecimal: '1.75',
      reconciliationStatus: 'PENDING',
      marketValueUsd: '5000'
    }
  });
  expect(createPositionRes.ok()).toBeTruthy();

  const positionsRes = await request.get(`${apiBase}/v1/positions?organizationId=${org.id}&showZero=true`);
  expect(positionsRes.ok()).toBeTruthy();
  const positionsBody = (await positionsRes.json()) as { items?: Array<{ token_symbol: string }> };
  expect((positionsBody.items ?? []).some((item) => item.token_symbol === 'ETH')).toBeTruthy();

  const createInvoiceRes = await request.post(`${apiBase}/v1/payments/invoices`, {
    data: {
      organizationId: org.id,
      customerName: 'Customer A',
      amountUsd: '1500.00',
      status: 'SENT'
    }
  });
  expect(createInvoiceRes.ok()).toBeTruthy();
  const invoice = (await createInvoiceRes.json()) as { id: string };

  const markInvoicePaidRes = await request.patch(`${apiBase}/v1/payments/invoices/${invoice.id}`, {
    data: { status: 'PAID' }
  });
  expect(markInvoicePaidRes.ok()).toBeTruthy();

  const createBillRes = await request.post(`${apiBase}/v1/payments/bills`, {
    data: {
      organizationId: org.id,
      vendorName: 'Vendor B',
      amountUsd: '700.00',
      status: 'OPEN'
    }
  });
  expect(createBillRes.ok()).toBeTruthy();
  const bill = (await createBillRes.json()) as { id: string };

  const markBillPaidRes = await request.patch(`${apiBase}/v1/payments/bills/${bill.id}`, {
    data: { status: 'PAID' }
  });
  expect(markBillPaidRes.ok()).toBeTruthy();

  const createReportRes = await request.post(`${apiBase}/v1/reports`, {
    data: {
      organizationId: org.id,
      reportType: 'TRANSACTION_HISTORY',
      title: 'Phase4 Publish Report'
    }
  });
  expect(createReportRes.ok()).toBeTruthy();
  const report = (await createReportRes.json()) as { id: string };

  const publishReportRes = await request.post(`${apiBase}/v1/reports/${report.id}/publish`, {
    data: { visibility: 'INTERNAL', publishedBy: 'e2e' }
  });
  expect(publishReportRes.ok()).toBeTruthy();

  const publishedRes = await request.get(`${apiBase}/v1/reports/published?organizationId=${org.id}`);
  expect(publishedRes.ok()).toBeTruthy();
  const publishedBody = (await publishedRes.json()) as { items?: Array<{ report_id: string }> };
  expect((publishedBody.items ?? []).some((item) => item.report_id === report.id)).toBeTruthy();

  const createXeroRes = await request.post(`${apiBase}/v1/integrations/xero`, {
    data: { organizationId: org.id, config: { mode: 'balances_only' }, status: 'CONNECTED' }
  });
  expect(createXeroRes.ok()).toBeTruthy();
  const xero = (await createXeroRes.json()) as { id: string };

  const patchXeroRes = await request.patch(`${apiBase}/v1/integrations/xero/${xero.id}`, {
    data: { status: 'SYNCED' }
  });
  expect(patchXeroRes.ok()).toBeTruthy();

  const createQuickbooksRes = await request.post(`${apiBase}/v1/integrations/quickbooks`, {
    data: { organizationId: org.id, config: { mode: 'full_transactions' }, status: 'CONNECTED' }
  });
  expect(createQuickbooksRes.ok()).toBeTruthy();
  const quickbooks = (await createQuickbooksRes.json()) as { id: string };

  const patchQuickbooksRes = await request.patch(
    `${apiBase}/v1/integrations/quickbooks/${quickbooks.id}`,
    {
      data: { status: 'SYNCED' }
    }
  );
  expect(patchQuickbooksRes.ok()).toBeTruthy();

  const createFrameworkCaseRes = await request.post(`${apiBase}/v1/frameworks/1099`, {
    data: {
      organizationId: org.id,
      title: 'Prepare 1099 statement',
      status: 'OPEN',
      owner: 'Compliance Team'
    }
  });
  expect(createFrameworkCaseRes.ok()).toBeTruthy();

  const frameworkCasesRes = await request.get(`${apiBase}/v1/frameworks/1099?organizationId=${org.id}`);
  expect(frameworkCasesRes.ok()).toBeTruthy();
  const frameworkCasesBody = (await frameworkCasesRes.json()) as { items?: Array<{ title: string }> };
  expect(
    (frameworkCasesBody.items ?? []).some((item) => item.title === 'Prepare 1099 statement')
  ).toBeTruthy();

  const frameworkCatalogRes = await request.get(`${apiBase}/v1/frameworks/catalog`);
  expect(frameworkCatalogRes.ok()).toBeTruthy();
  const frameworkCatalogBody = (await frameworkCatalogRes.json()) as {
    items?: Array<{ code: string }>;
  };
  expect((frameworkCatalogBody.items ?? []).some((item) => item.code === '1099')).toBeTruthy();
});
