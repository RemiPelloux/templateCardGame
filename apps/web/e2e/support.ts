import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct horse battery';

/** Signs up a fresh account, saves its recovery codes, and returns its handle (`name#1234`). */
export async function signUp(page: Page, prefix: string): Promise<string> {
  const username = `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  await page.goto('/register');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your recovery codes' })).toBeVisible();
  await page.getByRole('button', { name: 'I saved them' }).click();
  await page.goto('/account');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(new RegExp(`^${username}#\\d{4}$`));
  return (await heading.textContent())!;
}
