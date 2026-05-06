import { Component } from '@angular/core';

@Component({
  selector: 'app-quote-assembly',
  templateUrl: './quote-assembly.component.html',
  styleUrls: ['./quote-assembly.component.scss']
})
export class QuoteAssemblyComponent {
  sections = [
    { name: 'Labor', value: 4500 },
    { name: 'Materials', value: 3200 },
    { name: 'Travel', value: 800 },
    { name: 'Overhead', value: 600 }
  ];
  markupPercent = 15;

  get subtotal(): number {
    return this.sections.reduce((sum, s) => sum + s.value, 0);
  }

  get markupAmount(): number {
    return this.subtotal * (this.markupPercent / 100);
  }

  get totalValue(): number {
    return this.subtotal + this.markupAmount;
  }

  generatePdf(): void {
    console.log('Generating PDF for quote assembly...');
    alert('PDF generation coming soon.');
  }
}
