import { TestBed } from '@angular/core/testing';
import { TemplateCustomizationService } from './template-customization.service';
import {
  WorkflowTemplate,
  TemplateCustomization,
  TemplateStep
} from '../models/template.models';

describe('TemplateCustomizationService', () => {
  let service: TemplateCustomizationService;

  const mockTemplate: WorkflowTemplate = {
    id: 'template1',
    name: 'Test Template',
    description: 'A test template',
    version: '1.0.0',
    category: 'standard',
    workflowType: 'job',
    author: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    isPublic: true,
    usageCount: 10,
    rating: 4.5,
    steps: [
      {
        id: 'step1',
        name: 'Step 1',
        description: 'First step',
        order: 0,
        component: 'StepComponent',
        defaultValues: { field1: 'value1' },
        validations: []
      },
      {
        id: 'step2',
        name: 'Step 2',
        description: 'Second step',
        order: 1,
        component: 'StepComponent2',
        defaultValues: {},
        validations: []
      }
    ],
    configuration: {
      allowCustomization: true,
      requiredFields: ['step1'],
      optionalFields: ['step2'],
      defaultValues: {},
      validations: [],
      permissions: []
    },
    metadata: {}
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TemplateCustomizationService]
    });
    service = TestBed.inject(TemplateCustomizationService);
  });

  describe('validateTemplateCustomization', () => {
    it('should validate empty customizations', () => {
      const customizations = service.createEmptyCustomization('template1');
      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject removal of required steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: ['step1'],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_STEP_REMOVED')).toBe(true);
    });

    it('should allow removal of optional steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: ['step2'],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(true);
    });

    it('should validate added steps have required fields', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [{
          id: '',
          name: '',
          description: '',
          order: 2,
          component: '',
          defaultValues: {},
          validations: []
        }],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ADDED_STEP')).toBe(true);
    });

    it('should accept valid added steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [{
          id: 'step3',
          name: 'Step 3',
          description: 'Third step',
          order: 2,
          component: 'StepComponent3',
          defaultValues: {},
          validations: []
        }],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(true);
    });

    it('should detect duplicate step IDs in added steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [{
          id: 'step1',
          name: 'Duplicate Step',
          description: 'Test',
          order: 2,
          component: 'Component',
          defaultValues: {},
          validations: []
        }],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_STEP_ID')).toBe(true);
    });

    it('should reject modifications to non-existent steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map([['nonexistent', { name: 'Modified' }]])
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STEP_NOT_FOUND')).toBe(true);
    });

    it('should accept valid step modifications', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map([['step2', { name: 'Modified Step 2' }]])
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(true);
    });

    it('should reject removal of required fields from required steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map([['step1', { name: '' }]])
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD_REMOVED')).toBe(true);
    });

    it('should validate step order in added steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [{
          id: 'step3',
          name: 'Step 3',
          description: 'Test',
          order: -1,
          component: 'Component',
          defaultValues: {},
          validations: []
        }],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_STEP_ORDER')).toBe(true);
    });
  });

  describe('applyCustomizations', () => {
    it('should apply customizations without mutating original template', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: { field1: 'newValue' },
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const originalStepCount = mockTemplate.steps.length;
      const customized = service.applyCustomizations(mockTemplate, customizations);
      
      // Original template should be unchanged
      expect(mockTemplate.steps.length).toBe(originalStepCount);
      
      // Customized template should have overrides applied
      expect(customized.configuration.defaultValues['field1']).toBe('newValue');
    });

    it('should remove steps from customized template', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: ['step2'],
        modifiedSteps: new Map()
      };

      const customized = service.applyCustomizations(mockTemplate, customizations);
      
      expect(customized.steps.length).toBe(1);
      expect(customized.steps.find(s => s.id === 'step2')).toBeUndefined();
    });

    it('should add steps to customized template', () => {
      const newStep: TemplateStep = {
        id: 'step3',
        name: 'Step 3',
        description: 'Third step',
        order: 2,
        component: 'StepComponent3',
        defaultValues: {},
        validations: []
      };

      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [newStep],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const customized = service.applyCustomizations(mockTemplate, customizations);
      
      expect(customized.steps.length).toBe(3);
      expect(customized.steps.find(s => s.id === 'step3')).toBeDefined();
    });

    it('should modify steps in customized template', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map([['step1', { name: 'Modified Step 1' }]])
      };

      const customized = service.applyCustomizations(mockTemplate, customizations);
      
      const modifiedStep = customized.steps.find(s => s.id === 'step1');
      expect(modifiedStep?.name).toBe('Modified Step 1');
    });

    it('should sort steps by order after customization', () => {
      const newStep: TemplateStep = {
        id: 'step0',
        name: 'Step 0',
        description: 'First step',
        order: -1,
        component: 'StepComponent0',
        defaultValues: {},
        validations: []
      };

      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [newStep],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const customized = service.applyCustomizations(mockTemplate, customizations);
      
      expect(customized.steps[0].id).toBe('step0');
      expect(customized.steps[0].order).toBe(-1);
    });
  });

  describe('addStep', () => {
    it('should add a step to customizations', () => {
      const customizations = service.createEmptyCustomization('template1');
      const newStep: TemplateStep = {
        id: 'step3',
        name: 'Step 3',
        description: 'Test',
        order: 2,
        component: 'Component',
        defaultValues: {},
        validations: []
      };

      const updated = service.addStep(customizations, newStep);
      
      expect(updated.addedSteps.length).toBe(1);
      expect(updated.addedSteps[0].id).toBe('step3');
    });
  });

  describe('removeStep', () => {
    it('should add a step ID to removed steps', () => {
      const customizations = service.createEmptyCustomization('template1');
      const updated = service.removeStep(customizations, 'step2');
      
      expect(updated.removedSteps.length).toBe(1);
      expect(updated.removedSteps[0]).toBe('step2');
    });
  });

  describe('modifyStep', () => {
    it('should add step modifications to customizations', () => {
      const customizations = service.createEmptyCustomization('template1');
      const updated = service.modifyStep(customizations, 'step1', { name: 'Modified' });
      
      expect(updated.modifiedSteps.size).toBe(1);
      expect(updated.modifiedSteps.get('step1')?.name).toBe('Modified');
    });

    it('should merge multiple modifications to the same step', () => {
      let customizations = service.createEmptyCustomization('template1');
      customizations = service.modifyStep(customizations, 'step1', { name: 'Modified' });
      customizations = service.modifyStep(customizations, 'step1', { description: 'New description' });
      
      const modifications = customizations.modifiedSteps.get('step1');
      expect(modifications?.name).toBe('Modified');
      expect(modifications?.description).toBe('New description');
    });
  });

  describe('mergeCustomizations', () => {
    it('should merge multiple customizations', () => {
      const base = service.createEmptyCustomization('template1');
      
      const custom1: TemplateCustomization = {
        templateId: 'template1',
        overrides: { field1: 'value1' },
        addedSteps: [],
        removedSteps: ['step2'],
        modifiedSteps: new Map()
      };

      const custom2: TemplateCustomization = {
        templateId: 'template1',
        overrides: { field2: 'value2' },
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map([['step1', { name: 'Modified' }]])
      };

      const merged = service.mergeCustomizations(base, custom1, custom2);
      
      expect(merged.overrides['field1']).toBe('value1');
      expect(merged.overrides['field2']).toBe('value2');
      expect(merged.removedSteps).toContain('step2');
      expect(merged.modifiedSteps.get('step1')?.name).toBe('Modified');
    });

    it('should avoid duplicate added steps', () => {
      const base = service.createEmptyCustomization('template1');
      
      const newStep: TemplateStep = {
        id: 'step3',
        name: 'Step 3',
        description: 'Test',
        order: 2,
        component: 'Component',
        defaultValues: {},
        validations: []
      };

      const custom1: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [newStep],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const custom2: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [newStep],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const merged = service.mergeCustomizations(base, custom1, custom2);
      
      expect(merged.addedSteps.length).toBe(1);
    });
  });

  describe('createEmptyCustomization', () => {
    it('should create an empty customization object', () => {
      const customization = service.createEmptyCustomization('template1');
      
      expect(customization.templateId).toBe('template1');
      expect(customization.overrides).toEqual({});
      expect(customization.addedSteps).toEqual([]);
      expect(customization.removedSteps).toEqual([]);
      expect(customization.modifiedSteps.size).toBe(0);
    });
  });
});
