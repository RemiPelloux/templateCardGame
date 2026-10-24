import { defineBundle } from '@cardgame/i18n';

/** Text of the dlc feature, in every language. Each expansion's own text is in its bundle. */
export const dlc = defineBundle({
  en: {
    title: 'Expansions',
    classic: 'Classic',
    choose: 'Expansion',
    playing: 'This table plays {name}.',
    playingClassic: 'This table plays the classic game.',
    shopHint: 'More expansions are in the shop.',
    rulesTitle: 'Expansion: {name}',
    errors: {
      EXPANSION_NOT_OWNED: 'The host must own this expansion to deal with it.',
      UNKNOWN_EXPANSION: 'This expansion does not exist.',
      EXPANSION_VERSION: 'These expansion rules are no longer played.',
    },
  },
  fr: {
    title: 'Extensions',
    classic: 'Classique',
    choose: 'Extension',
    playing: 'Cette table joue avec {name}.',
    playingClassic: 'Cette table joue le jeu classique.',
    shopHint: 'D’autres extensions vous attendent à la boutique.',
    rulesTitle: 'Extension : {name}',
    errors: {
      EXPANSION_NOT_OWNED: 'L’hôte doit posséder cette extension pour la distribuer.',
      UNKNOWN_EXPANSION: 'Cette extension n’existe pas.',
      EXPANSION_VERSION: 'Ces règles d’extension ne sont plus jouées.',
    },
  },
});
