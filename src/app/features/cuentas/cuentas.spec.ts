import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cuentas } from './cuentas';

describe('Cuentas', () => {
  let component: Cuentas;
  let fixture: ComponentFixture<Cuentas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cuentas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cuentas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
