import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExpenseRoutingModule } from './expense-routing.module';
import { ExpenseComponent } from './expense.component';
import { ExpenseFormComponent } from './expense-form/expense-form.component';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [ExpenseComponent, ExpenseFormComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ExpenseRoutingModule,
    CalendarModule,
    InputTextModule,
    Textarea,
    TableModule,
    ButtonModule,
    TagModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class ExpenseModule {}
