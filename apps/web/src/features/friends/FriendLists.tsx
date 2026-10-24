import { useId, useState, type ReactNode } from 'react';
import {
  handleOf,
  socialApi,
  type FriendView,
  type SocialOverview,
  type SocialPlayer,
} from '@cardgame/protocol';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { useAction } from '../../ui/useAction';
import { MemberDialog } from './MemberDialog';
import { PresenceDot } from './PresenceDot';
import { useSocialWrite } from './useSocial';

type Menu = { person: SocialPlayer; friend: boolean } | null;
type Act = (path: string, person: SocialPlayer) => void;

/** Requests both ways, friends with their presence, and blocked players, with their actions. */
export function FriendLists({ overview }: { overview: SocialOverview }) {
  const write = useSocialWrite();
  const { busy, error, run, clearError } = useAction();
  const [menu, setMenu] = useState<Menu>(null);
  const act: Act = (path, person) => void run(() => write(path, { handle: handleOf(person) }));
  const open = (person: SocialPlayer, friend: boolean) => setMenu({ person, friend });
  return (
    <>
      <Notice message={error} onDismiss={clearError} />
      <Incoming overview={overview} act={act} busy={busy} onMenu={(p) => open(p, false)} />
      <Outgoing overview={overview} act={act} busy={busy} />
      <Friends friends={overview.friends} onMenu={(p) => open(p, true)} />
      <Blocked overview={overview} act={act} busy={busy} />
      {menu && <MemberDialog {...menu} onClose={() => setMenu(null)} />}
    </>
  );
}

function MenuButton({ person, onMenu }: { person: SocialPlayer; onMenu(p: SocialPlayer): void }) {
  const { t } = useI18n();
  return (
    <Button
      variant="ghost"
      aria-haspopup="dialog"
      aria-label={t('friends.list.menu', { name: person.name })}
      onClick={() => onMenu(person)}
    >
      ⋯
    </Button>
  );
}

const Handle = ({ person }: { person: SocialPlayer }) => (
  <strong>
    {person.name}
    <span className="muted">#{person.tag}</span>
  </strong>
);

type SectionProps = {
  title: string;
  people: SocialPlayer[];
  actions(person: SocialPlayer): ReactNode;
};

/** One titled list of members with their buttons; nothing when the list is empty. */
function PeopleSection({ title, people, actions }: SectionProps) {
  const id = useId();
  if (people.length === 0) return null;
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <ul className="list">
        {people.map((person) => (
          <li key={handleOf(person)} className="list__row">
            <Handle person={person} />
            <span className="row">{actions(person)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type ListProps = { overview: SocialOverview; act: Act; busy: boolean };

function Incoming({ overview, act, busy, onMenu }: ListProps & { onMenu(p: SocialPlayer): void }) {
  const { t } = useI18n();
  return (
    <PeopleSection
      title={t('friends.requests.incoming')}
      people={overview.incoming}
      actions={(person) => (
        <>
          <Button onClick={() => act(socialApi.accept, person)} disabled={busy}>
            {t('friends.requests.accept')}
          </Button>
          <Button variant="secondary" onClick={() => act(socialApi.decline, person)}>
            {t('friends.requests.decline')}
          </Button>
          <MenuButton person={person} onMenu={onMenu} />
        </>
      )}
    />
  );
}

function Outgoing({ overview, act, busy }: ListProps) {
  const { t } = useI18n();
  return (
    <PeopleSection
      title={t('friends.requests.outgoing')}
      people={overview.outgoing}
      actions={(person) => (
        <Button variant="ghost" onClick={() => act(socialApi.cancel, person)} disabled={busy}>
          {t('friends.requests.cancel')}
        </Button>
      )}
    />
  );
}

function Blocked({ overview, act, busy }: ListProps) {
  const { t } = useI18n();
  return (
    <PeopleSection
      title={t('friends.member.blocked')}
      people={overview.blocked}
      actions={(person) => (
        <Button variant="ghost" onClick={() => act(socialApi.unblock, person)} disabled={busy}>
          {t('friends.member.unblock')}
        </Button>
      )}
    />
  );
}

function Friends({ friends, onMenu }: { friends: FriendView[]; onMenu(p: SocialPlayer): void }) {
  const { t, format } = useI18n();
  return (
    <section className="panel" aria-labelledby="friends-list">
      <h2 id="friends-list">{t('friends.list.title', { count: friends.length })}</h2>
      {friends.length === 0 && <p className="muted">{t('friends.list.empty')}</p>}
      <ul className="list">
        {friends.map((friend) => (
          <li key={handleOf(friend)} className="list__row">
            <span className="friend">
              <Handle person={friend} />
              <PresenceDot presence={friend.presence} />
              <span className="muted friend__since">
                {t('friends.list.since', { date: format.date(friend.since) })}
              </span>
            </span>
            <MenuButton person={friend} onMenu={onMenu} />
          </li>
        ))}
      </ul>
    </section>
  );
}
