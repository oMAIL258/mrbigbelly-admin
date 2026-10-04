'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); setBusy(false); return; }
    router.replace('/orders');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 space-y-3">
        <h1 className="serif text-2xl">Mr. Big Belly · Admin</h1>
        <p className="text-ink-3 text-sm">Sign in to manage orders.</p>
        <div>
          <label className="text-sm text-ink-2">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
        </div>
        <div>
          <label className="text-sm text-ink-2">Password</label>
          <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)}
            className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
        </div>
        {err && <div className="text-sm text-accent">{err}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
