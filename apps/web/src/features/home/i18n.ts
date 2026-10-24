import { defineBundle } from '@cardgame/i18n';

export const home = defineBundle({
  en: {
    practice: {
      title: 'Practice',
      intro: 'Play against bots, right here. Works offline.',
      players: 'Players',
      start: 'Play vs bots',
    },
    online: {
      title: 'Play online',
      intro: 'Open a table, share its code, fill empty seats with bots.',
      create: 'Create a table',
      code: 'Table code',
      join: 'Join',
      badCode: 'That code does not look right.',
      resume: 'Back to table {code}',
    },
    guest: {
      title: 'Play online',
      intro: 'Create an account to play with friends, earn coins and climb the rankings.',
      register: 'Create an account',
      login: 'Sign in',
    },
    offline: 'The server is out of reach: practice still works.',
    signedIn: 'Playing as {name}',
  },
  fr: {
    practice: {
      title: 'Entraînement',
      intro: 'Jouez contre des IA, ici même. Fonctionne hors ligne.',
      players: 'Joueurs',
      start: 'Jouer contre des IA',
    },
    online: {
      title: 'Jouer en ligne',
      intro: 'Ouvrez une table, partagez son code, complétez avec des IA.',
      create: 'Créer une table',
      code: 'Code de table',
      join: 'Rejoindre',
      badCode: 'Ce code ne semble pas correct.',
      resume: 'Retour à la table {code}',
    },
    guest: {
      title: 'Jouer en ligne',
      intro: 'Créez un compte pour jouer entre amis, gagner des pièces et grimper au classement.',
      register: 'Créer un compte',
      login: 'Se connecter',
    },
    offline: 'Le serveur est injoignable : l’entraînement fonctionne toujours.',
    signedIn: 'Connecté en tant que {name}',
  },
});
