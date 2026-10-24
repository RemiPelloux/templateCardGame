import { useI18n } from '../../i18n/I18nProvider';
import { messages } from '../../i18n/messages';
import { Page } from '../../ui/Page';

/** The game's rules, section by section, straight from `game.rules` in src/game/i18n.ts. */
export function RulesScreen() {
  const { t, locale } = useI18n();
  const sections = Object.entries(messages[locale].game.rules);
  return (
    <Page title={t('rules.title')} lede={t('game.tagline')} narrow>
      <div className="stack">
        {sections.map(([id, section]) => (
          <section key={id} className="panel">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </Page>
  );
}
