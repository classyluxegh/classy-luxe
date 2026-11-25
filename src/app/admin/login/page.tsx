'use client';

import { useActionState } from 'react';
import { signIn } from './actions';

export default function AdminLogin() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-5 text-ivory">
      <form action={action} className="w-full max-w-sm space-y-5">
        <div className="mb-8 text-center">
          <p className="font-serif text-3xl tracking-[.24em] uppercase">Classy <em className="normal-case tracking-normal text-gold">Luxe</em></p>
          <p className="mt-2 text-[.7rem] uppercase tracking-[.3em] text-ivory/50">Admin</p>
        </div>
        <label className="block text-xs uppercase tracking-[.2em] text-ivory/60">Email
          <input name="email" type="email" autoComplete="email" required className="mt-2 block h-12 w-full border border-ivory/20 bg-transparent px-3 text-base normal-case tracking-normal text-ivory outline-none focus:border-gold" />
        </label>
        <label className="block text-xs uppercase tracking-[.2em] text-ivory/60">Password
          <input name="password" type="password" autoComplete="current-password" required minLength={8} className="mt-2 block h-12 w-full border border-ivory/20 bg-transparent px-3 text-base normal-case tracking-normal text-ivory outline-none focus:border-gold" />
        </label>
        {state?.error && <p role="alert" className="text-sm text-[#E7A193]">{state.error}</p>}
        <button disabled={pending} className="h-12 w-full bg-gold text-xs uppercase tracking-[.2em] text-ink transition hover:bg-gold-light disabled:opacity-60">
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
