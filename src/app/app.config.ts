import {ApplicationConfig, inject, provideAppInitializer, provideZonelessChangeDetection} from '@angular/core';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import {MatIconRegistry} from '@angular/material/icon';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => {
      const iconRegistry = inject(MatIconRegistry);
      const defaultFontSetClasses = iconRegistry.getDefaultFontSetClass();
      const outlinedFontSetClasses = defaultFontSetClasses
        .filter((fontSetClass) => fontSetClass !== 'material-icons')
        .concat(['material-symbols-rounded']);
      iconRegistry.setDefaultFontSetClass(...outlinedFontSetClasses);
    })
  ]
};
