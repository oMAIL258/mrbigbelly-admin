'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useLang } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { lang, t, setLang } = useLang();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    // Supabase answers in English. The wrong-password case is the one the shop
    // will actually hit, so say that much in their language.
    if (error) {
      setErr(/invalid login credentials/i.test(error.message) ? t.badLogin : error.message);
      setBusy(false);
      return;
    }
    router.replace('/orders');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="serif text-2xl">Mr. Big Belly · Admin</h1>
          {/* The switch lives here too, or a stand-in cannot read the sign-in screen. */}
          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="shrink-0 rounded-full border border-rule bg-white px-2.5 py-1.5 text-xs text-ink-2"
            aria-label={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            {lang === 'th' ? 'EN' : 'ไทย'}
          </button>
        </div>
        <p className="text-ink-3 text-sm">{t.signInBlurb}</p>
        <div>
          <label className="text-sm text-ink-2">{t.email}</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
        </div>
        <div>
          <label className="text-sm text-ink-2">{t.password}</label>
          <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)}
            className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
        </div>
        {err && <div className="text-sm text-accent">{err}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
          {busy ? t.signingIn : t.signIn}
        </button>
      </form>
    </main>
  );
}
