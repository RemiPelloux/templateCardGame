import { itemById } from '@cardgame/meta';
import type { MatchLine, ProfileView, RoomKind } from '@cardgame/protocol';
import { useI18n } from '../../i18n/I18nProvider';
import { Notice } from '../../ui/Notice';
import { Page } from '../../ui/Page';
import { AchievementsGrid } from '../progression/Achievements';
import { LevelBar } from '../progression/LevelBar';
import { MissionsPanel } from '../progression/MissionsPanel';
import { useProfile, useProgression } from '../progression/queries';
import { SeasonPanel } from '../progression/SeasonPanel';

const PERCENT = 100;
const KINDS: readonly RoomKind[] = ['casual', 'daily', 'ranked'];

function Header({ profile }: { profile: ProfileView }) {
  const { t } = useI18n();
  const ring = itemById(profile.equipped.frame ?? '')?.look?.ring ?? 'transparent';
  return (
    <header className="profile__header">
      <span
        className="avatar"
        style={{ boxShadow: `0 0 0 4px ${ring}` }}
        role="img"
        aria-label={t('profile.avatar', { name: profile.name })}
      >
        {profile.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="stack">
        <h1 className="page__title">
          {profile.name}
          <span className="muted">#{profile.tag}</span>
        </h1>
        <LevelBar level={profile.level} />
      </div>
    </header>
  );
}

type Counts = { matches: number; wins: number };

function StatsRow({ label, counts }: { label: string; counts: Counts }) {
  const { format } = useI18n();
  const rate = counts.matches
    ? `${format.number(Math.round((counts.wins / counts.matches) * PERCENT))} %`
    : '—';
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{format.number(counts.matches)}</td>
      <td>{format.number(counts.wins)}</td>
      <td>{rate}</td>
    </tr>
  );
}

function Stats({ stats }: { stats: ProfileView['stats'] }) {
  const { t } = useI18n();
  if (!stats.matches) return <p className="panel muted">{t('profile.stats.empty')}</p>;
  return (
    <section className="panel">
      <h2>{t('profile.stats.title')}</h2>
      <table className="stats">
        <thead>
          <tr>
            <th scope="col">{t('profile.stats.kind')}</th>
            <th scope="col">{t('profile.stats.matches')}</th>
            <th scope="col">{t('profile.stats.wins')}</th>
            <th scope="col">{t('profile.stats.rate')}</th>
          </tr>
        </thead>
        <tbody>
          {KINDS.map((kind) => {
            const counts = stats.byKind[kind];
            return (
              counts && <StatsRow key={kind} label={t(`profile.kinds.${kind}`)} counts={counts} />
            );
          })}
        </tbody>
        <tfoot>
          <StatsRow label={t('profile.stats.total')} counts={stats} />
        </tfoot>
      </table>
    </section>
  );
}

function Recent({ matches }: { matches: MatchLine[] }) {
  const { t, format } = useI18n();
  if (!matches.length) return null;
  return (
    <section className="panel">
      <h2>{t('profile.recent.title')}</h2>
      <ul className="list">
        {matches.map((m) => (
          <li key={`${m.room}-${m.ended}`} className="list__row">
            <strong>{m.won ? t('profile.recent.won') : t('profile.recent.lost')}</strong>
            <span className="muted">
              {t('profile.recent.line', {
                kind: t(`profile.kinds.${m.kind}`),
                players: m.players,
                date: format.date(m.ended),
              })}
            </span>
            <span>{t('progression.xpGain', { count: m.xp })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The member's own progress, shown only on their own profile. */
function OwnProgress() {
  const progression = useProgression();
  if (!progression.data) return null;
  return (
    <>
      <SeasonPanel season={progression.data.season} />
      <MissionsPanel />
    </>
  );
}

/** A member's profile; the signed-in member's own when `handle` is absent. */
export function ProfileScreen({ handle }: { handle?: string }) {
  const { t, errorText } = useI18n();
  const query = useProfile(handle);
  if (query.error)
    return (
      <Page title={t('profile.title')}>
        <Notice message={errorText(query.error)} />
      </Page>
    );
  if (!query.data) return <Page title={t('profile.title')} lede={t('common.status.loading')} />;
  const profile = query.data;
  return (
    <main className="page profile">
      <Header profile={profile} />
      <div className="profile__grid">
        <Stats stats={profile.stats} />
        {!handle && <OwnProgress />}
        <Recent matches={profile.recent} />
      </div>
      <AchievementsGrid achievements={profile.achievements} />
    </main>
  );
}
