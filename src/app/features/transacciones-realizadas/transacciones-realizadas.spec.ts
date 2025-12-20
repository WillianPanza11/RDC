import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransaccionesRealizadas } from './transacciones-realizadas';

describe('TransaccionesRealizadas', () => {
  let component: TransaccionesRealizadas;
  let fixture: ComponentFixture<TransaccionesRealizadas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransaccionesRealizadas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransaccionesRealizadas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
