import type { Options } from '@cardgame/game';
import type {
  CommandRequest,
  OptionsRequest,
  Player,
  RoomKind,
  RoomView,
  SeatsRequest,
  StartRequest,
} from '@cardgame/protocol';
import { CLOSED_REVISION } from '@cardgame/protocol';
import type { DomainEvents } from '../../core/events';
import { ApiError, notFound } from '../../core/http/errors';
import { newRoomCode } from './codes';
import { changeSeats, deal, join, leave, lobbyOptions, play } from './lobby';
import { MAX_ROOMS, ROOM_IDLE_MS, seatOf, type GameMatch, type Room } from './model';
import { playBot, scheduleBot } from './room-bots';
import { RoomEvents } from './room-events';
import type { RoomStore } from './room-store';
import { roomView, type Presence } from './room-view';
import { DEFAULT_BOT } from '@cardgame/game';

const UNAVAILABLE = 503;

/** A table dealt by the server itself (daily challenge, ranked duel) rather than by a host. */
export type MatchRequest = {
  kind: RoomKind;
  players: Player[];
  bots?: number;
  seed?: number;
  options?: Partial<Options>;
};

/**
 * A feature's say on the options a host picks (the dlc feature refuses an expansion the host
 * does not own). Throws an ApiError to refuse; runs when options are set and at every deal.
 */
export type OptionsGuard = (check: {
  player: Player;
  kind: RoomKind;
  options: Partial<Options>;
}) => void;

/**
 * Every open room, held in memory and saved on each change. Requests go through `update`, which
 * applies one change, then `commit` bumps the revision, schedules bots, saves, archives a match
 * that just ended (announcing `match.finished`) and signals live listeners.
 */
export class RoomService {
  private rooms = new Map<string, Room>();
  /** Open live streams per room and player: an open stream means “connected”. */
  private streams = new Map<string, Map<string, number>>();
  readonly live = new RoomEvents();
  private guards: OptionsGuard[] = [];

  constructor(
    private deps: {
      store: RoomStore | null;
      events: DomainEvents | null;
      now: () => number;
      /** Each person's equipped items, shown at the table (`Inventory.equipped`). */
      looks?: (accountId: string) => Record<string, string>;
    },
  ) {
    for (const room of deps.store?.all() ?? []) this.rooms.set(room.code, room);
  }

  create(player: Player): RoomView {
    const room = this.open('casual', player.id);
    return this.update(room.code, player, (created) => join(created, player, this.deps.now()));
  }

  /** Seats the players (and bots) and deals at once. Returns the room code. */
  openMatch(request: MatchRequest): string {
    const room = this.open(request.kind, request.players[0]!.id);
    room.seed = request.seed;
    room.options = request.options ?? {};
    for (const player of request.players) join(room, player, this.deps.now());
    for (let i = 0; i < (request.bots ?? 0); i++)
      room.seats.push({
        player: null,
        name: `Bot ${i + 1}`,
        handle: null,
        bot: DEFAULT_BOT,
        seen: 0,
      });
    deal(room);
    this.commit(room, null);
    return room.code;
  }

  view(code: string, player: Player): RoomView {
    const room = this.get(code);
    const seat = seatOf(room, player.id);
    if (seat >= 0) room.seats[seat]!.seen = this.deps.now();
    return roomView(room, player, this.presence(room));
  }

  join(code: string, player: Player) {
    return this.update(code, player, (room) => join(room, player, this.deps.now()));
  }

  seats(code: string, player: Player, request: SeatsRequest) {
    return this.update(code, player, (room) => changeSeats(room, player, request));
  }

  /** Lets a feature refuse lobby options; call it from the feature's `start`. */
  guardOptions(guard: OptionsGuard) {
    this.guards.push(guard);
  }

  setOptions(code: string, player: Player, request: OptionsRequest) {
    return this.update(code, player, (room) => this.configure(room, player, request.options));
  }

  /** Deals a new match, or a rematch once the previous one is over. */
  start(code: string, player: Player, request: StartRequest) {
    return this.update(code, player, (room) => {
      this.configure(room, player, request.options);
      deal(room);
    });
  }

  play(code: string, player: Player, request: CommandRequest) {
    return this.update(code, player, (room) => play(room, player, request));
  }

