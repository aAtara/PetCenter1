import { TestBed } from '@angular/core/testing';

import { Datos } from './datos';

describe('Datos', () => {
  let service: Datos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Datos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
