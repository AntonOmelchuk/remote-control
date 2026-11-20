import { requireOptionalNativeModule } from 'expo';

type RemoteLinkModule = {
  prepare(code: string, name: string): Promise<string>;
  pair(): Promise<string>;
  saved(): Promise<string | null>;
  verifySaved(): Promise<string>;
  forget(): Promise<void>;
  cancel(): Promise<void>;
};

// Expo Go and older development builds keep the existing preview available.
export const remoteLink = requireOptionalNativeModule<RemoteLinkModule>('RemoteLink');
