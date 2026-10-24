import type { RoomView } from '@cardgame/protocol';
import { navigate } from '../../app/router';
import { useI18n } from '../../i18n/I18nProvider';
import type { MatchController } from '../../table/controller';
import { Table } from '../../table/Table';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { Page } from '../../ui/Page';
import { Lobby } from './Lobby';
import { RESULT_PANELS } from './slots';
import { useRoom, type RoomHandle } from './useRoom';

const NOT_FOUND = 404;

/** The server's view of the room as a MatchController the table can drive. */
function onlineController(
  room: RoomView | null,
  handle: RoomHandle,
  errorText: (e: unknown) => string,
): MatchController | null {
  if (!room?.match) return null;
  return {
    view: room.match,
    names: room.seats.map((s) => s.name),
    bots: room.seats.map((s) => s.bot !== null),
    frames: room.seats.map((s) => s.looks?.frame),
    send: handle.play,
    busy: handle.busy,
    error: handle.error ? errorText(handle.error) : null,
    dismissError: handle.dismissError,
    rematch: room.isHost && room.kind === 'casual' ? () => handle.start() : undefined,
  };
}

export function RoomScreen({ code }: { code: string }) {
  const { t, errorText } = useI18n();
  const handle = useRoom(code);
  const controller = onlineController(handle.room, handle, errorText);
  const leave = () => {
    void handle.leave();
    navigate({ name: 'home' });
  };
  const leaveButton = (
    <Button variant="secondary" onClick={leave}>
      {t('common.actions.leave')}
    </Button>
  );
  if (handle.error?.status === NOT_FOUND)
    return (
      <Page title={t('rooms.title', { code })} lede={t('rooms.closed')} narrow>
        <Button onClick={() => navigate({ name: 'home' })}>{t('rooms.home')}</Button>
      </Page>
    );
  if (!handle.room)
    return <Page title={t('rooms.title', { code })} lede={t('rooms.opening', { code })} narrow />;
  if (controller) {
    const room = handle.room;
    const results =
      room.status === 'finished' &&
      RESULT_PANELS.map((Panel, i) => <Panel key={i} room={room} handle={handle} />);
    return (
      <Table
        controller={controller}
        title={t('rooms.title', { code })}
        actions={leaveButton}
        outcomeExtra={results}
      />
    );
  }
  return (
    <Page title={t('rooms.title', { code })} narrow>
      <div className="row">{leaveButton}</div>
      <Notice
        message={handle.error ? errorText(handle.error) : null}
        onDismiss={handle.dismissError}
      />
      <Lobby room={handle.room} handle={handle} />
    </Page>
  );
}
