import { expect, test } from '@playwright/test';

test('online table: name, create, add a bot, deal', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your name at the table').fill('Ada');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Create a table' }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{5}$/);
  await page.getByRole('button', { name: 'Add a bot' }).click();
  await expect(page.getByText('Bot 1')).toBeVisible();
  await page.getByRole('button', { name: 'Deal' }).click();
  await expect(page.getByLabel('Your hand').getByRole('button')).toHaveCount(7);
  await expect(page.getByRole('list', { name: 'Players' })).toContainText('Ada');
});

test('a second player joins by link and sees the host', async ({ browser }) => {
  const host = await browser.newPage();
  await host.goto('/');
  await host.getByLabel('Your name at the table').fill('Host');
  await host.getByRole('button', { name: 'Continue' }).click();
  await host.getByRole('button', { name: 'Create a table' }).click();
  await expect(host).toHaveURL(/\/room\//);

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(host.url());
  await guest.getByLabel('Your name at the table').fill('Guest');
  await guest.getByRole('button', { name: 'Continue' }).click();
  await guest.getByRole('button', { name: 'Take a seat' }).click();
  await expect(host.getByText('Guest')).toBeVisible();
  await expect(guest.getByText('Waiting for the host to deal…')).toBeVisible();
  await guestContext.close();
});
