/**
 * @cardgame/protocol — what travels between the server and its clients, and nothing else.
 * One file per domain; each feature adds its own types and endpoints in its file.
 */
export * from './accounts';
export * from './daily';
export * from './dlc';
export * from './economy';
export * from './errors';
export * from './limits';
export * from './profile';
export * from './progression';
export * from './ranked';
export * from './rooms';
export * from './routes';
export * from './shop';
export * from './social';
export * from './telemetry';
