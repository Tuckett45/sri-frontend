import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreetSheetComponent } from './street-sheet.component';

describe('StreetSheetComponent', () => {
  let component: StreetSheetComponent;
  let fixture: ComponentFixture<StreetSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreetSheetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StreetSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
