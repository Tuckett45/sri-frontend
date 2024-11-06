import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreetSheetMapComponent } from './street-sheet-map.component';

describe('StreetSheetMapComponent', () => {
  let component: StreetSheetMapComponent;
  let fixture: ComponentFixture<StreetSheetMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreetSheetMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StreetSheetMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
