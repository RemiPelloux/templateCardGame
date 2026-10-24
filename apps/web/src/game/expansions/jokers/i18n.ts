import { defineBundle } from '@cardgame/i18n';

/** Everything Jokers & Tricks says: its name, its cards, its log sentences and its rules. */
export const jokers = defineBundle({
  en: {
    name: 'Jokers & Tricks',
    tagline: 'Two jokers, jacks that skip and queens that turn the table around.',
    cards: { joker: 'Joker' },
    direction: {
      clockwise: 'Play goes clockwise',
      counterClockwise: 'Play goes counter-clockwise',
    },
    log: {
      reverse: '{name} reverses the direction of play.',
    },
    rules: {
      cards: {
        title: 'Two jokers',
        body: 'Two jokers join the deck. A joker is wild like an eight: it goes on anything and names the next suit. The next player draws two cards and misses their turn.',
      },
      jacks: { title: 'Jacks', body: 'A jack makes the next player miss their turn.' },
      queens: {
        title: 'Queens',
        body: 'A queen reverses the direction of play. With two players it works like a jack: you play again.',
      },
      scoring: {
        title: 'Scoring',
        body: 'A joker left in hand is worth 50 points, like an eight. A trick played as your last card wins at once.',
      },
    },
  },
  fr: {
    name: 'Jokers et Coups bas',
    tagline: 'Deux jokers, des valets qui sautent et des dames qui inversent le sens du jeu.',
    cards: { joker: 'Joker' },
    direction: {
      clockwise: 'Le jeu tourne dans le sens horaire',
      counterClockwise: 'Le jeu tourne dans le sens antihoraire',
    },
    log: {
      reverse: '{name} inverse le sens du jeu.',
    },
    rules: {
      cards: {
        title: 'Deux jokers',
        body: 'Deux jokers rejoignent la pioche. Un joker est libre comme un huit : il se pose sur n’importe quelle carte et annonce la couleur suivante. Le joueur suivant pioche deux cartes et passe son tour.',
      },
      jacks: { title: 'Les valets', body: 'Un valet fait passer son tour au joueur suivant.' },
      queens: {
        title: 'Les dames',
        body: 'Une dame inverse le sens du jeu. À deux joueurs, elle agit comme un valet : vous rejouez.',
      },
      scoring: {
        title: 'Décompte',
        body: 'Un joker resté en main vaut 50 points, comme un huit. Un coup bas posé en dernière carte gagne aussitôt.',
      },
    },
  },
});
