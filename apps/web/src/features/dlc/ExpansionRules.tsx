import { useI18n } from '../../i18n/I18nProvider';
import { EXPANSION_UIS } from '../../game/expansions';

/** Every expansion's rules, after the base game's on the rules screen. */
export function ExpansionRules() {
  const { t, locale } = useI18n();
  return EXPANSION_UIS.map((ui) => (
    <section key={ui.id} className="stack">
      <h2>{t('dlc.rulesTitle', { name: ui.name(t) })}</h2>
      <p className="muted">{ui.tagline(t)}</p>
      {Object.entries(ui.rules(locale)).map(([id, section]) => (
        <section key={id} className="panel">
          <h3>{section.title}</h3>
          <p>{section.body}</p>
        </section>
      ))}
    </section>
  ));
}
