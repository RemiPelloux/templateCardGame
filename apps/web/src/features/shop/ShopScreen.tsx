import { useState } from 'react';
import type { OpeningResponse, ShopView } from '@cardgame/protocol';
import { useI18n } from '../../i18n/I18nProvider';
import { Notice } from '../../ui/Notice';
import { Page } from '../../ui/Page';
import { useAction } from '../../ui/useAction';
import { BoosterReveal } from './BoosterReveal';
import { ItemCard } from './ItemCard';
import { PayButton } from './PayButton';
import { useItemText } from './useItemText';
import { usePurchase, useShopView } from './useShop';

type Offers = { view: ShopView; busy: boolean };

function Boosters({ view, busy, onOpen }: Offers & { onOpen(booster: string): void }) {
  const { t } = useI18n();
  const text = useItemText();
  return (
    <section className="shop__section" aria-labelledby="shop-boosters">
      <h2 id="shop-boosters">{t('shop.sections.boosters')}</h2>
      <ul className="offers">
        {view.boosters.map((offer) => (
          <li key={offer.booster} className="item-card item-card--booster">
            <span className="swatch swatch--booster" aria-hidden />
            <h3 className="item-card__name">{text.boosterName(offer.booster)}</h3>
            <p className="item-card__meta">{t('shop.reveals', { count: offer.reveals })}</p>
            <p className="item-card__description">{text.boosterDescription(offer.booster)}</p>
            <div className="item-card__actions">
              <PayButton
                label={t('shop.open')}
                price={offer.price}
                coins={view.coins}
                busy={busy}
                onPay={() => onOpen(offer.booster)}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Items({ view, busy, onBuy }: Offers & { onBuy(item: string): void }) {
  const { t } = useI18n();
  return (
    <section className="shop__section" aria-labelledby="shop-items">
      <h2 id="shop-items">{t('shop.sections.items')}</h2>
      {view.items.length ? (
        <ul className="offers">
          {view.items.map((offer) => (
            <ItemCard key={offer.item} id={offer.item}>
              <PayButton
                label={t('shop.buy')}
                price={offer.price}
                coins={view.coins}
                busy={busy}
                onPay={() => onBuy(offer.item)}
              />
            </ItemCard>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('shop.soldOut')}</p>
      )}
    </section>
  );
}

/** The shop: boosters and priced items, paid in coins, with the opening shown card by card. */
export function ShopScreen() {
  const { t, errorText } = useI18n();
  const text = useItemText();
  const shop = useShopView();
  const purchase = usePurchase();
  const { busy, error, run, clearError } = useAction();
  const [opening, setOpening] = useState<OpeningResponse | null>(null);
  const [bought, setBought] = useState<string | null>(null);
  const buy = (item: string) =>
    void run(() => purchase.buy(item)).then((done) => done && setBought(item));
  const open = (booster: string) =>
    void run(() => purchase.openBooster(booster)).then((done) => done && setOpening(done));
  const view = shop.data;
  return (
    <Page title={t('shop.title')} lede={t('shop.lede')}>
      {view && <p className="shop__balance">{t('shop.balance', { count: view.coins })}</p>}
      <Notice message={shop.error ? errorText(shop.error) : null} />
      <Notice message={error} onDismiss={clearError} />
      <Notice tone="info" message={bought ? t('shop.bought', { name: text.name(bought) }) : null} />
      {!view && !shop.error && <p className="muted">{t('common.status.loading')}</p>}
      {view && <Boosters view={view} busy={busy} onOpen={open} />}
      {view && <Items view={view} busy={busy} onBuy={buy} />}
      {opening && <BoosterReveal opening={opening} onDone={() => setOpening(null)} />}
    </Page>
  );
}
