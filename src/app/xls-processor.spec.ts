import { TestBed } from '@angular/core/testing';

import { XlsProcessor } from './xls-processor';

describe('XlsProcessor', () => {
  let service: XlsProcessor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(XlsProcessor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
