import { defineBundle } from '@cardgame/i18n';

/** Text of the collection feature, in every language. */
export const collection = defineBundle({
  en: {
    title: 'Collection',
    lede: 'What you own, and what you wear at the table.',
    filters: { kind: 'Type', rarity: 'Rarity', all: 'All' },
    equip: 'Equip',
    equipped: 'Equipped',
    equippedNotice: 'You now use {name}.',
    owned: 'Owned',
    empty: 'Nothing matches these filters.',
    shopLink: 'Find more in the shop',
  },
  fr: {
    title: 'Collection',
    lede: 'Ce que vous possédez, et ce que vous portez à table.',
    filters: { kind: 'Type', rarity: 'Rareté', all: 'Tout' },
    equip: 'Équiper',
    equipped: 'Équipé',
    equippedNotice: 'Vous utilisez maintenant {name}.',
    owned: 'Possédé',
    empty: 'Rien ne correspond à ces filtres.',
    shopLink: 'Trouvez-en d’autres à la boutique',
  },
});
