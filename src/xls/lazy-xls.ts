import type { XlsProcessor } from './xls-processor';
import { EnvironmentInjector, inject } from '@angular/core';

export function lazyLoadXlsProcessor(): Promise<XlsProcessor> {
  const injector = inject(EnvironmentInjector);
  return import('./xls-processor').then((m) => injector.get(m.XlsProcessor));
}
