import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent {
  @Output() onFilterChange = new EventEmitter<string>();

  selectedValue: string = '';

  applyFilter() {
    this.onFilterChange.emit(this.selectedValue);
  }
}