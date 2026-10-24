import { expect, test } from '@playwright/test';
import { signUp } from './support';

test('sign up, create a table, add a bot, deal', async ({ page }) => {
  await signUp(page, 'ada');
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{5}$/);
  await page.getByRole('button', { name: 'Add a bot' }).click();
  await expect(page.getByText('Bot 1')).toBeVisible();
  await page.getByRole('button', { name: 'Deal' }).click();
  await expect(page.getByLabel('Your hand').getByRole('button')).toHaveCount(7);
});

test('a guest following a table link signs up and comes back to the table', async ({ browser }) => {
  const host = await browser.newPage();
  await signUp(host, 'host');
  await host.goto('/');
  await host.getByRole('button', { name: 'Create a table' }).click();
  await expect(host).toHaveURL(/\/room\//);

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(host.url());
  await expect(guest).toHaveURL(/\/login\?next=/);
  await guest.getByRole('link', { name: 'Create an account' }).click();
  await signUp(guest, 'guest');
  await guest.goto(host.url());
  await guest.getByRole('button', { name: 'Take a seat' }).click();
  await expect(guest.getByText('Waiting for the host to deal…')).toBeVisible();
  await guestContext.close();
});

test('the app speaks French', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'fr-FR' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Huit américain' })).toBeVisible();
  await page.getByRole('button', { name: 'Jouer contre des IA' }).click();
  await expect(page.getByLabel('Votre main').getByRole('button')).not.toHaveCount(0);
  await context.close();
});
