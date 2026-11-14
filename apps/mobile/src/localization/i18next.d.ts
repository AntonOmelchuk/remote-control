import 'i18next';

import type { en } from './resources/en';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    keySeparator: false;
    returnNull: false;
    strictKeyChecks: true;
    resources: { translation: typeof en };
  }
}
