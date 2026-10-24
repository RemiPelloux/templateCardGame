import { useState } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Page } from '../../ui/Page';

const COPIED_MS = 1500;

/** The recovery codes, shown once after sign-up or regeneration. */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(codes.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    });
  return (
    <Page title={t('account.codes.title')} lede={t('account.codes.intro')} narrow>
      <section className="panel">
        <ol className="codes">
          {codes.map((code) => (
            <li key={code}>
              <code>{code}</code>
            </li>
          ))}
        </ol>
        <div className="row">
          <Button variant="secondary" onClick={copy}>
            {copied ? t('account.codes.copied') : t('account.codes.copy')}
          </Button>
          <Button onClick={onDone}>{t('account.codes.done')}</Button>
        </div>
      </section>
    </Page>
  );
}
