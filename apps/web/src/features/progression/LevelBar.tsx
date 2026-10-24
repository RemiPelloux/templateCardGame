import type { LevelView } from '@cardgame/protocol';
import { useT } from '../../i18n/I18nProvider';

type Props = { label: string; into: number; needed: number | null };

/** A labelled progress bar: XP into a level, mission progress, a season step. */
export function ProgressBar({ label, into, needed }: Props) {
  return (
    <div className="progress">
      <span className="progress__label">{label}</span>
      <progress className="progress__bar" value={needed === null ? 1 : into} max={needed ?? 1}>
        {label}
      </progress>
    </div>
  );
}

/** The member's level and XP toward the next one. */
export function LevelBar({ level }: { level: LevelView }) {
  const t = useT();
  return (
    <div className="level">
      <strong className="level__number">{t('progression.level', { level: level.level })}</strong>
      <ProgressBar
        label={
          level.needed === null
            ? t('progression.xpMax')
            : t('progression.xp', { into: level.into, needed: level.needed })
        }
        into={level.into}
        needed={level.needed}
      />
    </div>
  );
}
