'use client';
import { useEffect } from 'react';
import { registerWorker } from '@/lib/alarm';

export function Worker() {
  useEffect(() => { registerWorker(); }, []);
  return null;
}
