import { useT } from '../../i18n/I18nProvider';
import { expansionUi } from '../../game/expansions';

type Props = {
  /** The chosen expansion; null plays the classic game. */
  value: string | null;
  /** Expansions to offer besides the classic game. */
  choices: readonly string[];
  onChange(expansion: string | null): void;
  disabled?: boolean;
};

const CLASSIC = '';

/** “Classic” or one of the given expansions, by their translated names. */
export function ExpansionSelect({ value, choices, onChange, disabled }: Props) {
  const t = useT();
  return (
    <label className="field field--inline">
      {t('dlc.choose')}
      <select
        className="input"
        value={value ?? CLASSIC}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value={CLASSIC}>{t('dlc.classic')}</option>
        {choices.map((id) => (
          <option key={id} value={id}>
            {expansionUi(id)?.name(t) ?? id}
          </option>
        ))}
      </select>
    </label>
  );
}
