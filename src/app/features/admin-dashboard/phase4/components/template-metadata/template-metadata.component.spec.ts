import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplateMetadataComponent } from './template-metadata.component';
import { WorkflowTemplate } from '../../models/template.models';

describe('TemplateMetadataComponent', () => {
  let component: TemplateMetadataComponent;
  let fixture: ComponentFixture<TemplateMetadataComponent>;

  const mockTemplate: WorkflowTemplate = {
    id: 'template-1',
    name: 'Test Template',
    description: 'This is a test template description that is long enough to test truncation functionality',
    version: '1.2.3',
    category: 'job',
    workflowType: 'job',
    author: 'Test Author',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-15'),
    isPublic: true,
    usageCount: 1250,
    rating: 4.7,
    steps: [
      { id: '1', name: 'Step 1', description: '', order: 1, component: '', defaultValues: {}, validations: [] },
      { id: '2', name: 'Step 2', description: '', order: 2, component: '', defaultValues: {}, validations: [] }
    ],
    configuration: {
      allowCustomization: true,
      requiredFields: [],
      optionalFields: [],
      defaultValues: {},
      validations: [],
      permissions: []
    },
    metadata: {
      tags: ['test', 'sample'],
      industry: 'Technology',
      complexity: 'medium'
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TemplateMetadataComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateMetadataComponent);
    component = fixture.componentInstance;
    component.template = mockTemplate;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Template Display', () => {
    it('should display template name', () => {
      expect(component.template.name).toBe('Test Template');
    });

    it('should display template version', () => {
      expect(component.template.version).toBe('1.2.3');
    });

    it('should display template author', () => {
      expect(component.template.author).toBe('Test Author');
    });

    it('should display template category', () => {
      expect(component.template.category).toBe('job');
    });

    it('should display usage count', () => {
      expect(component.template.usageCount).toBe(1250);
    });

    it('should display rating', () => {
      expect(component.template.rating).toBe(4.7);
    });
  });

  describe('Star Rating', () => {
    it('should generate correct star rating array for 4.7', () => {
      const stars = component.getStarRating();
      expect(stars).toEqual([1, 1, 1, 1, 0.5]);
    });

    it('should generate correct star rating array for 5.0', () => {
      component.template.rating = 5.0;
      const stars = component.getStarRating();
      expect(stars).toEqual([1, 1, 1, 1, 1]);
    });

    it('should generate correct star rating array for 3.2', () => {
      component.template.rating = 3.2;
      const stars = component.getStarRating();
      expect(stars).toEqual([1, 1, 1, 0, 0]);
    });

    it('should generate correct star rating array for 2.5', () => {
      component.template.rating = 2.5;
      const stars = component.getStarRating();
      expect(stars).toEqual([1, 1, 0.5, 0, 0]);
    });
  });

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const formatted = component.formatDate(new Date('2024-01-15'));
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });

  describe('Description Truncation', () => {
    it('should truncate long description', () => {
      const truncated = component.getTruncatedDescription(50);
      expect(truncated.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(truncated).toContain('...');
    });

    it('should not truncate short description', () => {
      component.template.description = 'Short description';
      const truncated = component.getTruncatedDescription(50);
      expect(truncated).toBe('Short description');
      expect(truncated).not.toContain('...');
    });

    it('should return full description when showFullDescription is true', () => {
      component.showFullDescription = true;
      const full = component.getTruncatedDescription(10);
      expect(full).toBe(component.template.description);
      expect(full).not.toContain('...');
    });
  });

  describe('Usage Count Formatting', () => {
    it('should format count less than 1000 as is', () => {
      expect(component.formatUsageCount(500)).toBe('500');
    });

    it('should format count in thousands with K', () => {
      expect(component.formatUsageCount(1500)).toBe('1.5K');
      expect(component.formatUsageCount(25000)).toBe('25.0K');
    });

    it('should format count in millions with M', () => {
      expect(component.formatUsageCount(1500000)).toBe('1.5M');
      expect(component.formatUsageCount(3200000)).toBe('3.2M');
    });
  });

  describe('Category Color', () => {
    it('should return correct color for job category', () => {
      expect(component.getCategoryColor('job')).toBe('#4a90e2');
    });

    it('should return correct color for deployment category', () => {
      expect(component.getCategoryColor('deployment')).toBe('#28a745');
    });

    it('should return correct color for workflow category', () => {
      expect(component.getCategoryColor('workflow')).toBe('#ffc107');
    });

    it('should return default color for unknown category', () => {
      expect(component.getCategoryColor('unknown')).toBe('#6c757d');
    });
  });

  describe('Rating Color', () => {
    it('should return green for rating >= 4.5', () => {
      expect(component.getRatingColor(4.7)).toBe('#28a745');
      expect(component.getRatingColor(5.0)).toBe('#28a745');
    });

    it('should return yellow for rating >= 3.5 and < 4.5', () => {
      expect(component.getRatingColor(4.0)).toBe('#ffc107');
      expect(component.getRatingColor(3.5)).toBe('#ffc107');
    });

    it('should return orange for rating >= 2.5 and < 3.5', () => {
      expect(component.getRatingColor(3.0)).toBe('#ff9800');
      expect(component.getRatingColor(2.5)).toBe('#ff9800');
    });

    it('should return red for rating < 2.5', () => {
      expect(component.getRatingColor(2.0)).toBe('#f44336');
      expect(component.getRatingColor(1.5)).toBe('#f44336');
    });
  });

  describe('Template Status Checks', () => {
    it('should identify popular template', () => {
      component.template.usageCount = 150;
      expect(component.isPopular()).toBe(true);
    });

    it('should identify non-popular template', () => {
      component.template.usageCount = 50;
      expect(component.isPopular()).toBe(false);
    });

    it('should identify highly rated template', () => {
      component.template.rating = 4.7;
      expect(component.isHighlyRated()).toBe(true);
    });

    it('should identify non-highly rated template', () => {
      component.template.rating = 4.0;
      expect(component.isHighlyRated()).toBe(false);
    });

    it('should identify new template', () => {
      const today = new Date();
      component.template.createdAt = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      expect(component.isNew()).toBe(true);
    });

    it('should identify old template', () => {
      const today = new Date();
      component.template.createdAt = new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      expect(component.isNew()).toBe(false);
    });
  });

  describe('Badges', () => {
    it('should include New badge for new templates', () => {
      const today = new Date();
      component.template.createdAt = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);
      const badges = component.getBadges();
      expect(badges).toContain('New');
    });

    it('should include Popular badge for popular templates', () => {
      component.template.usageCount = 150;
      const badges = component.getBadges();
      expect(badges).toContain('Popular');
    });

    it('should include Top Rated badge for highly rated templates', () => {
      component.template.rating = 4.7;
      const badges = component.getBadges();
      expect(badges).toContain('Top Rated');
    });

    it('should include Public badge for public templates', () => {
      component.template.isPublic = true;
      const badges = component.getBadges();
      expect(badges).toContain('Public');
    });

    it('should return multiple badges when applicable', () => {
      const today = new Date();
      component.template.createdAt = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);
      component.template.usageCount = 150;
      component.template.rating = 4.7;
      component.template.isPublic = true;
      
      const badges = component.getBadges();
      expect(badges.length).toBe(4);
      expect(badges).toContain('New');
      expect(badges).toContain('Popular');
      expect(badges).toContain('Top Rated');
      expect(badges).toContain('Public');
    });

    it('should return empty array when no badges apply', () => {
      const today = new Date();
      component.template.createdAt = new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000);
      component.template.usageCount = 50;
      component.template.rating = 3.0;
      component.template.isPublic = false;
      
      const badges = component.getBadges();
      expect(badges.length).toBe(0);
    });
  });

  describe('Compact Mode', () => {
    it('should apply compact class when compact is true', () => {
      component.compact = true;
      fixture.detectChanges();
      const element = fixture.nativeElement.querySelector('.template-metadata');
      expect(element.classList.contains('compact')).toBe(true);
    });

    it('should not apply compact class when compact is false', () => {
      component.compact = false;
      fixture.detectChanges();
      const element = fixture.nativeElement.querySelector('.template-metadata');
      expect(element.classList.contains('compact')).toBe(false);
    });
  });
});
