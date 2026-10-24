import { useState } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';

type Props = { label: string; price: number; coins: number; busy: boolean; onPay(): void };

/** Two steps, so a stray tap never spends coins: the action, then "Pay N coins" or Cancel. */
export function PayButton({ label, price, coins, busy, onPay }: Props) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const priceText = t('shop.price', { count: price });
  if (!confirming)
    return (
      <Button
        variant="secondary"
        disabled={busy || coins < price}
        onClick={() => setConfirming(true)}
      >
        {label} · {priceText}
      </Button>
    );
  return (
    <div className="row">
      <Button
        disabled={busy}
        onClick={() => {
          setConfirming(false);
          onPay();
        }}
      >
        {t('shop.confirm', { price: priceText })}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        {t('common.actions.cancel')}
      </Button>
    </div>
  );
}
