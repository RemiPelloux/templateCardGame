const MINUTE_MS = 60_000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

/** Friends per member: enough for a real circle, small enough to list on one screen. */
export const MAX_FRIENDS = 200;
/** Requests a member may have waiting on others at once. */
export const MAX_OUTGOING = 50;
/** Requests waiting on one member: past this, new ones are refused (an anti-spam ceiling). */
export const MAX_INCOMING = 100;
export const MAX_BLOCKS = 500;

/** Social writes per member and minute; adding by handle has its own, tighter budget. */
export const WRITES_PER_MINUTE = 60;
export const REQUESTS_PER_MINUTE = 10;
export const INVITES_PER_MINUTE = 20;
export const REPORTS_PER_DAY = 20;
/** Test servers run many members from one machine: budgets are lifted. */
export const RELAXED = 10_000;

/** A member counts as online while their app pinged within this window (it pings every 30 s). */
export const ONLINE_WINDOW_MS = 2 * MINUTE_MS;
/** A table invite is only useful while the table waits; after this it disappears. */
export const INVITE_TTL_MS = 15 * MINUTE_MS;
export const SWEEP_MS = MINUTE_MS;
