import { useState, type FormEvent } from 'react';
import { NAME_MAX_LENGTH } from '@cardgame/protocol';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';

/** Online tables need a name; it is kept as a guest session on this device. */
export function NameForm({ onSubmit }: { onSubmit: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit(name);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="panel name-form" onSubmit={submit}>
      <label htmlFor="player-name">Your name at the table</label>
      <div className="row">
        <input
          id="player-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="nickname"
          required
        />
        <Button type="submit" disabled={busy || !name.trim()}>
          Continue
        </Button>
      </div>
      <Notice message={error} onDismiss={() => setError(null)} />
    </form>
  );
}
