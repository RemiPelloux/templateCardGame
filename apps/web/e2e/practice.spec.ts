import { expect, test } from '@playwright/test';

test('practice against bots: the table deals and accepts a move', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Crazy Eights' })).toBeVisible();
  await page.getByRole('button', { name: 'Play vs bots' }).click();
  await expect(page).toHaveURL(/\/practice$/);
  const hand = page.getByLabel('Your hand');
  await expect(hand.getByRole('button')).toHaveCount(5);
  // Seat 0 opens: play a playable card if there is one, otherwise draw.
  const playable = hand.locator('.card--playable');
  if (await playable.count()) await playable.first().click();
  else await page.getByRole('button', { name: /Draw a card/ }).click();
  const suitPicker = page.getByRole('group', { name: 'Name a suit' });
  if (await suitPicker.isVisible())
    await suitPicker.getByRole('button', { name: /Hearts/ }).click();
  await expect(page.getByLabel('Game log').getByRole('listitem').first()).toContainText('You');
});
