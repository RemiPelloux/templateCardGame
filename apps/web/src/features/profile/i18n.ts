import { defineBundle } from '@cardgame/i18n';

/** Text of the profile feature, in every language. */
export const profile = defineBundle({
  en: {
    title: 'Profile',
    avatar: 'Avatar of {name}',
    stats: {
      title: 'Statistics',
      matches: 'Matches',
      wins: 'Wins',
      rate: 'Win rate',
      kind: 'Table',
      total: 'All tables',
      empty: 'No match finished yet.',
    },
    kinds: { casual: 'Casual', daily: 'Daily challenge', ranked: 'Ranked' },
    recent: {
      title: 'Recent matches',
      won: 'Won',
      lost: 'Lost',
      line: '{kind} · {players} players · {date}',
      score: '{score} pts',
    },
    errors: { PROFILE_NOT_FOUND: 'No player has this name.' },
  },
  fr: {
    title: 'Profil',
    avatar: 'Avatar de {name}',
    stats: {
      title: 'Statistiques',
      matches: 'Parties',
      wins: 'Victoires',
      rate: 'Taux de victoire',
      kind: 'Table',
      total: 'Toutes les tables',
      empty: 'Aucune partie terminée pour l’instant.',
    },
    kinds: { casual: 'Amicale', daily: 'Défi du jour', ranked: 'Classée' },
    recent: {
      title: 'Parties récentes',
      won: 'Gagnée',
      lost: 'Perdue',
      line: '{kind} · {players} joueurs · {date}',
      score: '{score} pts',
    },
    errors: { PROFILE_NOT_FOUND: 'Aucun joueur ne porte ce nom.' },
  },
});
