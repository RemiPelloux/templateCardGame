import { defineBundle } from '@cardgame/i18n';

/** The generic table: seats, log, outcome. */
export const table = defineBundle({
  en: {
    players: 'Players',
    you: 'You',
    youSuffix: '{name} (you)',
    bot: 'Bot {n}',
    log: 'Log',
    outcome: {
      youWin: 'You win!',
      wins: '{names} wins',
      nobody: 'Nobody wins',
      and: ' and ',
      again: 'Play again',
    },
  },
  fr: {
    players: 'Joueurs',
    you: 'Vous',
    youSuffix: '{name} (vous)',
    bot: 'IA {n}',
    log: 'Journal',
    outcome: {
      youWin: 'Vous gagnez !',
      wins: '{names} gagne',
      nobody: 'Personne ne gagne',
      and: ' et ',
      again: 'Rejouer',
    },
  },
});
