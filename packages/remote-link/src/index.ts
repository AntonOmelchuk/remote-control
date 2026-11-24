import { requireOptionalNativeModule } from 'expo';

type RemoteLinkModule = {
  readonly audioAPIVersion?: number;
  readonly mediaAPIVersion?: number;
  readonly timerAPIVersion?: number;
  startSleepTimer(
    owner: string,
    selectionID: string,
    minutes: number,
    expectedTimerID: string | null,
  ): Promise<string>;
  cancelSleepTimer(owner: string, timerID: string): Promise<string>;
  setPlayback(owner: string, targetID: string, paused: boolean): Promise<string>;
  connectAudio(owner: string): Promise<string>;
  audioStatus(owner: string): Promise<string>;
  setAudioVolume(owner: string, outputID: string, volume: number): Promise<string>;
  setAudioMuted(owner: string, outputID: string, muted: boolean): Promise<string>;
  disconnectAudio(owner: string): Promise<void>;
  prepare(code: string, name: string): Promise<string>;
  pair(): Promise<string>;
  saved(): Promise<string | null>;
  verifySaved(): Promise<string>;
  forget(): Promise<void>;
  cancel(): Promise<void>;
};

// Expo Go and older development builds keep the existing preview available.
export const remoteLink = requireOptionalNativeModule<RemoteLinkModule>('RemoteLink');

export const remoteAudioAvailable = remoteLink?.audioAPIVersion === 1;

export const remoteMediaAvailable = remoteLink?.mediaAPIVersion === 1;

export const remoteTimerAvailable = remoteLink?.timerAPIVersion === 1;
