'use client';
import { useEffect } from 'react';
import { useStore } from './StoreProvider';

export function ClearCartOnPaid() {
  const { clear } = useStore();
  useEffect(() => { clear(); }, [clear]);
  return null;
}
