import { expect, test } from '@playwright/test';

test('simulate decodes the captured ScVal in the browser', async ({ page }) => {
  await page.goto('/simulate');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Decode an ScVal');

  await page.getByRole('button', { name: 'Use captured example' }).click();
  await page.getByRole('button', { name: 'Decode', exact: true }).click();

  const decoded = page.getByLabel('Decoded JSON');
  await expect(decoded).toBeVisible();
  await expect(decoded).toContainText('proposal_created');
});

test('simulate rejects bad input with a visible, specific error', async ({ page }) => {
  await page.goto('/simulate');
  await page.getByLabel('Base64 XDR ScVal').fill('nope!');
  await page.getByRole('button', { name: 'Decode', exact: true }).click();

  await expect(page.getByRole('main').getByRole('alert')).toContainText('not base64');
});

test('status shows pins and an explicit indexer-unavailable reason', async ({ page }) => {
  await page.goto('/status');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Status');
  await expect(page.getByRole('heading', { name: /indexer data unavailable/i })).toBeVisible();
  await expect(page.getByText(/INDEXER_URL is not set/)).toBeVisible();
  await expect(page.getByText('0.1.0-alpha.2')).toBeVisible();
  await expect(page.getByText('65193e43642f55abd083e2283aa5ed3caee5839c40a74c7b3f30398ea3ec0629')).toBeVisible();
});

test('the skip link targets the main landmark', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(page.locator('main#main')).toHaveCount(1);
});
