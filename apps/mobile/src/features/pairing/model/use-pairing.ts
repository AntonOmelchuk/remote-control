import { remoteLink } from '@remote-control/remote-link';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { readPairedMac, readPreparation } from './native-summary';
import type { PairedMacSummary, PairingPreparation } from './native-summary';

type Phase = 'idle' | 'scanning' | 'waiting' | 'verifying' | 'paired' | 'verified' | 'error';

export function usePairing() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [saved, setSaved] = useState<PairedMacSummary | null>(null);
  const [preparation, setPreparation] = useState<PairingPreparation | null>(null);
  const sequence = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    let mounted = true;
    const restoreSaved = () => {
      const request = sequence.current;
      void remoteLink
        ?.saved()
        .then((value) => {
          if (mounted && request === sequence.current && !busy.current) {
            setSaved(value ? readPairedMac(value) : null);
          }
        })
        .catch(() => {
          if (mounted && request === sequence.current && !busy.current) setPhase('error');
        });
    };
    restoreSaved();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        restoreSaved();
        return;
      }
      if (state !== 'background') return;
      sequence.current += 1;
      busy.current = false;
      void remoteLink?.cancel();
      setPreparation(null);
      setPhase('idle');
    });
    return () => {
      mounted = false;
      sequence.current += 1;
      subscription.remove();
      void remoteLink?.cancel();
    };
  }, []);

  async function scan(code: string) {
    if (!remoteLink || busy.current) return;
    busy.current = true;
    const request = ++sequence.current;
    setPhase('waiting');
    try {
      const prepared = readPreparation(await remoteLink.prepare(code, 'iPhone'));
      if (request !== sequence.current) return;
      setPreparation(prepared);
      const result = readPairedMac(await remoteLink.pair());
      if (request !== sequence.current) return;
      setSaved(result);
      setPhase('paired');
    } catch {
      if (request !== sequence.current) return;
      try {
        const stored = await remoteLink.saved();
        if (request === sequence.current) setSaved(stored ? readPairedMac(stored) : null);
      } catch {
        // The same error UI also covers an unreadable Keychain item.
      }
      if (request === sequence.current) setPhase('error');
    } finally {
      if (request === sequence.current) busy.current = false;
    }
  }

  async function verify() {
    if (!remoteLink || busy.current) return;
    busy.current = true;
    const request = ++sequence.current;
    setPhase('verifying');
    try {
      const result = readPairedMac(await remoteLink.verifySaved());
      if (request !== sequence.current) return;
      setSaved(result);
      setPhase('verified');
    } catch {
      if (request === sequence.current) setPhase('error');
    } finally {
      if (request === sequence.current) busy.current = false;
    }
  }

  async function forget() {
    if (!remoteLink || busy.current) return;
    const request = ++sequence.current;
    busy.current = true;
    try {
      await remoteLink.forget();
      if (request !== sequence.current) return;
      setSaved(null);
      setPreparation(null);
      setPhase('idle');
    } catch {
      if (request === sequence.current) setPhase('error');
    } finally {
      if (request === sequence.current) busy.current = false;
    }
  }

  function cancel() {
    sequence.current += 1;
    busy.current = false;
    void remoteLink?.cancel();
    setPreparation(null);
    setPhase('idle');
  }

  function cameraFailed() {
    cancel();
    setPhase('error');
  }

  function startScan() {
    cancel();
    setPhase('scanning');
  }

  return {
    available: remoteLink !== null,
    phase,
    saved,
    preparation,
    scan,
    verify,
    forget,
    cancel,
    startScan,
    cameraFailed,
  };
}
