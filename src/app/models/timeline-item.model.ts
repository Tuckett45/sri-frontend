export interface TimelineItem {
  id: string;
  label: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  /**
   * Optional status key used for styling and summaries. Examples: 'open', 'resolved', 'in-progress'.
   */
  status?: string;
  /**
   * Optional custom color applied to the item's chip background.
   */
  color?: string;
  /**
   * Arbitrary metadata that downstream views can surface in tooltips or detail panels.
   */
  metadata?: Record<string, unknown>;
}
