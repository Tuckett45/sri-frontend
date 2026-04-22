import { Component, Input } from '@angular/core';
import { WorkflowTemplate } from '../../models/template.models';

/**
 * Template Metadata Component
 * 
 * Displays template metadata including name, description, author, version,
 * usage count, ratings, and category organization
 * Requirements: 10.2
 */
@Component({
  selector: 'app-template-metadata',
  templateUrl: './template-metadata.component.html',
  styleUrls: ['./template-metadata.component.scss']
})
export class TemplateMetadataComponent {
  @Input() template!: WorkflowTemplate;
  @Input() compact: boolean = false;
  @Input() showFullDescription: boolean = false;

  /**
   * Get star rating array for display
   */
  getStarRating(): number[] {
    const fullStars = Math.floor(this.template.rating);
    return Array(5).fill(0).map((_, i) => {
      if (i < fullStars) return 1; // Full star
      if (i === fullStars && this.template.rating % 1 >= 0.5) return 0.5; // Half star
      return 0; // Empty star
    });
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get truncated description
   */
  getTruncatedDescription(maxLength: number = 150): string {
    if (this.showFullDescription || this.template.description.length <= maxLength) {
      return this.template.description;
    }
    return this.template.description.substring(0, maxLength) + '...';
  }

  /**
   * Format usage count with abbreviation
   */
  formatUsageCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  /**
   * Get category badge color
   */
  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'job': '#4a90e2',
      'deployment': '#28a745',
      'workflow': '#ffc107',
      'custom': '#9c27b0',
      'default': '#6c757d'
    };
    return colors[category] || colors['default'];
  }

  /**
   * Get rating color based on value
   */
  getRatingColor(rating: number): string {
    if (rating >= 4.5) return '#28a745'; // Green
    if (rating >= 3.5) return '#ffc107'; // Yellow
    if (rating >= 2.5) return '#ff9800'; // Orange
    return '#f44336'; // Red
  }

  /**
   * Check if template is popular (high usage)
   */
  isPopular(): boolean {
    return this.template.usageCount >= 100;
  }

  /**
   * Check if template is highly rated
   */
  isHighlyRated(): boolean {
    return this.template.rating >= 4.5;
  }

  /**
   * Check if template is new (created within last 30 days)
   */
  isNew(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(this.template.createdAt) > thirtyDaysAgo;
  }

  /**
   * Get template badges
   */
  getBadges(): string[] {
    const badges: string[] = [];
    if (this.isNew()) badges.push('New');
    if (this.isPopular()) badges.push('Popular');
    if (this.isHighlyRated()) badges.push('Top Rated');
    if (this.template.isPublic) badges.push('Public');
    return badges;
  }
}
