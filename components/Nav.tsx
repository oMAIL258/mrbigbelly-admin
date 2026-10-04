'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

const TABS = [
  { href: '/orders', label: 'Orders' },
  { href: '/menu', label: 'Menu' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace('/login');
  }
  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-rule">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4">
        <div className="serif text-lg">Mr. Big Belly · Admin</div>
        <nav className="flex gap-1 flex-1">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href}
              className={`rounded-full px-3 py-1.5 text-sm ${path.startsWith(t.href) ? 'bg-accent text-white' : 'text-ink-2 hover:bg-white'}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="text-ink-3 text-xs underline">Sign out</button>
      </div>
    </header>
  );
}
