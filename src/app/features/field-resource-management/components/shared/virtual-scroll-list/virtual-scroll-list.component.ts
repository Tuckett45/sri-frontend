import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

/**
 * Virtual Scroll List Component
 * 
 * A reusable component that implements virtual scrolling using Angular CDK.
 * Only renders visible items in the viewport for optimal performance with large datasets.
 * 
 * Features:
 * - Renders only visible items (typically 10-20 items at a time)
 * - Smooth scrolling with buffer zones
 * - Configurable item size
 * - Support for dynamic item heights
 * - Memory efficient for lists with 100+ items
 * 
 * Usage:
 * ```html
 * <frm-virtual-scroll-list
 *   [items]="technicians"
 *   [itemSize]="72"
 *   [minBufferPx]="200"
 *   [maxBufferPx]="400"
 *   (itemClick)="onItemClick($event)">
 *   <ng-template let-item>
 *     <!-- Your item template here -->
 *     <div class="list-item">{{ item.name }}</div>
 *   </ng-template>
 * </frm-virtual-scroll-list>
 * ```
 * 
 * Requirements: 14.3
 */
@Component({
  selector: 'frm-virtual-scroll-list',
  template: `
    <cdk-virtual-scroll-viewport
      [itemSize]="itemSize"
      [minBufferPx]="minBufferPx"
      [maxBufferPx]="maxBufferPx"
      class="virtual-scroll-viewport"
      [style.height.px]="viewportHeight">
      
      <div
        *cdkVirtualFor="let item of items; trackBy: trackByFn"
        class="virtual-scroll-item"
        (click)="onItemClick(item)">
        <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: item }"></ng-container>
      </div>

      <!-- Empty state -->
      <div *ngIf="items.length === 0" class="empty-state">
        <ng-content select="[empty-state]"></ng-content>
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  styles: [`
    .virtual-scroll-viewport {
      width: 100%;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .virtual-scroll-item {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .virtual-scroll-item:hover {
      background-color: #f5f5f5;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      color: #757575;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualScrollListComponent<T> {
  /**
   * Array of items to display
   */
  @Input() items: T[] = [];

  /**
   * Height of each item in pixels
   * For consistent performance, all items should have the same height
   */
  @Input() itemSize = 72;

  /**
   * Minimum buffer size in pixels before the viewport
   * Items in this buffer are rendered but not visible
   */
  @Input() minBufferPx = 200;

  /**
   * Maximum buffer size in pixels after the viewport
   * Items in this buffer are rendered but not visible
   */
  @Input() maxBufferPx = 400;

  /**
   * Height of the viewport in pixels
   * Defaults to 600px
   */
  @Input() viewportHeight = 600;

  /**
   * Template for rendering each item
   */
  @Input() itemTemplate: any;

  /**
   * Track by function for *cdkVirtualFor
   * Improves performance by tracking items by unique identifier
   */
  @Input() trackByFn: (index: number, item: T) => any = (index, item: any) => item.id || index;

  /**
   * Event emitted when an item is clicked
   */
  @Output() itemClick = new EventEmitter<T>();

  /**
   * Handle item click
   */
  onItemClick(item: T): void {
    this.itemClick.emit(item);
  }
}
