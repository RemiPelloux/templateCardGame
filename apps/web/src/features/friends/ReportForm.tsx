import { useId, useState, type FormEvent } from 'react';
import {
  REPORT_NOTE_MAX_LENGTH,
  REPORT_REASONS,
  ROOM_CODE_LENGTH,
  socialApi,
  type ReportReason,
} from '@cardgame/protocol';
import { useT } from '../../i18n/I18nProvider';
import { http } from '../../net/http';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Notice } from '../../ui/Notice';
import { useAction } from '../../ui/useAction';

type Props = { handle: string; room: string | null };

/** Labels by reason: a message key named `other` would be read as a plural form. */
const REASON_LABELS = {
  cheating: 'friends.report.reasons.cheating',
  harassment: 'friends.report.reasons.harassment',
  'offensive-name': 'friends.report.reasons.offensiveName',
  spam: 'friends.report.reasons.spam',
  other: 'friends.report.reasons.somethingElse',
} as const satisfies Record<ReportReason, string>;

/** A reason from the fixed list, an optional note and table code. */
export function ReportForm({ handle, room }: Props) {
  const t = useT();
  const { busy, error, run, clearError } = useAction();
  const [done, setDone] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      handle,
      reason: String(form.get('reason')) as ReportReason,
      note: String(form.get('note') ?? ''),
      room: String(form.get('room') ?? ''),
    };
    void run(() => http.post(socialApi.report, body)).then(() => setDone(true));
  };
  if (done && !error) return <Notice tone="info" message={t('friends.report.done')} />;
  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="reasons">
        <legend>{t('friends.report.reason')}</legend>
        {REPORT_REASONS.map((reason, i) => (
          <label key={reason} className="reasons__option">
            <input type="radio" name="reason" value={reason} required defaultChecked={i === 0} />
            {t(REASON_LABELS[reason])}
          </label>
        ))}
      </fieldset>
      <NoteField />
      <Field
        label={t('friends.report.room')}
        name="room"
        defaultValue={room ?? ''}
        maxLength={ROOM_CODE_LENGTH}
        autoComplete="off"
      />
      <Notice message={error} onDismiss={clearError} />
      <Button type="submit" variant="danger" disabled={busy}>
        {t('friends.report.submit')}
      </Button>
    </form>
  );
}

function NoteField() {
  const t = useT();
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{t('friends.report.note')}</label>
      <textarea
        id={id}
        name="note"
        className="input input--area"
        maxLength={REPORT_NOTE_MAX_LENGTH}
        aria-describedby={`${id}-hint`}
      />
      <span id={`${id}-hint`} className="field__hint">
        {t('friends.report.noteHint', { max: REPORT_NOTE_MAX_LENGTH })}
      </span>
    </div>
  );
}
