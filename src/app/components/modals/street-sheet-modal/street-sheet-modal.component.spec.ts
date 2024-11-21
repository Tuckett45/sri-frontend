import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreetSheetModalComponent } from './street-sheet-modal.component';

describe('StreetSheetModalComponent', () => {
  let component: StreetSheetModalComponent;
  let fixture: ComponentFixture<StreetSheetModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreetSheetModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StreetSheetModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
