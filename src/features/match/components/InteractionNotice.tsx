interface InteractionNoticeProps {
  message: string | null;
}

export function InteractionNotice({ message }: InteractionNoticeProps) {
  if (!message) return null;
  return <div className="interaction-notice" role="status" aria-live="polite">{message}</div>;
}
