import { describe, expect, it } from 'vitest';
import { expansions } from '@cardgame/game';
import { createTranslator, type Translate } from '@cardgame/i18n';
import { describe as describeEntry } from '../src/game/describe';
import { expansionUi } from '../src/game/expansions';
import { cardLabel } from '../src/game/PlayingCard';
import { messages, type AppMessages } from '../src/i18n/messages';

const t = createTranslator('en', messages.en) as Translate<AppMessages>;
const fr = createTranslator('fr', messages.fr, messages.en) as Translate<AppMessages>;
const names = ['Ada', 'Bob', 'Cy'];

describe('expansions on the web', () => {
  it('gives every expansion of the game a name and rules in each language', () => {
    for (const id of expansions.ids) {
      const ui = expansionUi(id);
      expect(ui?.name(t)).toBeTruthy();
      expect(Object.keys(ui!.rules('fr'))).toEqual(Object.keys(ui!.rules('en')));
    }
  });

  it('names expansion cards and describes their effects', () => {
    const joker = { id: 'JK1', special: 'joker' };
    expect(cardLabel(joker, fr)).toBe('Joker');
    const play = { seq: 1, seat: 0, event: 'play', data: { card: joker, suit: 'hearts' } };
    expect(describeEntry(play, names, t)).toBe('Ada plays the Joker and names Hearts.');
    const forced = { seq: 2, seat: 1, event: 'forcedDraw', data: { count: 2 } };
    expect(describeEntry(forced, names, t)).toBe('Bob must draw 2 cards.');
    expect(describeEntry({ seq: 3, seat: 1, event: 'skip' }, names, fr)).toBe(
      'Bob passe son tour.',
    );
    expect(describeEntry({ seq: 4, seat: 2, event: 'reverse' }, names, t)).toBe(
      'Cy reverses the direction of play.',
    );
  });
});
