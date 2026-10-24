import { defineBundle } from '@cardgame/i18n';

export const rooms = defineBundle({
  en: {
    title: 'Table {code}',
    opening: 'Opening table {code}…',
    closed: 'This table is closed or does not exist.',
    home: 'Back home',
    share: { label: 'Table code', copy: 'Copy link', copied: 'Link copied' },
    seat: {
      you: ' (you)',
      host: 'host',
      bot: 'bot · {bot}',
      connected: 'Connected',
      away: 'Away',
      remove: 'Remove {name}',
    },
    takeSeat: 'Take a seat',
    addBot: 'Add a bot',
    deal: 'Deal',
    waitingHost: 'Waiting for the host to deal…',
    needPlayers: {
      one: 'At least {count} player is needed.',
      other: 'At least {count} players are needed.',
    },
  },
  fr: {
    title: 'Table {code}',
    opening: 'Ouverture de la table {code}…',
    closed: 'Cette table est fermée ou n’existe pas.',
    home: 'Retour à l’accueil',
    share: { label: 'Code de table', copy: 'Copier le lien', copied: 'Lien copié' },
    seat: {
      you: ' (vous)',
      host: 'hôte',
      bot: 'IA · {bot}',
      connected: 'Connecté',
      away: 'Absent',
      remove: 'Retirer {name}',
    },
    takeSeat: 'Prendre place',
    addBot: 'Ajouter une IA',
    deal: 'Distribuer',
    waitingHost: 'En attente de la donne de l’hôte…',
    needPlayers: {
      one: 'Il faut au moins {count} joueur.',
      other: 'Il faut au moins {count} joueurs.',
    },
  },
});
