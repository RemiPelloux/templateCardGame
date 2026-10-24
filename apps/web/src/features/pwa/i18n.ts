import { defineBundle } from '@cardgame/i18n';

/** Text of the installable app: updates and the offline state. */
export const pwa = defineBundle({
  en: {
    offline: 'You are offline. Practice still works; online tables return when you reconnect.',
    update: {
      available: 'A new version is available.',
      reload: 'Reload',
      later: 'Later',
    },
  },
  fr: {
    offline:
      'Vous êtes hors ligne. L’entraînement fonctionne toujours ; les tables en ligne reviendront avec la connexion.',
    update: {
      available: 'Une nouvelle version est disponible.',
      reload: 'Recharger',
      later: 'Plus tard',
    },
  },
});
