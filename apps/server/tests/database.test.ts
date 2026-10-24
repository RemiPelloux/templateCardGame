import { describe, expect, it } from 'vitest';
import { migrate, openDatabase } from '../src/core/database';

describe('migrations', () => {
  it('apply once, in order, and refuse duplicate ids', () => {
    const db = openDatabase(':memory:');
    const steps = [
      { id: 'a.1', up: 'CREATE TABLE a (x INTEGER)' },
      { id: 'a.2', up: (d: typeof db) => d.exec('INSERT INTO a VALUES (1)') },
    ];
    migrate(db, steps);
    migrate(db, steps);
    expect(db.prepare('SELECT COUNT(*) AS n FROM a').get()).toEqual({ n: 1 });
    expect(() => migrate(db, [...steps, steps[0]!])).toThrow(/Duplicate/);
  });
});
