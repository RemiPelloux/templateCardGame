type Props = { message: string | null; onDismiss?: () => void };

/** A refused move or a failed request, announced to screen readers and dismissible. */
export function Notice({ message, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div className="notice" role="alert">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" className="notice__close" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
