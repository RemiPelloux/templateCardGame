import { expect, test } from '@playwright/test';
import { signUp } from './support';

/** Every member page, with a heading it must show. */
const PAGES = [
  ['/shop', 'Shop'],
  ['/collection', 'Collection'],
  ['/friends', 'Friends'],
  ['/daily', 'Daily challenge'],
  ['/ranked', 'Ranked'],
  ['/profile', /#\d{4}/],
  ['/rules', 'How to play'],
] as const;

test('every member page renders without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signUp(page, 'pages');
  for (const [path, heading] of PAGES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('friends: a request by handle is accepted on the other side', async ({ browser }) => {
  const [ada, bob] = await Promise.all([browser.newContext(), browser.newContext()]);
  const adaPage = await ada.newPage();
  const bobPage = await bob.newPage();
  await signUp(adaPage, 'ada');
  const bobHandle = await signUp(bobPage, 'bob');
  await adaPage.goto('/friends');
  await adaPage.getByLabel('Handle').fill(bobHandle);
  await adaPage.getByRole('button', { name: 'Send request' }).click();
  await bobPage.goto('/friends');
  await bobPage.getByRole('button', { name: 'Accept' }).click();
  await expect(bobPage.getByRole('heading', { name: '1 friend' })).toBeVisible();
  await Promise.all([ada.close(), bob.close()]);
});

test('daily challenge: today’s deal opens a server table with bots', async ({ page }) => {
  await signUp(page, 'daily');
  await page.goto('/daily');
  await page.getByRole('button', { name: 'Play today’s deal' }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{5}$/);
  await expect(page.getByLabel('Your hand').getByRole('button')).toHaveCount(5);
  await expect(page.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveCount(3);
});

test('lobby: the host picks the game, with classic by default', async ({ page }) => {
  await signUp(page, 'host');
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await expect(page.getByLabel('Expansion')).toHaveValue('');
  await expect(page.getByText('This table plays the classic game.')).toBeVisible();
  await expect(page.getByRole('main')).toHaveCount(1);
});

test('the account page is translated after switching to French', async ({ page }) => {
  await signUp(page, 'fr');
  await page.goto('/account');
  await page.getByLabel('Language').first().selectOption('fr');
  await expect(page.getByRole('heading', { name: 'Mot de passe' })).toBeVisible();
  await page.goto('/shop');
  await expect(page.getByRole('heading', { level: 1, name: 'Boutique' })).toBeVisible();
});