  leave(code: string, player: Player) {
    const room = this.get(code);
    if (leave(room, player)) return void this.commit(room, room.match);
    this.close(room);
  }

  /** Leaves every room `accountId` sits in (account deleted). */
  leaveAll(accountId: string) {
    for (const room of [...this.rooms.values()])
      if (seatOf(room, accountId) >= 0) this.leave(room.code, { id: accountId, name: '', tag: 0 });
  }

  /** The rooms a member sits in, newest first: to bring them back to a table after a reload. */
  roomsOf(accountId: string): { code: string; kind: RoomKind }[] {
    return [...this.rooms.values()]
      .filter((room) => seatOf(room, accountId) >= 0)
      .sort((a, b) => b.created - a.created)
      .map((room) => ({ code: room.code, kind: room.kind }));
  }

  /** Counts a member as connected while their live stream is open; returns the disconnect. */
  connect(code: string, player: Player): () => void {
    const room = this.get(code);
    const open = this.streams.get(code) ?? new Map<string, number>();
    this.streams.set(code, open);
    const change = (delta: number) => {
      open.set(player.id, (open.get(player.id) ?? 0) + delta);
      if (!open.get(player.id)) open.delete(player.id);
      this.live.emit(code, room.revision);
    };
    change(1);
    return () => change(-1);
  }

  /** Plays every due bot move and closes rooms left idle. Call it on a short interval. */
  tick() {
    const time = this.deps.now();
    for (const room of this.rooms.values()) {
      const watched = (this.streams.get(room.code)?.size ?? 0) > 0;
      if (!watched && time - room.touched > ROOM_IDLE_MS) this.close(room);
      else if (room.botAt !== null && room.botAt <= time) this.botMove(room);
    }
  }

  get size() {
    return this.rooms.size;
  }

  private open(kind: RoomKind, host: string): Room {
    if (this.rooms.size >= MAX_ROOMS)
      throw new ApiError('Too many tables open.', 'BUSY', UNAVAILABLE);
    const time = this.deps.now();
    const code = newRoomCode((c) => this.rooms.has(c));
    const room: Room = {
      code,
      kind,
      host,
      seats: [],
      options: {},
      match: null,
      revision: 0,
      created: time,
      touched: time,
      botAt: null,
    };
    this.rooms.set(code, room);
    return room;
  }

  private get(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw notFound('This table is closed or does not exist.');
    return room;
  }

  private update(code: string, player: Player, change: (room: Room) => void): RoomView {
    const room = this.get(code);
    const before = room.match;
    change(room);
    this.commit(room, before);
    return roomView(room, player, this.presence(room));
  }

  /** Checks the host's options (game, then guards) and only then stores them. */
  private configure(room: Room, player: Player, changes?: Partial<Options>) {
    const options = lobbyOptions(room, player, changes);
    for (const guard of this.guards) guard({ player, kind: room.kind, options });
    room.options = options;
  }

  private presence(room: Room): Presence {
    return {
      now: this.deps.now(),
      online: new Set(this.streams.get(room.code)?.keys()),
      looks: this.deps.looks,
    };
  }

  private botMove(room: Room) {
    const before = room.match;
    if (playBot(room)) this.commit(room, before);
  }

  /** Saves and announces a change; the move that ends a match also archives it, once. */
  private commit(room: Room, before: GameMatch | null) {
    room.revision++;
    room.touched = this.deps.now();
    scheduleBot(room, this.deps.now());
    this.deps.store?.save(room);
    if (room.match !== before && room.match?.outcome) this.finished(room);
    this.live.emit(room.code, room.revision);
  }

  private finished(room: Room) {
    const ended = this.deps.now();
    this.deps.store?.archive(room, ended);
    this.deps.events?.emit('match.finished', {
      room: room.code,
      kind: room.kind,
      match: room.match!,
      seats: room.seats.map((s) => ({ accountId: s.player, bot: s.bot, name: s.name })),
      ended,
    });
  }

  private close(room: Room) {
    this.rooms.delete(room.code);
    this.streams.delete(room.code);
    this.deps.store?.delete(room.code);
    this.live.emit(room.code, CLOSED_REVISION);
  }
}
