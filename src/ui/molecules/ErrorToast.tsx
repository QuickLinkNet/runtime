interface ErrorToastProps {
  message: string;
  onClose: () => void;
}

export function ErrorToast({ message, onClose }: ErrorToastProps) {
  return (
    <div className="error-toast" role="alert">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Fehlermeldung schließen">×</button>
    </div>
  );
}
