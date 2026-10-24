import { defineBundle } from '@cardgame/i18n';

/**
 * Everything the game says: card names, log sentences, prompts, rule errors and the rules
 * themselves. Replacing the game means rewriting this file (and the board) in every language.
 */
export const game = defineBundle({
  en: {
    name: 'Crazy Eights',
    tagline: 'Match the suit or the rank. Eights are wild. Empty your hand first.',
    suits: { clubs: 'Clubs', diamonds: 'Diamonds', hearts: 'Hearts', spades: 'Spades' },
    ranks: { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' },
    card: '{rank} of {suit}',
    hand: { label: 'Your hand' },
    deck: { draw: 'Draw a card ({count} left)', empty: 'Empty' },
    suitToFollow: 'Suit to follow: {suit}',
    prompt: {
      yourMove: 'Your move: follow {glyph} {suit} or a {rank}, or play an eight.',
      waiting: 'Waiting for {name}…',
      over: 'The match is over.',
    },
    picker: { label: 'Name a suit', title: 'Name the next suit', keep: 'Keep the eight' },
    pass: 'Pass',
    seat: { one: '{count} card', other: '{count} cards' },
    log: {
      dealer: 'The dealer',
      deal: 'Each player is dealt {handSize} cards.',
      starter: 'The starter card is the {card}.',
      play: '{name} plays the {card}.',
      playWild: '{name} plays the {card} and names {suit}.',
      draw: '{name} draws a card.',
      drew: 'You drew the {card}.',
      pass: '{name} passes.',
      reshuffle: 'The discard pile is shuffled back into the deck.',
    },
    outcome: {
      EMPTY_HAND: 'Every card played! The winner scores the points left in the other hands.',
      BLOCKED: 'Nothing left to draw and nobody could play: the lightest hand wins.',
    },
    errors: {
      CANNOT_PLAY: 'Follow the suit or the rank, or play an eight.',
      SUIT_REQUIRED: 'Name a suit for your eight.',
      ALREADY_DRAWN: 'You have already drawn this turn.',
      NOTHING_TO_DRAW: 'Nothing left to draw: pass.',
      MUST_DRAW: 'Draw a card before passing.',
    },
    rules: {
      goal: { title: 'Goal', body: 'Be the first to play every card in your hand.' },
      setup: {
        title: 'Setup',
        body: 'One 52-card deck, 2 to 6 players. Seven cards each for two players, five each with more. The top card of the deck starts the discard pile; an eight turned up is buried in the deck.',
      },
      turn: {
        title: 'Your turn',
        body: 'Play a card of the suit to follow or of the same rank as the top card. Or draw one card, then play or pass. You may draw even when you could play.',
      },
      eights: {
        title: 'Eights',
        body: 'An eight goes on anything. Whoever plays it names the suit everyone must follow next.',
      },
      deck: {
        title: 'Empty deck',
        body: 'The discard pile, all but its top card, is shuffled into a new deck. If nothing at all is left to draw, players pass; when everyone has passed in a row, the lightest hand wins.',
      },
      scoring: {
        title: 'Scoring',
        body: 'The winner scores the cards left in the other hands: eight 50, face cards 10, ace 1, other cards their value.',
      },
    },
  },
  fr: {
    name: 'Huit américain',
    tagline:
      'Suivez la couleur ou la valeur. Les huit sont des jokers. Videz votre main en premier.',
    suits: { clubs: 'Trèfle', diamonds: 'Carreau', hearts: 'Cœur', spades: 'Pique' },
    ranks: { A: 'As', J: 'Valet', Q: 'Dame', K: 'Roi' },
    card: '{rank} de {suit}',
    hand: { label: 'Votre main' },
    deck: { draw: 'Piocher une carte (reste {count})', empty: 'Vide' },
    suitToFollow: 'Couleur à suivre : {suit}',
    prompt: {
      yourMove: 'À vous : suivez {glyph} {suit} ou un {rank}, ou jouez un huit.',
      waiting: 'En attente de {name}…',
      over: 'La partie est terminée.',
    },
    picker: {
      label: 'Choisir une couleur',
      title: 'Choisissez la prochaine couleur',
      keep: 'Garder le huit',
    },
    pass: 'Passer',
    seat: { one: '{count} carte', other: '{count} cartes' },
    log: {
      dealer: 'Le donneur',
      deal: 'Chaque joueur reçoit {handSize} cartes.',
      starter: 'La carte de départ est le {card}.',
      play: '{name} joue le {card}.',
      playWild: '{name} joue le {card} et annonce {suit}.',
      draw: '{name} pioche une carte.',
      drew: 'Vous avez pioché le {card}.',
      pass: '{name} passe.',
      reshuffle: 'La défausse est remélangée dans la pioche.',
    },
    outcome: {
      EMPTY_HAND:
        'Toutes les cartes sont jouées ! Le gagnant marque les points restés dans les autres mains.',
      BLOCKED: 'Plus rien à piocher et personne ne peut jouer : la main la plus légère gagne.',
    },
    errors: {
      CANNOT_PLAY: 'Suivez la couleur ou la valeur, ou jouez un huit.',
      SUIT_REQUIRED: 'Annoncez une couleur pour votre huit.',
      ALREADY_DRAWN: 'Vous avez déjà pioché ce tour-ci.',
      NOTHING_TO_DRAW: 'Plus rien à piocher : passez.',
      MUST_DRAW: 'Piochez une carte avant de passer.',
    },
    rules: {
      goal: { title: 'But du jeu', body: 'Être le premier à poser toutes les cartes de sa main.' },
      setup: {
        title: 'Mise en place',
        body: 'Un jeu de 52 cartes, de 2 à 6 joueurs. Sept cartes chacun à deux, cinq chacun au-delà. La première carte de la pioche lance la défausse ; un huit retourné est replacé dans la pioche.',
      },
      turn: {
        title: 'Votre tour',
        body: 'Posez une carte de la couleur à suivre ou de même valeur que la carte du dessus. Ou piochez une carte, puis jouez ou passez. Vous pouvez piocher même si vous pouviez jouer.',
      },
      eights: {
        title: 'Les huit',
        body: 'Un huit se pose sur n’importe quelle carte. Son joueur annonce la couleur que tous devront suivre.',
      },
      deck: {
        title: 'Pioche vide',
        body: 'La défausse, sauf sa carte du dessus, est remélangée en une nouvelle pioche. S’il ne reste plus rien à piocher, on passe ; quand tout le monde a passé d’affilée, la main la plus légère gagne.',
      },
      scoring: {
        title: 'Décompte',
        body: 'Le gagnant marque les cartes restées dans les autres mains : huit 50, figures 10, as 1, autres cartes leur valeur.',
      },
    },
  },
});
