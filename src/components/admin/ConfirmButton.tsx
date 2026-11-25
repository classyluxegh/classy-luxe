'use client';

import { useFormStatus } from 'react-dom';

/** Submit button that asks for confirmation (for destructive actions). */
export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {pending ? '…' : children}
    </button>
  );
}

export function SubmitButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending}>{pending ? 'Saving…' : children}</button>;
}
