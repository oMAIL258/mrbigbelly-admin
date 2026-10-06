'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useLang } from '@/lib/i18n';

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const { lang, t, setLang } = useLang();

  const tabs = [
    { href: '/orders', label: t.orders },
    { href: '/menu', label: t.menu },
    { href: '/reports', label: t.reports },
    { href: '/settings', label: t.settings },
  ];

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-rule">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4">
        <div className="serif text-lg shrink-0">Mr. Big Belly · Admin</div>
        <nav className="flex gap-1 flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${path.startsWith(tab.href) ? 'bg-accent text-white' : 'text-ink-2 hover:bg-white'}`}>
              {tab.label}
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
