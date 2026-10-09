'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useLang } from '@/lib/i18n';
import { chime, notify, unlockAudio } from '@/lib/alarm';

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const { lang, t, setLang } = useLang();
  const [pending, setPending] = useState(0);

  // A reward request is a customer standing still, waiting on an answer, so the
  // count follows the admin around rather than living on one screen.
  useEffect(() => {
    const sb = supabaseBrowser();
    const count = async () => {
      const { count: n } = await sb.from('redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPending(n ?? 0);
    };
    void count();
    const ch = sb.channel('redemption-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'redemptions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          chime();
          notify(t.requests, t.newRequestsBadge(1));
        }
        void count();
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [t]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const tabs = [
    { href: '/orders', label: t.orders },
    { href: '/menu', label: t.menu },
    { href: '/members', label: t.members },
    { href: '/rewards', label: t.rewardsTab },
    { href: '/requests', label: t.requests, badge: pending },
    { href: '/reports', label: t.reports },
    { href: '/settings', label: t.settings },
  ];

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-rule">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
        <div className="serif text-lg shrink-0 hidden sm:block">Mr. Big Belly</div>
        <nav className="flex gap-1 flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                path.startsWith(tab.href) ? 'bg-accent text-white' : 'text-ink-2 hover:bg-white'
              }`}>
              {tab.label}
              {Boolean(tab.badge) && (
                <span className="pulse-dot rounded-full bg-gold text-white text-[11px] leading-none px-1.5 py-0.5">
                  {tab.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className="shrink-0 rounded-full border border-rule bg-white px-2.5 py-1.5 text-xs text-ink-2"
          aria-label={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
        >
          {lang === 'th' ? 'EN' : 'ไทย'}
        </button>
        <button onClick={signOut} className="shrink-0 text-ink-3 text-xs underline">{t.signOut}</button>
      </div>
    </header>
  );
}
