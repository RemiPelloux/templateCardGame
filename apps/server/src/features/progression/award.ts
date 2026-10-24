import {
  activeMissions,
  matchReward,
  missionById,
  missionGain,
  periodOf,
  seasonAt,
  tallyMatch,
  type Tally,
} from '@cardgame/meta';
import type { ResultSummary } from '@cardgame/protocol';
import type { MatchFinished } from '../../core/events';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { gainXp, pay, settlement, unlockAchievements, type Settlement } from './earnings';
import type { ProgressStore, ResultRow } from './store';

type Advanced = ResultSummary['missions'];
type Seat = MatchFinished['seats'][number];

/** Identifies one match for good: replaying the event finds the same key and pays nothing. */
export const matchRef = (event: MatchFinished) =>
  `${event.room}:${event.match.seed}:${event.match.version}`;

/** A person still in their seat; one a bot took over (they left) earns nothing. */
export const isPerson = (seat: Seat) => seat.accountId !== null && !seat.bot;

function resultRow(event: MatchFinished, seat: number): ResultRow {
  const outcome = event.match.outcome;
  const won = outcome?.winners.includes(seat) ?? false;
  const players = event.seats.length;
  const humans = event.seats.filter(isPerson).length;
  const { xp, coins } = matchReward({ kind: event.kind, won, players, humans });
  return {
    ...{ ref: matchRef(event), room: event.room, kind: event.kind, seat, won, players, humans },
    ...{ score: outcome?.scores?.[seat] ?? 0, season: seasonAt(event.ended).number, xp, coins },
    ended: event.ended,
  };
}

/** Moves every mission on at `at` by what the match counted, up to its goal. */
function advanceMissions(s: Settlement, tally: Tally, at: number): Advanced {
  const advanced: Advanced = [];
  for (const mission of activeMissions(at)) {
    const gain = missionGain(mission, tally);
    const period = periodOf(mission.period, at).key;
    const row = s.store.missions(s.accountId, [period]).find((r) => r.mission_id === mission.id);
    const current = row?.progress ?? 0;
    if (!gain || current >= mission.goal) continue;
    const progress = Math.min(mission.goal, current + gain);
    s.store.setMission(s.accountId, { mission_id: mission.id, period, progress, claimed: null });
    advanced.push({
      id: mission.id,
      progress,
      goal: mission.goal,
      completed: progress >= mission.goal,
    });
  }
  return advanced;
}

function settle(s: Settlement, event: MatchFinished, row: ResultRow): ResultSummary {
  pay(s, { coins: row.coins, reason: 'reward.match', ref: `reward:${row.ref}` });
  const tally = tallyMatch({ kind: row.kind, won: row.won, seat: row.seat, log: event.match.log });
  s.store.addStats(s.accountId, tally);
  const climb = gainXp(s, row.xp, row.ended);
  const missions = advanceMissions(s, tally, row.ended);
  const achievements = unlockAchievements(s, row.ended);
  return {
    ...{ room: row.room, kind: event.kind, won: row.won, xp: row.xp, coins: s.coins },
    ...{ level: climb.level, season: climb.season, missions, achievements },
    ...{ items: s.items, ended: row.ended },
  };
}

/** Records one seat's result and pays it, all or nothing; null when already done or no one. */
export function awardSeat(
  services: Services,
  store: ProgressStore,
  input: { event: MatchFinished; seat: number },
) {
  const seat = input.event.seats[input.seat];
  const accountId = seat && isPerson(seat) ? seat.accountId! : null;
  if (!accountId || !services.accounts.player(accountId)) return null;
  const row = resultRow(input.event, input.seat);
  return services.db.transaction(() => {
    if (store.hasResult(accountId, row.ref)) return null;
    const summary = settle(settlement(services, store, accountId), input.event, row);
    store.saveResult(accountId, { ...row, coins: summary.coins }, summary);
    return summary;
  })();
}

/** Pays a completed mission of the current period, once. */
export function claimMission(
  services: Services,
  store: ProgressStore,
  input: { accountId: string; id: string },
) {
  const now = services.now();
  const mission = missionById(input.id);
  if (!mission || !activeMissions(now).some((m) => m.id === mission.id))
    throw new ApiError('This mission is not on.', 'MISSION_UNAVAILABLE', 404);
  const period = periodOf(mission.period, now).key;
  return services.db.transaction(() => {
    const row = store.missions(input.accountId, [period]).find((r) => r.mission_id === mission.id);
    if (row?.claimed)
      throw new ApiError('This reward was already claimed.', 'MISSION_CLAIMED', 409);
    if (!row || row.progress < mission.goal)
      throw new ApiError('This mission is not complete yet.', 'MISSION_INCOMPLETE', 409);
    store.setMission(input.accountId, { ...row, claimed: now });
    const s = settlement(services, store, input.accountId);
    pay(s, {
      coins: mission.reward.coins,
      reason: 'reward.mission',
      ref: `mission:${mission.id}:${period}`,
    });
    gainXp(s, mission.reward.xp, now);
    unlockAchievements(s, now);
    return { coins: s.coins, xp: mission.reward.xp };
  })();
}
