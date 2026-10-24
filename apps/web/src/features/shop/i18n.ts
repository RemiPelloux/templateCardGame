import { defineBundle } from '@cardgame/i18n';
import { itemText } from './item-text';

/** Text of the shop feature (and the names of items, boosters, rarities and slots). */
export const shop = defineBundle({
  en: {
    title: 'Shop',
    lede: 'Spend the coins you win at the table. No real money, ever.',
    balance: { one: 'You have {count} coin.', other: 'You have {count} coins.' },
    sections: { boosters: 'Boosters', items: 'Items' },
    soldOut: 'You own everything on sale. Open a booster for the rest.',
    price: { one: '{count} coin', other: '{count} coins' },
    buy: 'Buy',
    confirm: 'Pay {price}',
    bought: '{name} is yours. Equip it in your collection.',
    open: 'Open',
    reveals: { one: '{count} item', other: '{count} items' },
    reveal: {
      title: 'Opening {name}',
      revealAll: 'Reveal all',
      done: 'Done',
      hidden: 'Card {index}, not revealed yet',
      new: 'New',
      duplicate: 'Duplicate',
      refund: { one: '+{count} coin', other: '+{count} coins' },
      announce: '{rarity}: {name}',
      announceDuplicate: '{rarity}: {name}, duplicate, {refund} back',
      summary: {
        one: 'Duplicates gave back {count} coin.',
        other: 'Duplicates gave back {count} coins.',
      },
    },
    boosters: {
      'booster-standard': {
        name: 'Standard booster',
        description: 'Mostly common, sometimes much better.',
      },
      'booster-premium': { name: 'Premium booster', description: 'Rare or better on every card.' },
    },
    rarity: { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' },
    kinds: { cardBack: 'Card back', felt: 'Felt', frame: 'Frame', expansion: 'Expansion' },
    items: itemText.en,
    errors: {
      UNKNOWN_ITEM: 'This item does not exist.',
      NOT_FOR_SALE: 'This item is not for sale.',
      ALREADY_OWNED: 'You already own this item.',
      UNKNOWN_BOOSTER: 'This booster does not exist.',
      REQUEST_REUSED: 'This purchase was already made. Refresh the shop.',
    },
  },
  fr: {
    title: 'Boutique',
    lede: 'Dépensez les pièces gagnées à table. Jamais d’argent réel.',
    balance: { one: 'Vous avez {count} pièce.', other: 'Vous avez {count} pièces.' },
    sections: { boosters: 'Boosters', items: 'Objets' },
    soldOut: 'Vous possédez tout ce qui est en vente. Ouvrez un booster pour le reste.',
    price: { one: '{count} pièce', other: '{count} pièces' },
    buy: 'Acheter',
    confirm: 'Payer {price}',
    bought: '{name} est à vous. Équipez-le dans votre collection.',
    open: 'Ouvrir',
    reveals: { one: '{count} objet', other: '{count} objets' },
    reveal: {
      title: 'Ouverture : {name}',
      revealAll: 'Tout révéler',
      done: 'Terminer',
      hidden: 'Carte {index}, pas encore révélée',
      new: 'Nouveau',
      duplicate: 'Doublon',
      refund: { one: '+{count} pièce', other: '+{count} pièces' },
      announce: '{rarity} : {name}',
      announceDuplicate: '{rarity} : {name}, doublon, {refund} rendues',
      summary: {
        one: 'Les doublons vous ont rendu {count} pièce.',
        other: 'Les doublons vous ont rendu {count} pièces.',
      },
    },
    boosters: {
      'booster-standard': {
        name: 'Booster standard',
        description: 'Surtout du commun, parfois bien mieux.',
      },
      'booster-premium': {
        name: 'Booster premium',
        description: 'Rare ou mieux sur chaque carte.',
      },
    },
    rarity: { common: 'Commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' },
    kinds: { cardBack: 'Dos de carte', felt: 'Tapis', frame: 'Cadre', expansion: 'Extension' },
    items: itemText.fr,
    errors: {
      UNKNOWN_ITEM: 'Cet objet n’existe pas.',
      NOT_FOR_SALE: 'Cet objet n’est pas en vente.',
      ALREADY_OWNED: 'Vous possédez déjà cet objet.',
      UNKNOWN_BOOSTER: 'Ce booster n’existe pas.',
      REQUEST_REUSED: 'Cet achat a déjà été fait. Actualisez la boutique.',
    },
  },
});
