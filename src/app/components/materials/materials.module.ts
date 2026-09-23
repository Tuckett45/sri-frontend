import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { MaterialsComponent } from './materials.component';
import { MaterialsRoutingModule } from './materials-routing.module';

@NgModule({
  declarations: [
    MaterialsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ZXingScannerModule,
    MaterialsRoutingModule
  ],
  exports: [MaterialsComponent]
})
export class MaterialsModule { }
