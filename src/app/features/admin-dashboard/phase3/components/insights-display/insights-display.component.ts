import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Insight, InsightMetric } from '../../models/recommendation.models';

/**
 * Insights Display Component
 * 
 * Visualizes AI-generated insights with multiple display modes,
 * chart rendering, and filtering/sorting controls.
 * 
 * **Validates: Requirements 9.1, 9.2, 9.7**
 */
@Component({
  selector: 'app-insights-display',
  templateUrl: './insights-display.component.html',
  styleUrls: ['./insights-display.component.scss']
})
export class InsightsDisplayComponent implements OnInit, OnChanges {
  @Input() insights: Insight[] = [];
  @Input() displayMode: 'cards' | 'list' | 'timeline' = 'cards';
  @Input() showCharts: boolean = true;
  @Output() insightSelected = new EventEmitter<Insight>();

  // Filtering
  filterByCategory: string | null = null;
  filterByPriority: 'info' | 'warning' | 'critical' | null = null;
  searchQuery: string = '';

  // Sorting
  sortBy: 'priority' | 'date' | 'category' = 'priority';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Filtered and sorted insights
  filteredInsights: Insight[] = [];

  // Available categories
  availableCategories: string[] = [];

  ngOnInit(): void {
    this.updateFilteredInsights();
    this.extractCategories();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['insights']) {
      this.updateFilteredInsights();
      this.extractCategories();
    }
  }

  /**
   * Extract unique categories from insights
   */
  private extractCategories(): void {
    const categories = new Set<string>();
    this.insights.forEach(insight => {
      categories.add(insight.category);
    });
    this.availableCategories = Array.from(categories).sort();
  }

  /**
   * Update filtered and sorted insights
   * **Validates: Requirements 9.7**
   */
  updateFilteredInsights(): void {
    let filtered = [...this.insights];

    // Apply category filter
    if (this.filterByCategory) {
      filtered = filtered.filter(insight => insight.category === this.filterByCategory);
    }

    // Apply priority filter
    if (this.filterByPriority) {
      filtered = filtered.filter(insight => insight.severity === this.filterByPriority);
    }

    // Apply search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(insight =>
        insight.title.toLowerCase().includes(query) ||
        insight.description.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = this.sortInsights(filtered);

    this.filteredInsights = filtered;
  }

  /**
   * Sort insights by specified criteria
   * **Validates: Requirements 9.7**
   */
  private sortInsights(insights: Insight[]): Insight[] {
    const sorted = [...insights];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'priority':
          const priorityOrder = { critical: 0, warning: 1, info: 2 };
          comparison = priorityOrder[a.severity] - priorityOrder[b.severity];
          break;

        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;

        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Apply category filter
   * **Validates: Requirements 9.7**
   */
  applyCategoryFilter(category: string | null): void {
    this.filterByCategory = category;
    this.updateFilteredInsights();
  }

  /**
   * Apply priority filter
   * **Validates: Requirements 9.7**
   */
  applyPriorityFilter(priority: 'info' | 'warning' | 'critical' | null): void {
    this.filterByPriority = priority;
    this.updateFilteredInsights();
  }

  /**
   * Apply search query
   */
  applySearch(): void {
    this.updateFilteredInsights();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filterByCategory = null;
    this.filterByPriority = null;
    this.searchQuery = '';
    this.updateFilteredInsights();
  }

  /**
   * Change sort criteria
   */
  changeSortBy(sortBy: 'priority' | 'date' | 'category'): void {
    if (this.sortBy === sortBy) {
      // Toggle direction if same sort field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'desc';
    }
    this.updateFilteredInsights();
  }

  /**
   * Select an insight
   */
  selectInsight(insight: Insight): void {
    this.insightSelected.emit(insight);
  }

  /**
   * Get severity badge class
   */
  getSeverityClass(severity: string): string {
    return `severity-${severity}`;
  }

  /**
   * Get category badge class
   */
  getCategoryClass(category: string): string {
    return `category-${category.toLowerCase().replace(/\s+/g, '-')}`;
  }

  /**
   * Get trend icon
   * **Validates: Requirements 9.2**
   */
  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      case 'stable': return '→';
      default: return '→';
    }
  }

  /**
   * Get trend class
   */
  getTrendClass(trend: 'up' | 'down' | 'stable'): string {
    return `trend-${trend}`;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(date: Date): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Format change percentage
   * **Validates: Requirements 9.2**
   */
  formatChangePercent(changePercent: number): string {
    const sign = changePercent > 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(1)}%`;
  }

  /**
   * Get metric display value
   * **Validates: Requirements 9.2**
   */
  getMetricDisplay(metric: InsightMetric): string {
    return `${metric.value} ${metric.unit}`;
  }

  /**
   * Check if insight has metrics
   */
  hasMetrics(insight: Insight): boolean {
    return insight.metrics && insight.metrics.length > 0;
  }

  /**
   * Check if insight has visualizations
   */
  hasVisualizations(insight: Insight): boolean {
    return insight.visualizations && insight.visualizations.length > 0;
  }

  /**
   * Check if insight has recommendations
   */
  hasRecommendations(insight: Insight): boolean {
    return insight.recommendations && insight.recommendations.length > 0;
  }

  /**
   * Export insights
   */
  exportInsights(format: 'pdf' | 'csv'): void {
    // Implementation would depend on export service
    console.log(`Exporting insights as ${format}`);
  }
}
