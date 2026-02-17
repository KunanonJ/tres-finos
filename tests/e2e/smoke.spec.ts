import { expect, test } from '@playwright/test';

const apiBase = process.env.E2E_API_URL ?? 'https://tres-finos-api.chameleon-finance.workers.dev';

test('homepage renders platform shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Web3 Finance Operations Platform' })).toBeVisible();
  await expect(page.getByText('Primary Modules')).toBeVisible();
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
