import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { SharedModule } from '../../../shared/shared.module';

// Components
import { TemplateSelectorComponent } from './components/template-selector/template-selector.component';
import { TemplateMetadataComponent } from './components/template-metadata/template-metadata.component';

// Services
import { TemplateEngineService } from './services/template-engine.service';
import { TemplateCustomizationService } from './services/template-customization.service';

// State
import { workflowTemplatesReducer } from './state/workflow-templates/workflow-templates.reducer';
import { WorkflowTemplatesEffects } from './state/workflow-templates/workflow-templates.effects';

/**
 * Phase 4 Module
 * 
 * Module for workflow template switching functionality
 * Requirements: 10.1-10.6, 11.1-11.7, 12.1-12.6
 */
@NgModule({
  declarations: [
    TemplateSelectorComponent,
    TemplateMetadataComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    StoreModule.forFeature('workflowTemplates', workflowTemplatesReducer),
    EffectsModule.forFeature([WorkflowTemplatesEffects])
  ],
  providers: [
    TemplateEngineService,
    TemplateCustomizationService
  ],
  exports: [
    TemplateSelectorComponent,
    TemplateMetadataComponent
  ]
})
export class Phase4Module { }
