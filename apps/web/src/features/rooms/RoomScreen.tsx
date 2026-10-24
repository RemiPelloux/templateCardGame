import type { RoomView } from '@cardgame/protocol';
import { navigate } from '../app/router';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { useRoom, type RoomHandle } from '../net/useRoom';
import type { MatchController } from '../play/controller';
import { Table } from '../table/Table';
import { Lobby } from './Lobby';

const NOT_FOUND = 404;

/** The server's view of the room as a MatchController the table can drive. */
function onlineController(room: RoomView | null, handle: RoomHandle): MatchController | null {
  if (!room?.match) return null;
  return {
    view: room.match,
    names: room.seats.map((s) => s.name),
    bots: room.seats.map((s) => s.bot !== null),
    send: handle.play,
    busy: handle.busy,
    error: handle.error?.message ?? null,
    dismissError: handle.dismissError,
    rematch: room.isHost ? () => handle.start() : undefined,
  };
}

export function RoomScreen({ code }: { code: string }) {
  const handle = useRoom(code);
  const controller = onlineController(handle.room, handle);
  const leave = () => {
    void handle.leave();
    navigate({ name: 'home' });
  };
  const leaveButton = (
    <Button variant="secondary" onClick={leave}>
      Leave
    </Button>
  );
  if (handle.error?.status === NOT_FOUND)
    return (
      <main className="centered panel">
        <p>This table is closed or does not exist.</p>
        <Button onClick={() => navigate({ name: 'home' })}>Back home</Button>
      </main>
    );
  if (!handle.room) return <main className="centered muted">Opening table {code}…</main>;
  if (controller)
    return <Table controller={controller} title={`Table ${code}`} actions={leaveButton} />;
  return (
    <main className="centered">
      <header className="table__bar">
        <h1 className="table__title">Table {code}</h1>
        {leaveButton}
      </header>
      <Notice message={handle.error?.message ?? null} onDismiss={handle.dismissError} />
      <Lobby room={handle.room} handle={handle} />
    </main>
  );
}
