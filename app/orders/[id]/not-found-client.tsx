'use client';
import { useLang } from '@/lib/i18n';

export function NotFound() {
  const { t } = useLang();
  return <main className="p-6 text-ink-3">{t.notFound}</main>;
}
