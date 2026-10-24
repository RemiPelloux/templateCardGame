import {
  isRoomCode,
  normalizeRoomCode,
  REPORT_NOTE_MAX_LENGTH,
  REPORT_REASONS,
  type Player,
  type ReportReason,
} from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { DAY_MS, REPORTS_PER_DAY } from './limits';
import { memberByHandle } from './people';

const BAD_REQUEST = 400;
const TOO_MANY = 429;

type ReportInput = { me: Player; body: Record<string, unknown> };

const readReason = (value: unknown): ReportReason => {
  if (!REPORT_REASONS.includes(value as ReportReason))
    throw new ApiError('Pick a reason.', 'INVALID_REASON');
  return value as ReportReason;
};

const readNote = (value: unknown): string | null => {
  const note = typeof value === 'string' ? value.trim() : '';
  if (note.length > REPORT_NOTE_MAX_LENGTH)
    throw new ApiError('This note is too long.', 'NOTE_TOO_LONG', BAD_REQUEST, {
      max: REPORT_NOTE_MAX_LENGTH,
    });
  return note || null;
};

const readRoom = (value: unknown): string | null => {
  const room = typeof value === 'string' ? normalizeRoomCode(value) : '';
  if (room && !isRoomCode(room)) throw new ApiError('Unknown table code.', 'INVALID_ROOM');
  return room || null;
};

/**
 * Reports for moderation: stored, never shown to the reported member, read by operators with
 * `scripts/ops/list-reports.mjs`. The same reporter, target and reason count once per UTC day;
 * a repeat is accepted silently so a reporter learns nothing from retrying.
 */
export function fileReport(services: Services, input: ReportInput) {
  const reason = readReason(input.body.reason);
  const note = readNote(input.body.note);
  const room = readRoom(input.body.room);
  const target = memberByHandle(services, { me: input.me, handle: input.body.handle });
  const now = services.now();
  const day = Math.floor(now / DAY_MS);
  const known = services.db
    .prepare(
      'SELECT 1 FROM reports WHERE reporter_id = ? AND target_id = ? AND reason = ? AND day = ?',
    )
    .get(input.me.id, target.id, reason, day);
  if (known) return;
  const recent = services.db
    .prepare('SELECT COUNT(*) AS n FROM reports WHERE reporter_id = ? AND created > ?')
    .get(input.me.id, now - DAY_MS) as { n: number };
  if (recent.n >= REPORTS_PER_DAY)
    throw new ApiError('You sent many reports today.', 'REPORT_LIMIT', TOO_MANY);
  services.db
    .prepare(
      `INSERT INTO reports (reporter_id, target_id, reason, note, room, day, created)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(input.me.id, target.id, reason, note, room, day, now);
}
