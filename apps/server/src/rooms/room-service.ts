import type {
  CommandRequest,
  Player,
  RoomView,
  SeatsRequest,
  StartRequest,
} from '@cardgame/protocol';
import { CLOSED_REVISION } from '@cardgame/protocol';
import { ApiError, notFound } from '../http/errors';
import type { RoomStore } from '../storage/room-store';
import { newRoomCode } from './codes';
import { changeSeats, join, leave, play, start } from './lobby';
import { MAX_ROOMS, ROOM_IDLE_MS, seatOf, type GameMatch, type Room } from './model';
import { playBot, scheduleBot } from './room-bots';
import { RoomEvents } from './room-events';
import { roomView, type Presence } from './room-view';

const UNAVAILABLE = 503;

/**
 * Every open room, held in memory and saved on each change. Requests go through `update`, which
 * applies one change, bumps the revision, schedules bots, saves and announces the new revision.
 * `tick` (called by a timer) plays due bot moves and closes idle rooms.
 */
export class RoomService {
  private rooms = new Map<string, Room>();
  /** Open live streams per room and player: an open stream means “connected”. */
  private streams = new Map<string, Map<string, number>>();
  readonly events = new RoomEvents();

  constructor(
    private store: RoomStore | null,
    private now = Date.now,
  ) {
    for (const room of store?.all() ?? []) this.rooms.set(room.code, room);
  }

  create(player: Player): RoomView {
    if (this.rooms.size >= MAX_ROOMS)
      throw new ApiError('Too many tables open.', 'BUSY', UNAVAILABLE);
    const time = this.now();
    const code = newRoomCode((c) => this.rooms.has(c));
    const room: Room = {
      code,
      host: player.id,
      seats: [],
      options: {},
      match: null,
      revision: 0,
      created: time,
      touched: time,
      botAt: null,
    };
    this.rooms.set(code, room);
    return this.update(code, player, (created) => join(created, player, time));
  }

  view(code: string, player: Player): RoomView {
    const room = this.get(code);
    const seat = seatOf(room, player.id);
    if (seat >= 0) room.seats[seat]!.seen = this.now();
    return roomView(room, player, this.presence(room));
  }

  join(code: string, player: Player) {
    return this.update(code, player, (room) => join(room, player, this.now()));
  }

  seats(code: string, player: Player, request: SeatsRequest) {
    return this.update(code, player, (room) => changeSeats(room, player, request));
  }

  start(code: string, player: Player, request: StartRequest) {
    return this.update(code, player, (room) => start(room, player, request));
  }

  play(code: string, player: Player, request: CommandRequest) {
    return this.update(code, player, (room) => play(room, player, request));
  }

  leave(code: string, player: Player) {
    const room = this.get(code);
    if (leave(room, player)) return void this.commit(room, room.match);
    this.close(room);
  }

  /** Counts a member as connected while their live stream is open; returns the disconnect. */
  connect(code: string, player: Player): () => void {
    const room = this.get(code);
    const open = this.streams.get(code) ?? new Map<string, number>();
    this.streams.set(code, open);
    const change = (delta: number) => {
      open.set(player.id, (open.get(player.id) ?? 0) + delta);
      if (!open.get(player.id)) open.delete(player.id);
      this.events.emit(code, room.revision);
    };
    change(1);
    return () => change(-1);
  }

  /** Plays every due bot move and closes rooms left idle. Call it on a short interval. */
  tick() {
    const time = this.now();
    for (const room of this.rooms.values()) {
      const watched = (this.streams.get(room.code)?.size ?? 0) > 0;
      if (!watched && time - room.touched > ROOM_IDLE_MS) this.close(room);
      else if (room.botAt !== null && room.botAt <= time) this.botMove(room);
    }
  }

  get size() {
    return this.rooms.size;
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

  private presence(room: Room): Presence {
    return { now: this.now(), online: new Set(this.streams.get(room.code)?.keys()) };
  }

  private botMove(room: Room) {
    const before = room.match;
    if (playBot(room)) this.commit(room, before);
  }

  /** Saves and announces a change; the move that ends a match also archives it, once. */
  private commit(room: Room, before: GameMatch | null) {
    room.revision++;
    room.touched = this.now();
    scheduleBot(room, this.now());
    this.store?.save(room);
    if (room.match !== before && room.match?.outcome) this.store?.archive(room, this.now());
    this.events.emit(room.code, room.revision);
  }

  private close(room: Room) {
    this.rooms.delete(room.code);
    this.streams.delete(room.code);
    this.store?.delete(room.code);
    this.events.emit(room.code, CLOSED_REVISION);
  }
}
