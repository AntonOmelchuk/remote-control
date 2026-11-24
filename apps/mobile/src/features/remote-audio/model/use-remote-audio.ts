import {
  remoteAudioAvailable,
  remoteMediaAvailable,
  remoteTimerAvailable,
  remoteLink,
} from '@remote-control/remote-link';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { mergeAudioStatus, readAudioStatus } from './audio-state';
import type { AudioStatus } from './audio-state';

let nextOwner = 0;
type Phase = 'idle' | 'connecting' | 'connected' | 'disconnected';

export function useRemoteAudio() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState<AudioStatus | null>(null);
  const [writing, setWriting] = useState(false);
  const currentOwner = useRef<string | null>(null);
  const busy = useRef(false);
  const focused = useRef(false);
  const background = useRef(false);

  const disconnect = useCallback(() => {
    const owner = currentOwner.current;
    currentOwner.current = null;
    busy.current = false;
    if (owner) void remoteLink?.disconnectAudio(owner).catch(() => undefined);
    setStatus(null);
    setWriting(false);
    setPhase('disconnected');
  }, []);

  const apply = useCallback((text: string, owner: string) => {
    if (currentOwner.current !== owner) return;
    const incoming = readAudioStatus(text, owner);
    setStatus((previous) => mergeAudioStatus(previous, incoming));
  }, []);

  const connect = useCallback(async () => {
    if (
      !remoteAudioAvailable ||
      !remoteLink ||
      currentOwner.current ||
      !focused.current ||
      background.current
    )
      return;
    const owner = `remote-audio-${Date.now()}-${++nextOwner}-${Math.random().toString(36).slice(2)}`;
    currentOwner.current = owner;
    busy.current = true;
    setStatus(null);
    setPhase('connecting');
    try {
      const result = await remoteLink.connectAudio(owner);
      if (currentOwner.current !== owner) return;
      apply(result, owner);
      setPhase('connected');
    } catch {
      if (currentOwner.current === owner) disconnect();
    } finally {
      if (currentOwner.current === owner) busy.current = false;
    }
  }, [apply, disconnect]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      background.current = AppState.currentState === 'background';
      // A fresh session always reads confirmed state; a failed write is never replayed.
      void connect();
      const subscription = AppState.addEventListener('change', (state) => {
        background.current = state === 'background';
        if (background.current) disconnect();
      });
      let reading = false;
      const poll = setInterval(() => {
        const owner = currentOwner.current;
        if (!owner || busy.current || reading || !remoteLink) return;
        reading = true;
        // This reads a native cache. Network snapshots arrive on the native WebSocket receiver.
        void remoteLink
          .audioStatus(owner)
          .then((result) => apply(result, owner))
          .catch(() => {
            if (currentOwner.current === owner) disconnect();
          })
          .finally(() => {
            reading = false;
          });
      }, 500);
      return () => {
        focused.current = false;
        subscription.remove();
        clearInterval(poll);
        disconnect();
      };
    }, [apply, connect, disconnect]),
  );

  const submit = useCallback(
    async (invoke: (api: NonNullable<typeof remoteLink>, owner: string) => Promise<string>) => {
      const owner = currentOwner.current;
      if (!owner || !remoteLink || busy.current || phase !== 'connected') return;
      busy.current = true;
      setWriting(true);
      try {
        const result = await invoke(remoteLink, owner);
        apply(result, owner);
      } catch {
        // The outcome may be unknown. Reconnect only by explicit user action and read a fresh snapshot.
        if (currentOwner.current === owner) disconnect();
      } finally {
        if (currentOwner.current === owner) {
          busy.current = false;
          setWriting(false);
        }
      }
    },
    [apply, disconnect, phase],
  );
  const setVolume = useCallback(
    (outputID: string, volume: number) =>
      submit((api, owner) => api.setAudioVolume(owner, outputID, volume)),
    [submit],
  );
  const setMuted = useCallback(
    (outputID: string, muted: boolean) =>
      submit((api, owner) => api.setAudioMuted(owner, outputID, muted)),
    [submit],
  );

  const setPlayback = useCallback(
    (targetID: string, paused: boolean) => {
      if (!remoteMediaAvailable) return Promise.resolve();
      return submit((api, owner) => api.setPlayback(owner, targetID, paused));
    },
    [submit],
  );

  const startSleepTimer = useCallback(
    (selectionID: string, minutes: number, expectedTimerID: string | null) => {
      if (!remoteTimerAvailable) return Promise.resolve();
      return submit((api, owner) =>
        api.startSleepTimer(owner, selectionID, minutes, expectedTimerID),
      );
    },
    [submit],
  );
  const cancelSleepTimer = useCallback(
    (timerID: string) => {
      if (!remoteTimerAvailable) return Promise.resolve();
      return submit((api, owner) => api.cancelSleepTimer(owner, timerID));
    },
    [submit],
  );
  return {
    timerAvailable: remoteTimerAvailable,
    startSleepTimer,
    cancelSleepTimer,
    mediaAvailable: remoteMediaAvailable,
    setPlayback,
    available: remoteAudioAvailable,
    phase,
    status,
    writing,
    connect,
    disconnect,
    setVolume,
    setMuted,
  };
}
