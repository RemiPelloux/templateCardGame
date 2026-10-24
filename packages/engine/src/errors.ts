/**
 * A refused move: safe to show to the player who sent it. Anything else thrown while applying a
 * command is a bug and must never reach a client verbatim.
 */
export class RuleError extends Error {
  override readonly name = 'RuleError';
  constructor(
    message: string,
    /** A stable, machine-readable reason clients may translate (`NOT_YOUR_TURN`, `ILLEGAL`…). */
    readonly code: string = 'ILLEGAL',
  ) {
    super(message);
  }
}

export const isRuleError = (error: unknown): error is RuleError => error instanceof RuleError;
